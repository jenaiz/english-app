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
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // empty for accounts created with Google
	HasGoogle    bool      `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

func (s *Store) CreateUser(ctx context.Context, email, hash string) (*User, error) {
	u := &User{Email: email, PasswordHash: hash}
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
// sign-in. An existing account with the same email is linked to Google; its password
// is cleared because the email was never verified by us, so whoever set that password
// may not own the address (account pre-hijacking).
func (s *Store) GoogleUser(ctx context.Context, sub, email string) (*User, error) {
	for attempt := 0; attempt < 2; attempt++ {
		u, err := s.scanUser(s.pool.QueryRow(ctx, userColumns+` WHERE google_sub = $1`, sub))
		if !errors.Is(err, ErrNotFound) {
			return u, err
		}
		u, err = s.scanUser(s.pool.QueryRow(ctx,
			`UPDATE users SET google_sub = $1, password_hash = NULL
			 WHERE email = $2 AND google_sub IS NULL
			 RETURNING id, email, COALESCE(password_hash, ''), google_sub IS NOT NULL, created_at`, sub, email))
		if !errors.Is(err, ErrNotFound) {
			return u, err
		}
		u = &User{Email: email, HasGoogle: true}
		err = s.pool.QueryRow(ctx,
			`INSERT INTO users (email, google_sub) VALUES ($1, $2) RETURNING id, created_at`, email, sub,
		).Scan(&u.ID, &u.CreatedAt)
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			continue // concurrent sign-in created it first: look it up again
		}
		return u, err
	}
	return nil, ErrEmailTaken
}

const userColumns = `SELECT id, email, COALESCE(password_hash, ''), google_sub IS NOT NULL, created_at FROM users`

func (s *Store) scanUser(row pgx.Row) (*User, error) {
	u := &User{}
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.HasGoogle, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}
