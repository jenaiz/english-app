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
	PasswordHash string    `json:"-"`
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
		`SELECT id, email, password_hash, created_at FROM users WHERE email = $1`, email))
}

func (s *Store) UserByID(ctx context.Context, id string) (*User, error) {
	return s.scanUser(s.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, created_at FROM users WHERE id = $1`, id))
}

func (s *Store) scanUser(row pgx.Row) (*User, error) {
	u := &User{}
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}
