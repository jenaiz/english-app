package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// AdminStats are the headline numbers of the admin panel.
type AdminStats struct {
	Users     int `json:"users"`
	Verified  int `json:"verified"`
	Google    int `json:"google"`
	New7d     int `json:"new_7d"`
	New30d    int `json:"new_30d"`
	Active1d  int `json:"active_1d"`
	Active7d  int `json:"active_7d"`
	Active30d int `json:"active_30d"`
}

// lastSeen is the latest of the recorded visit and the latest lesson progress, so users who
// haven't come back since last_seen_at was added still show when they last studied.
const lastSeen = `GREATEST(u.last_seen_at, (SELECT MAX(updated_at) FROM user_progress WHERE user_id = u.id))`

func (s *Store) AdminStats(ctx context.Context) (*AdminStats, error) {
	var st AdminStats
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*),
			COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL),
			COUNT(*) FILTER (WHERE google_sub IS NOT NULL),
			COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'),
			COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'),
			COUNT(*) FILTER (WHERE seen > NOW() - INTERVAL '1 day'),
			COUNT(*) FILTER (WHERE seen > NOW() - INTERVAL '7 days'),
			COUNT(*) FILTER (WHERE seen > NOW() - INTERVAL '30 days')
		FROM (SELECT u.*, `+lastSeen+` AS seen FROM users u) u`,
	).Scan(&st.Users, &st.Verified, &st.Google, &st.New7d, &st.New30d, &st.Active1d, &st.Active7d, &st.Active30d)
	return &st, err
}

// AdminUser is a row of the admin user list.
type AdminUser struct {
	ID            string     `json:"id"`
	Email         string     `json:"email"`
	Name          string     `json:"name"`
	HasPassword   bool       `json:"has_password"`
	HasGoogle     bool       `json:"has_google"`
	EmailVerified bool       `json:"email_verified"`
	CreatedAt     time.Time  `json:"created_at"`
	LastSeenAt    *time.Time `json:"last_seen_at"`
	LessonsDone   int        `json:"lessons_done"`
	// LastUnitID is the unit of the most recently updated lesson ("" if none): the handler
	// turns it into the level the user is working on.
	LastUnitID   string   `json:"-"`
	PassedLevels []string `json:"passed_levels"`
	Cards        int      `json:"cards"`
}

const adminUserQuery = `
	SELECT u.id, u.email, COALESCE(u.display_name, ''), COALESCE(u.password_hash, '') <> '',
		u.google_sub IS NOT NULL, u.email_verified_at IS NOT NULL, u.created_at, ` + lastSeen + `,
		(SELECT COUNT(*) FROM user_progress WHERE user_id = u.id AND status = 'completed'),
		COALESCE((SELECT unit_id FROM user_progress WHERE user_id = u.id ORDER BY updated_at DESC LIMIT 1), ''),
		COALESCE((SELECT array_agg(DISTINCT level_id) FROM exam_attempts WHERE user_id = u.id AND passed), '{}'),
		(SELECT COUNT(*) FROM srs_cards WHERE user_id = u.id)
	FROM users u`

func scanAdminUser(row pgx.Row) (*AdminUser, error) {
	var u AdminUser
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.HasPassword, &u.HasGoogle, &u.EmailVerified, &u.CreatedAt,
		&u.LastSeenAt, &u.LessonsDone, &u.LastUnitID, &u.PassedLevels, &u.Cards)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}

// AdminUsers lists the newest accounts first, up to limit.
func (s *Store) AdminUsers(ctx context.Context, limit int) ([]*AdminUser, error) {
	rows, err := s.pool.Query(ctx, adminUserQuery+` ORDER BY u.created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*AdminUser{}
	for rows.Next() {
		u, err := scanAdminUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (s *Store) AdminUser(ctx context.Context, id string) (*AdminUser, error) {
	return scanAdminUser(s.pool.QueryRow(ctx, adminUserQuery+` WHERE u.id = $1`, id))
}
