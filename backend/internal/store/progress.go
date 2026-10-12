package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

type Progress struct {
	UnitID    string    `json:"unit_id"`
	LessonID  string    `json:"lesson_id"`
	Status    string    `json:"status"`
	Score     int       `json:"score"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *Store) ListProgress(ctx context.Context, userID string) ([]Progress, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT unit_id, lesson_id, status, score, updated_at
		 FROM user_progress WHERE user_id = $1 ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Progress{}
	for rows.Next() {
		var p Progress
		if err := rows.Scan(&p.UnitID, &p.LessonID, &p.Status, &p.Score, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// CompleteLessons marks lessons as completed, keeping the best score.
func (s *Store) CompleteLessons(ctx context.Context, userID, unitID string, lessonIDs []string, score int) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, lessonID := range lessonIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO user_progress (user_id, unit_id, lesson_id, status, score, updated_at)
			VALUES ($1, $2, $3, 'completed', $4, NOW())
			ON CONFLICT (user_id, lesson_id) DO UPDATE
			SET status = 'completed',
			    score = GREATEST(user_progress.score, EXCLUDED.score),
			    updated_at = NOW()`,
			userID, unitID, lessonID, score); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// StepResult is the grade of one exercise step: correct items out of total.
type StepResult struct {
	Correct int `json:"correct"`
	Total   int `json:"total"`
}

// Position is where a learner left a unit: a step of one of its lessons, with the
// exercises already graded in that lesson keyed by step index.
type Position struct {
	LessonID string                `json:"lesson_id"`
	Step     int                   `json:"step"`
	Results  map[string]StepResult `json:"results"`
}

// GetPosition returns the saved position in a unit, or nil if there is none.
func (s *Store) GetPosition(ctx context.Context, userID, unitID string) (*Position, error) {
	var p Position
	err := s.pool.QueryRow(ctx,
		`SELECT lesson_id, step, results FROM user_unit_position WHERE user_id = $1 AND unit_id = $2`,
		userID, unitID).Scan(&p.LessonID, &p.Step, &p.Results)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if p.Results == nil {
		p.Results = map[string]StepResult{}
	}
	return &p, nil
}

// SavePosition remembers where the learner is in a unit and marks that lesson in progress
// (a completed lesson stays completed, e.g. when the unit is being repeated).
func (s *Store) SavePosition(ctx context.Context, userID, unitID string, p Position) error {
	if p.Results == nil {
		p.Results = map[string]StepResult{}
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `
		INSERT INTO user_unit_position (user_id, unit_id, lesson_id, step, results, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (user_id, unit_id) DO UPDATE
		SET lesson_id = EXCLUDED.lesson_id, step = EXCLUDED.step, results = EXCLUDED.results, updated_at = NOW()`,
		userID, unitID, p.LessonID, p.Step, p.Results); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO user_progress (user_id, unit_id, lesson_id, status, updated_at)
		VALUES ($1, $2, $3, 'in_progress', NOW())
		ON CONFLICT (user_id, lesson_id) DO UPDATE
		SET status = 'in_progress', updated_at = NOW()
		WHERE user_progress.status <> 'completed'`,
		userID, unitID, p.LessonID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// ClearPosition forgets the saved position in a unit if it is inside one of the given lessons
// (they were just completed).
func (s *Store) ClearPosition(ctx context.Context, userID, unitID string, lessonIDs []string) error {
	_, err := s.pool.Exec(ctx,
		`DELETE FROM user_unit_position WHERE user_id = $1 AND unit_id = $2 AND lesson_id = ANY($3)`,
		userID, unitID, lessonIDs)
	return err
}
