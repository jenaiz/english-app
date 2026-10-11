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

// Card kinds. Expression cards (every kind but vocab) have an empty lesson_id and the expression id as term.
const (
	KindVocab   = "vocab"
	KindIdiom   = "idiom"
	KindPhrasal = "phrasal"
	KindVerb    = "verb"
)

// AddExpressionCard adds an idiom, phrasal verb or irregular verb to the user's review. It reports false if it was already there.
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
	// Queued: added but waiting for a free slot in the daily limit of new expressions.
	Queued  bool      `json:"queued"`
	AddedAt time.Time `json:"added_at"`
	// DueAt is when the card is next due; a new card that isn't queued is due today.
	DueAt time.Time `json:"due_at"`
}

// ExpressionCards returns the expressions the user has added, grouped by kind.
func (s *Store) ExpressionCards(ctx context.Context, userID string) (map[string][]SavedExpression, error) {
	q, err := s.expressionQueue(ctx, userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx, `SELECT id, kind, term, repetitions, created_at, due_at FROM srs_cards
		WHERE user_id = $1 AND kind <> 'vocab'`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string][]SavedExpression{KindIdiom: {}, KindPhrasal: {}, KindVerb: {}}
	for rows.Next() {
		var id, kind string
		var e SavedExpression
		if err := rows.Scan(&id, &kind, &e.ID, &e.Repetitions, &e.AddedAt, &e.DueAt); err != nil {
			return nil, err
		}
		e.Queued = q.queued[id]
		out[kind] = append(out[kind], e)
	}
	return out, rows.Err()
}

// IsQueued reports whether the user's card for this expression is waiting in the queue of new cards.
func (s *Store) IsQueued(ctx context.Context, userID, kind, id string) (bool, error) {
	q, err := s.expressionQueue(ctx, userID)
	if err != nil {
		return false, err
	}
	var cardID string
	err = s.pool.QueryRow(ctx, `SELECT id FROM srs_cards WHERE user_id = $1 AND kind = $2 AND lesson_id = '' AND term = $3`,
		userID, kind, id).Scan(&cardID)
	if err != nil {
		return false, err
	}
	return q.queued[cardID], nil
}

// newExpression is a never-reviewed expression card: an idiom, phrasal or irregular verb the user added but hasn't seen in Repaso.
const newExpression = `kind <> 'vocab' AND first_reviewed_at IS NULL`

// queue splits the user's new expression cards, oldest first, into the ones that can be shown today
// and the ones that wait, according to the daily limit.
type queue struct {
	today  []string        // card ids, in the order they were added
	queued map[string]bool // card ids
	kinds  map[string]string
}

func (s *Store) expressionQueue(ctx context.Context, userID string) (*queue, error) {
	var reviewsDue, introducedToday int
	err := s.pool.QueryRow(ctx, `SELECT
			COUNT(*) FILTER (WHERE due_at <= NOW() AND NOT (`+newExpression+`)),
			COUNT(*) FILTER (WHERE kind <> 'vocab' AND first_reviewed_at >= $2)
		FROM srs_cards WHERE user_id = $1`, userID, srs.StartOfDay(time.Now())).Scan(&reviewsDue, &introducedToday)
	if err != nil {
		return nil, err
	}
	left := srs.NewCardAllowance(reviewsDue, introducedToday)
	rows, err := s.pool.Query(ctx, `SELECT id, kind FROM srs_cards
		WHERE user_id = $1 AND `+newExpression+` ORDER BY created_at, id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	q := &queue{queued: map[string]bool{}, kinds: map[string]string{}}
	for rows.Next() {
		var id, kind string
		if err := rows.Scan(&id, &kind); err != nil {
			return nil, err
		}
		q.kinds[id] = kind
		if len(q.today) < left {
			q.today = append(q.today, id)
		} else {
			q.queued[id] = true
		}
	}
	return q, rows.Err()
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

// DueFilter narrows the due cards. The zero value returns every card.
type DueFilter struct {
	// Kind: vocab, idiom, phrasal or verb; empty for every kind.
	Kind string
	// Items, when not nil, keeps only these expressions, as "idiom:<id>" or "phrasal:<id>" (a pack).
	Items []string
}

// inItems matches the expression cards listed in DueFilter.Items ($4); a NULL list matches every card.
const inItems = `($4::text[] IS NULL OR kind || ':' || term = ANY($4))`

// DueCards returns the cards due now, oldest first, followed by the new expression cards allowed
// today (see srs.NewCardAllowance). Filtering doesn't change the daily limit: new cards of a pack
// that are still queued stay out.
func (s *Store) DueCards(ctx context.Context, userID string, f DueFilter, limit int) ([]*Card, error) {
	out, err := s.queryCards(ctx, `SELECT `+cardColumns+` FROM srs_cards
		WHERE user_id = $1 AND due_at <= NOW() AND ($2 = '' OR kind = $2) AND NOT (`+newExpression+`) AND `+inItems+`
		ORDER BY due_at LIMIT $3`, userID, f.Kind, limit, f.Items)
	if err != nil || len(out) >= limit {
		return out, err
	}
	q, err := s.expressionQueue(ctx, userID)
	if err != nil {
		return nil, err
	}
	var ids []string
	for _, id := range q.today {
		if f.Kind == "" || q.kinds[id] == f.Kind {
			ids = append(ids, id)
		}
	}
	if len(ids) == 0 {
		return out, nil
	}
	fresh, err := s.queryCards(ctx, `SELECT `+cardColumns+` FROM srs_cards
		WHERE user_id = $1 AND id = ANY($2) AND `+inItems+` ORDER BY created_at, id LIMIT $3`, userID, ids, limit-len(out), f.Items)
	return append(out, fresh...), err
}

func (s *Store) queryCards(ctx context.Context, sql string, args ...any) ([]*Card, error) {
	rows, err := s.pool.Query(ctx, sql, args...)
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

// KindCount holds the due, queued and total cards of one kind.
type KindCount struct {
	Due    int `json:"due"`
	Queued int `json:"queued"`
	Total  int `json:"total"`
}

// CardSummary returns the due and total cards, overall and per kind. New expression cards count as due
// only while they fit in today's limit; the rest are queued.
func (s *Store) CardSummary(ctx context.Context, userID string) (due, total int, byKind map[string]KindCount, err error) {
	byKind = map[string]KindCount{KindVocab: {}, KindIdiom: {}, KindPhrasal: {}, KindVerb: {}}
	rows, err := s.pool.Query(ctx, `SELECT kind, COUNT(*) FILTER (WHERE due_at <= NOW() AND NOT (`+newExpression+`)), COUNT(*)
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
	}
	if err = rows.Err(); err != nil {
		return
	}
	q, err := s.expressionQueue(ctx, userID)
	if err != nil {
		return
	}
	for _, id := range q.today {
		c := byKind[q.kinds[id]]
		c.Due++
		byKind[q.kinds[id]] = c
	}
	for id := range q.queued {
		c := byKind[q.kinds[id]]
		c.Queued++
		byKind[q.kinds[id]] = c
	}
	for _, c := range byKind {
		due += c.Due
		total += c.Total
	}
	return
}

func (s *Store) Card(ctx context.Context, userID, cardID string) (*Card, error) {
	return scanCard(s.pool.QueryRow(ctx, `SELECT `+cardColumns+` FROM srs_cards
		WHERE id = $1 AND user_id = $2`, cardID, userID))
}

func (s *Store) UpdateCard(ctx context.Context, userID, cardID string, st srs.State) error {
	_, err := s.pool.Exec(ctx, `UPDATE srs_cards
		SET ease = $3, interval_days = $4, repetitions = $5, due_at = $6, last_reviewed_at = NOW(),
			first_reviewed_at = COALESCE(first_reviewed_at, NOW())
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
