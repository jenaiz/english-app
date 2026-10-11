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
	Kind         string     `json:"kind"`
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
			INSERT INTO srs_cards (user_id, kind, lesson_id, term) VALUES ($1, 'vocab', $2, $3)
			ON CONFLICT (user_id, kind, lesson_id, term) DO NOTHING`, userID, lessonID, term)
		if err != nil {
			return added, err
		}
		added += int(tag.RowsAffected())
	}
	return added, nil
}

// Card kinds. Expression cards (idiom, phrasal) have an empty lesson_id and the expression id as term.
const (
	KindVocab   = "vocab"
	KindIdiom   = "idiom"
	KindPhrasal = "phrasal"
)

// AddExpressionCard adds an idiom or phrasal verb to the user's review. It reports false if it was already there.
func (s *Store) AddExpressionCard(ctx context.Context, userID, kind, id string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO srs_cards (user_id, kind, lesson_id, term) VALUES ($1, $2, '', $3)
		ON CONFLICT (user_id, kind, lesson_id, term) DO NOTHING`, userID, kind, id)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

// SavedExpression is an expression in the user's review and how many times in a row it was recalled.
type SavedExpression struct {
	ID          string `json:"id"`
	Repetitions int    `json:"repetitions"`
}

// ExpressionCards returns the expressions the user has added, grouped by kind.
func (s *Store) ExpressionCards(ctx context.Context, userID string) (map[string][]SavedExpression, error) {
	rows, err := s.pool.Query(ctx, `SELECT kind, term, repetitions FROM srs_cards
		WHERE user_id = $1 AND kind IN ('idiom', 'phrasal')`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string][]SavedExpression{KindIdiom: {}, KindPhrasal: {}}
	for rows.Next() {
		var kind string
		var e SavedExpression
		if err := rows.Scan(&kind, &e.ID, &e.Repetitions); err != nil {
			return nil, err
		}
		out[kind] = append(out[kind], e)
	}
	return out, rows.Err()
}

const cardColumns = `id, kind, lesson_id, term, ease, interval_days, repetitions, due_at, last_reviewed_at`

func scanCard(row pgx.Row) (*Card, error) {
	c := &Card{}
	err := row.Scan(&c.ID, &c.Kind, &c.LessonID, &c.Term, &c.Ease, &c.IntervalDays, &c.Repetitions, &c.DueAt, &c.LastReviewed)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return c, err
}

// DueCards returns the cards due now, oldest first. An empty kind returns every kind.
func (s *Store) DueCards(ctx context.Context, userID, kind string, limit int) ([]*Card, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+cardColumns+` FROM srs_cards
		WHERE user_id = $1 AND due_at <= NOW() AND ($2 = '' OR kind = $2) ORDER BY due_at LIMIT $3`, userID, kind, limit)
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

// KindCount holds the due and total cards of one kind.
type KindCount struct {
	Due   int `json:"due"`
	Total int `json:"total"`
}

// CardSummary returns the due and total cards, overall and per kind.
func (s *Store) CardSummary(ctx context.Context, userID string) (due, total int, byKind map[string]KindCount, err error) {
	byKind = map[string]KindCount{KindVocab: {}, KindIdiom: {}, KindPhrasal: {}}
	rows, err := s.pool.Query(ctx, `SELECT kind, COUNT(*) FILTER (WHERE due_at <= NOW()), COUNT(*)
		FROM srs_cards WHERE user_id = $1 GROUP BY kind`, userID)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var kind string
		var c KindCount
		if err = rows.Scan(&kind, &c.Due, &c.Total); err != nil {
			return
		}
		byKind[kind] = c
		due += c.Due
		total += c.Total
	}
	err = rows.Err()
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
