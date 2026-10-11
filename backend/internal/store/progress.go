package store

import (
	"context"
	"time"
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
