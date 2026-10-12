package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// ExamAttempt is one sitting of a level exam. It is open while SubmittedAt is nil.
type ExamAttempt struct {
	ID          string            `json:"id"`
	ExamID      string            `json:"exam_id"`
	LevelID     string            `json:"level_id"`
	Form        map[string]int    `json:"form"`
	Answers     map[string]string `json:"answers"`
	StartedAt   time.Time         `json:"started_at"`
	Deadline    time.Time         `json:"deadline"`
	SubmittedAt *time.Time        `json:"submitted_at,omitempty"`
	Score       *int              `json:"score,omitempty"`
	Passed      *bool             `json:"passed,omitempty"`
	Result      json.RawMessage   `json:"result,omitempty"`
}

const attemptColumns = `id, exam_id, level_id, form, answers, started_at, deadline, submitted_at, score, passed, result`

func scanAttempt(row pgx.Row) (*ExamAttempt, error) {
	var a ExamAttempt
	err := row.Scan(&a.ID, &a.ExamID, &a.LevelID, &a.Form, &a.Answers, &a.StartedAt, &a.Deadline, &a.SubmittedAt, &a.Score, &a.Passed, &a.Result)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &a, err
}

// CreateAttempt opens an attempt. It returns ErrConflict if the learner already has one open.
func (s *Store) CreateAttempt(ctx context.Context, userID, examID, levelID string, form map[string]int, deadline time.Time) (*ExamAttempt, error) {
	a, err := scanAttempt(s.pool.QueryRow(ctx, `
		INSERT INTO exam_attempts (user_id, exam_id, level_id, form, deadline)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, exam_id) WHERE submitted_at IS NULL DO NOTHING
		RETURNING `+attemptColumns, userID, examID, levelID, form, deadline))
	if errors.Is(err, ErrNotFound) {
		return nil, ErrConflict
	}
	return a, err
}

// Attempt returns one of the user's attempts.
func (s *Store) Attempt(ctx context.Context, userID, id string) (*ExamAttempt, error) {
	return scanAttempt(s.pool.QueryRow(ctx,
		`SELECT `+attemptColumns+` FROM exam_attempts WHERE id = $1 AND user_id = $2`, id, userID))
}

// ListAttempts returns the user's attempts, newest first.
func (s *Store) ListAttempts(ctx context.Context, userID string) ([]ExamAttempt, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+attemptColumns+` FROM exam_attempts WHERE user_id = $1 ORDER BY started_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ExamAttempt{}
	for rows.Next() {
		a, err := scanAttempt(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

// SaveAnswers merges answers into an open attempt whose deadline (plus grace) has not passed.
// It reports false if the attempt is closed.
func (s *Store) SaveAnswers(ctx context.Context, userID, id string, answers map[string]string, grace time.Duration) (bool, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE exam_attempts SET answers = answers || $3
		WHERE id = $1 AND user_id = $2 AND submitted_at IS NULL
		  AND deadline + make_interval(secs => $4) > NOW()`,
		id, userID, answers, grace.Seconds())
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

// SubmitAttempt closes an open attempt with its grade. An attempt closed after its deadline
// counts as submitted at the deadline. It reports false if it was already closed.
func (s *Store) SubmitAttempt(ctx context.Context, userID, id string, score int, passed bool, result any) (bool, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE exam_attempts
		SET submitted_at = LEAST(NOW(), deadline), score = $3, passed = $4, result = $5
		WHERE id = $1 AND user_id = $2 AND submitted_at IS NULL`,
		id, userID, score, passed, result)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

// PassedExam is a level exam the user has passed, with the first time they did.
type PassedExam struct {
	ExamID   string
	LevelID  string
	PassedAt time.Time
}

func (s *Store) PassedExams(ctx context.Context, userID string) ([]PassedExam, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT exam_id, MIN(level_id), MIN(submitted_at) FROM exam_attempts
		WHERE user_id = $1 AND passed GROUP BY exam_id ORDER BY 3`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PassedExam{}
	for rows.Next() {
		var p PassedExam
		if err := rows.Scan(&p.ExamID, &p.LevelID, &p.PassedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
