package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jenaiz/english-app/backend/internal/srs"
)

// TopicState is a learner's history with a practice topic. State is its spaced-repetition
// schedule; Scheduled is false for a topic never practised nor marked due.
type TopicState struct {
	srs.State
	Scheduled bool
	Sessions  int
	Correct   int
	Total     int
	LastAt    *time.Time
	// Recent are the scores (0-100) of the last sessions, oldest first.
	Recent []int
}

// NewTopicState is the schedule of a topic never practised.
func NewTopicState() srs.State { return srs.State{Ease: 2.5} }

// PracticeTopicStates returns the learner's state for every topic they have a history with.
func (s *Store) PracticeTopicStates(ctx context.Context, userID string) (map[string]*TopicState, error) {
	out := map[string]*TopicState{}
	get := func(id string) *TopicState {
		if out[id] == nil {
			out[id] = &TopicState{State: NewTopicState()}
		}
		return out[id]
	}
	rows, err := s.pool.Query(ctx,
		`SELECT topic_id, ease, interval_days, repetitions, due_at FROM practice_topics WHERE user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id string
		var st srs.State
		if err := rows.Scan(&id, &st.Ease, &st.IntervalDays, &st.Repetitions, &st.DueAt); err != nil {
			rows.Close()
			return nil, err
		}
		t := get(id)
		t.State, t.Scheduled = st, true
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	rows, err = s.pool.Query(ctx, `
		SELECT topic_id, correct, total, finished_at,
		       ROW_NUMBER() OVER (PARTITION BY topic_id ORDER BY finished_at DESC) AS rn
		FROM practice_sessions WHERE user_id = $1 ORDER BY topic_id, finished_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		var correct, total, rn int
		var at time.Time
		if err := rows.Scan(&id, &correct, &total, &at, &rn); err != nil {
			return nil, err
		}
		t := get(id)
		t.Sessions++
		t.Correct += correct
		t.Total += total
		t.LastAt = &at
		if rn <= 5 {
			t.Recent = append(t.Recent, percent(correct, total))
		}
	}
	return out, rows.Err()
}

func percent(n, total int) int {
	if total == 0 {
		return 0
	}
	return (n*100 + total/2) / total
}

// ItemStat is how a learner has done with one practice item.
type ItemStat struct {
	Seen       int
	Correct    int
	LastOK     bool
	LastSeenAt time.Time
}

// PracticeItemStats returns the learner's stats for the items of a topic (ids "<topic>.<n>").
func (s *Store) PracticeItemStats(ctx context.Context, userID, topicID string) (map[string]ItemStat, error) {
	prefix := topicID + "."
	rows, err := s.pool.Query(ctx, `
		SELECT item_id, seen, correct, last_ok, last_seen_at FROM practice_item_stats
		WHERE user_id = $1 AND LEFT(item_id, LENGTH($2)) = $2`, userID, prefix)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]ItemStat{}
	for rows.Next() {
		var id string
		var st ItemStat
		if err := rows.Scan(&id, &st.Seen, &st.Correct, &st.LastOK, &st.LastSeenAt); err != nil {
			return nil, err
		}
		out[id] = st
	}
	return out, rows.Err()
}

// PracticeResult is how one item of a practice round went.
type PracticeResult struct {
	ID     string `json:"id"`
	OK     bool   `json:"ok"`
	Answer string `json:"answer,omitempty"`
}

// TopicSchedule returns the current schedule of a topic (a new one if never practised).
func (s *Store) TopicSchedule(ctx context.Context, userID, topicID string) (srs.State, error) {
	st := NewTopicState()
	err := s.pool.QueryRow(ctx,
		`SELECT ease, interval_days, repetitions, due_at FROM practice_topics WHERE user_id = $1 AND topic_id = $2`,
		userID, topicID).Scan(&st.Ease, &st.IntervalDays, &st.Repetitions, &st.DueAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return NewTopicState(), nil
	}
	return st, err
}

// SavePracticeSession records a finished round, updates the stats of its items and sets when
// the topic is due again.
func (s *Store) SavePracticeSession(ctx context.Context, userID, topicID string, results []PracticeResult, next srs.State) error {
	correct := 0
	for _, r := range results {
		if r.OK {
			correct++
		}
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx,
		`INSERT INTO practice_sessions (user_id, topic_id, correct, total, items) VALUES ($1, $2, $3, $4, $5)`,
		userID, topicID, correct, len(results), results); err != nil {
		return err
	}
	for _, r := range results {
		ok := 0
		if r.OK {
			ok = 1
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO practice_item_stats (user_id, item_id, seen, correct, last_ok, last_seen_at)
			VALUES ($1, $2, 1, $3, $4, NOW())
			ON CONFLICT (user_id, item_id) DO UPDATE
			SET seen = practice_item_stats.seen + 1, correct = practice_item_stats.correct + EXCLUDED.correct,
			    last_ok = EXCLUDED.last_ok, last_seen_at = NOW()`,
			userID, r.ID, ok, r.OK); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO practice_topics (user_id, topic_id, ease, interval_days, repetitions, due_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, topic_id) DO UPDATE
		SET ease = EXCLUDED.ease, interval_days = EXCLUDED.interval_days,
		    repetitions = EXCLUDED.repetitions, due_at = EXCLUDED.due_at`,
		userID, topicID, next.Ease, next.IntervalDays, next.Repetitions, next.DueAt); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// ListPracticeSessions returns the learner's practice rounds, newest first (for the export).
func (s *Store) ListPracticeSessions(ctx context.Context, userID string) ([]PracticeSession, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT topic_id, correct, total, items, finished_at FROM practice_sessions
		WHERE user_id = $1 ORDER BY finished_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PracticeSession{}
	for rows.Next() {
		var p PracticeSession
		if err := rows.Scan(&p.TopicID, &p.Correct, &p.Total, &p.Items, &p.FinishedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// PracticeSession is one finished practice round.
type PracticeSession struct {
	TopicID    string           `json:"topic_id"`
	Correct    int              `json:"correct"`
	Total      int              `json:"total"`
	Items      []PracticeResult `json:"items"`
	FinishedAt time.Time        `json:"finished_at"`
}

// MarkTopicsDue makes topics due now (a mistake in a lesson or the exam on one of their tags),
// keeping their schedule otherwise; a topic due earlier stays as it is.
func (s *Store) MarkTopicsDue(ctx context.Context, userID string, topicIDs []string) error {
	for _, id := range topicIDs {
		if _, err := s.pool.Exec(ctx, `
			INSERT INTO practice_topics (user_id, topic_id, due_at) VALUES ($1, $2, NOW())
			ON CONFLICT (user_id, topic_id) DO UPDATE SET due_at = LEAST(practice_topics.due_at, NOW())`,
			userID, id); err != nil {
			return err
		}
	}
	return nil
}
