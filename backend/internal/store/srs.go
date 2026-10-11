package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jenaiz/english-app/backend/internal/srs"
)

type Card struct {
	ID           string     `json:"id"`
	LessonID     string     `json:"lesson_id"`
	Term         string     `json:"term"`
	Ease         float64    `json:"ease"`
	IntervalDays float64    `json:"interval_days"`
	Repetitions  int        `json:"repetitions"`
	DueAt        time.Time  `json:"due_at"`
	LastReviewed *time.Time `json:"last_reviewed_at,omitempty"`
}

func (c *Card) State() srs.State {
	return srs.State{Ease: c.Ease, IntervalDays: c.IntervalDays, Repetitions: c.Repetitions, DueAt: c.DueAt}
}

// AddCards creates cards that don't exist yet and returns how many were added.
func (s *Store) AddCards(ctx context.Context, userID, lessonID string, terms []string) (int, error) {
	added := 0
	for _, term := range terms {
		tag, err := s.pool.Exec(ctx, `
			INSERT INTO srs_cards (user_id, lesson_id, term) VALUES ($1, $2, $3)
			ON CONFLICT (user_id, lesson_id, term) DO NOTHING`, userID, lessonID, term)
		if err != nil {
			return added, err
		}
		added += int(tag.RowsAffected())
	}
	return added, nil
}

const cardColumns = `id, lesson_id, term, ease, interval_days, repetitions, due_at, last_reviewed_at`

func scanCard(row pgx.Row) (*Card, error) {
	c := &Card{}
	err := row.Scan(&c.ID, &c.LessonID, &c.Term, &c.Ease, &c.IntervalDays, &c.Repetitions, &c.DueAt, &c.LastReviewed)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return c, err
}

func (s *Store) DueCards(ctx context.Context, userID string, limit int) ([]*Card, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+cardColumns+` FROM srs_cards
		WHERE user_id = $1 AND due_at <= NOW() ORDER BY due_at LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*Card
	for rows.Next() {
		c, err := scanCard(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) CardSummary(ctx context.Context, userID string) (due, total int, err error) {
	err = s.pool.QueryRow(ctx, `SELECT COUNT(*) FILTER (WHERE due_at <= NOW()), COUNT(*)
		FROM srs_cards WHERE user_id = $1`, userID).Scan(&due, &total)
	return
}

func (s *Store) Card(ctx context.Context, userID, cardID string) (*Card, error) {
	return scanCard(s.pool.QueryRow(ctx, `SELECT `+cardColumns+` FROM srs_cards
		WHERE id = $1 AND user_id = $2`, cardID, userID))
}

func (s *Store) UpdateCard(ctx context.Context, userID, cardID string, st srs.State) error {
	_, err := s.pool.Exec(ctx, `UPDATE srs_cards
		SET ease = $3, interval_days = $4, repetitions = $5, due_at = $6, last_reviewed_at = NOW()
		WHERE id = $1 AND user_id = $2`, cardID, userID, st.Ease, st.IntervalDays, st.Repetitions, st.DueAt)
	return err
}

// AllCards returns every SRS card of the user, for the data export.
func (s *Store) AllCards(ctx context.Context, userID string) ([]*Card, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+cardColumns+` FROM srs_cards WHERE user_id = $1 ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Card{}
	for rows.Next() {
		c, err := scanCard(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
