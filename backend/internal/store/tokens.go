package store

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// Purposes of the single-use tokens sent by email.
const (
	PurposeVerifyEmail   = "verify_email"
	PurposeResetPassword = "reset_password"
)

// ErrInvalidToken: the token doesn't exist, was already used or has expired.
var ErrInvalidToken = errors.New("invalid or expired token")

func hashToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

// CreateToken issues a new token for the user, replacing any earlier one with the
// same purpose. Only its hash is stored; the plain token goes in the email.
func (s *Store) CreateToken(ctx context.Context, userID, purpose string, ttl time.Duration) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := base64.RawURLEncoding.EncodeToString(b)
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `DELETE FROM email_tokens WHERE user_id = $1 AND purpose = $2`, userID, purpose); err != nil {
		return "", err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
		hashToken(token), userID, purpose, time.Now().Add(ttl),
	); err != nil {
		return "", err
	}
	return token, tx.Commit(ctx)
}

// ConsumeToken deletes a valid token and returns its user, so each link works once.
func (s *Store) ConsumeToken(ctx context.Context, token, purpose string) (string, error) {
	var userID string
	var valid bool
	err := s.pool.QueryRow(ctx,
		`DELETE FROM email_tokens WHERE token_hash = $1 AND purpose = $2 RETURNING user_id, expires_at > NOW()`,
		hashToken(token), purpose,
	).Scan(&userID, &valid)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && !valid) {
		return "", ErrInvalidToken // an expired token is deleted too
	}
	return userID, err
}

// TokenSentRecently reports whether a token with this purpose was issued within d,
// to rate-limit emails.
func (s *Store) TokenSentRecently(ctx context.Context, userID, purpose string, d time.Duration) (bool, error) {
	var recent bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM email_tokens WHERE user_id = $1 AND purpose = $2 AND created_at > $3)`,
		userID, purpose, time.Now().Add(-d),
	).Scan(&recent)
	return recent, err
}
