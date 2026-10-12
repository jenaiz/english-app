package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound   = errors.New("not found")
	ErrEmailTaken = errors.New("email already registered")
	// ErrLinkRequired: a Google sign-in matches an existing email account that the
	// user must confirm before it is linked.
	ErrLinkRequired = errors.New("account link required")
	// ErrConflict: the row already exists in a state that forbids the change.
	ErrConflict = errors.New("conflict")
)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	// Name is the display name chosen by the user ("" if not set).
	Name         string `json:"name"`
	PasswordHash string `json:"-"` // empty for accounts created with Google
	HasPassword  bool   `json:"has_password"`
	HasGoogle    bool   `json:"has_google"`
	// EmailVerified is false for email sign-ups until they open the confirmation link.
	EmailVerified bool      `json:"email_verified"`
	CreatedAt     time.Time `json:"created_at"`
}

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

func (s *Store) CreateUser(ctx context.Context, email, hash string) (*User, error) {
	u := &User{Email: email, PasswordHash: hash, HasPassword: true}
	err := s.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, created_at`,
		email, hash,
	).Scan(&u.ID, &u.CreatedAt)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return nil, ErrEmailTaken
	}
	return u, err
}

func (s *Store) UserByEmail(ctx context.Context, email string) (*User, error) {
	return s.scanUser(s.pool.QueryRow(ctx,
		userColumns+` WHERE email = $1`, email))
}

func (s *Store) UserByID(ctx context.Context, id string) (*User, error) {
	return s.scanUser(s.pool.QueryRow(ctx,
		userColumns+` WHERE id = $1`, id))
}

// GoogleUser returns the account for a verified Google identity, creating it on first
// sign-in (already verified: Google vouches for the email). If an account with that
// email exists but isn't linked to Google it returns ErrLinkRequired, so the user can
// confirm the link first (see LinkGoogle).
func (s *Store) GoogleUser(ctx context.Context, sub, email string) (*User, error) {
	for attempt := 0; attempt < 2; attempt++ {
		u, err := s.scanUser(s.pool.QueryRow(ctx, userColumns+` WHERE google_sub = $1`, sub))
		if !errors.Is(err, ErrNotFound) {
			return u, err
		}
		u, err = s.UserByEmail(ctx, email)
		if err == nil {
			if u.HasGoogle {
				return nil, ErrEmailTaken // linked to a different Google account
			}
			return u, ErrLinkRequired
		}
		if !errors.Is(err, ErrNotFound) {
			return nil, err
		}
		u = &User{Email: email, HasGoogle: true, EmailVerified: true}
		err = s.pool.QueryRow(ctx,
			`INSERT INTO users (email, google_sub, email_verified_at) VALUES ($1, $2, NOW()) RETURNING id, created_at`, email, sub,
		).Scan(&u.ID, &u.CreatedAt)
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			continue // concurrent sign-in created it first: look it up again
		}
		return u, err
	}
	return nil, ErrEmailTaken
}

// LinkGoogle links an existing email account to a Google identity the user has just
// proven, which also verifies the email. If the account was never verified its password
// is cleared: whoever set it may not own the address (account pre-hijacking). The
// owner can sign in with Google or set a new password with a reset email.
func (s *Store) LinkGoogle(ctx context.Context, sub, email string) (*User, error) {
	u, err := s.scanUser(s.pool.QueryRow(ctx,
		`UPDATE users SET google_sub = $1,
			password_hash = CASE WHEN email_verified_at IS NULL THEN NULL ELSE password_hash END,
			email_verified_at = COALESCE(email_verified_at, NOW())
		 WHERE email = $2 AND google_sub IS NULL
		 RETURNING `+userFields, sub, email))
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return nil, ErrEmailTaken // this Google account is already linked to another user
	}
	if errors.Is(err, ErrNotFound) {
		// Nothing left to link (linked or created concurrently): sign in normally.
		return s.GoogleUser(ctx, sub, email)
	}
	return u, err
}

// MarkEmailVerified marks the user's email as verified (idempotent).
func (s *Store) MarkEmailVerified(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = $1`, userID)
	return err
}

// SetPassword replaces the password after a reset. Opening the reset link proves the
// user owns the email, so it also counts as verification.
func (s *Store) SetPassword(ctx context.Context, userID, hash string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET password_hash = $2, email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = $1`,
		userID, hash)
	return err
}

const userFields = `id, email, COALESCE(display_name, ''), COALESCE(password_hash, ''), google_sub IS NOT NULL, email_verified_at IS NOT NULL, created_at`

const userColumns = `SELECT ` + userFields + ` FROM users`

func (s *Store) scanUser(row pgx.Row) (*User, error) {
	u := &User{}
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.HasGoogle, &u.EmailVerified, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	u.HasPassword = u.PasswordHash != ""
	return u, err
}

// SetDisplayName sets the name shown in the app; an empty name clears it.
func (s *Store) SetDisplayName(ctx context.Context, userID, name string) (*User, error) {
	return s.scanUser(s.pool.QueryRow(ctx,
		`UPDATE users SET display_name = NULLIF($2, '') WHERE id = $1 RETURNING `+userFields, userID, name))
}

// SetDisplayNameIfEmpty fills in the name (e.g. from Google) without overwriting the user's choice.
func (s *Store) SetDisplayNameIfEmpty(ctx context.Context, userID, name string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET display_name = $2 WHERE id = $1 AND display_name IS NULL AND $2 <> ''`, userID, name)
	return err
}

// DeleteUser removes the account; progress, SRS cards and email tokens go with it (ON DELETE CASCADE).
func (s *Store) DeleteUser(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	return err
}
