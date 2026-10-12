package store

import (
	"context"
	"time"
)

// ActivityState is a learner's record of an unlocked Club activity.
type ActivityState struct {
	ActivityID  string     `json:"activity_id"`
	Milestone   string     `json:"milestone"`
	UnlockedAt  time.Time  `json:"unlocked_at"`
	SeenAt      *time.Time `json:"seen_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	BestScore   *int       `json:"best_score,omitempty"`
}

// ListActivities returns the user's unlocked activities, oldest first.
func (s *Store) ListActivities(ctx context.Context, userID string) ([]ActivityState, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT activity_id, milestone, unlocked_at, seen_at, completed_at, best_score
		FROM user_activity WHERE user_id = $1 ORDER BY unlocked_at, activity_id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ActivityState{}
	for rows.Next() {
		var a ActivityState
		if err := rows.Scan(&a.ActivityID, &a.Milestone, &a.UnlockedAt, &a.SeenAt, &a.CompletedAt, &a.BestScore); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// UnlockActivity records an activity unlocked by a milestone. It reports false if it already was.
func (s *Store) UnlockActivity(ctx context.Context, userID, activityID, milestone string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `
		INSERT INTO user_activity (user_id, activity_id, milestone) VALUES ($1, $2, $3)
		ON CONFLICT (user_id, activity_id) DO NOTHING`, userID, activityID, milestone)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

// MarkActivitySeen records the first time the learner opens an unlocked activity.
func (s *Store) MarkActivitySeen(ctx context.Context, userID, activityID string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE user_activity SET seen_at = NOW()
		WHERE user_id = $1 AND activity_id = $2 AND seen_at IS NULL`, userID, activityID)
	return err
}

// CompleteActivity records a finished activity, keeping the best score.
func (s *Store) CompleteActivity(ctx context.Context, userID, activityID string, score int) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE user_activity
		SET completed_at = NOW(), seen_at = COALESCE(seen_at, NOW()),
		    best_score = GREATEST(COALESCE(best_score, 0), $3)
		WHERE user_id = $1 AND activity_id = $2`, userID, activityID, score)
	return err
}
