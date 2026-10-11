package auth

import (
	"errors"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// RefreshAfter is how old a session token must be before a request renews it, so an
// active user stays signed in without a new cookie on every request.
const RefreshAfter = 24 * time.Hour

type TokenManager struct {
	secret []byte
	ttl    time.Duration
	// CookieSecure marks the session cookie Secure (HTTPS only).
	CookieSecure bool
}

func NewTokenManager(secret string, ttl time.Duration) *TokenManager {
	return &TokenManager{secret: []byte(secret), ttl: ttl}
}

func (m *TokenManager) TTL() time.Duration { return m.ttl }

func (m *TokenManager) Issue(userID, email string) (string, error) {
	now := time.Now()
	claims := Claims{
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
}

func (m *TokenManager) Parse(token string) (*Claims, error) {
	claims := &Claims{}
	t, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
		return m.secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, err
	}
	if !t.Valid || claims.Subject == "" {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// SetCookie stores the session token in the HttpOnly auth cookie.
func (m *TokenManager) SetCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name: CookieName, Value: token, Path: "/",
		MaxAge:   int(m.ttl.Seconds()),
		HttpOnly: true, Secure: m.CookieSecure, SameSite: http.SameSiteLaxMode,
	})
}

// refresh issues a new token (and cookie) when the current one is older than RefreshAfter.
func (m *TokenManager) refresh(w http.ResponseWriter, claims *Claims) {
	if claims.IssuedAt == nil || time.Since(claims.IssuedAt.Time) < RefreshAfter {
		return
	}
	if token, err := m.Issue(claims.Subject, claims.Email); err == nil {
		m.SetCookie(w, token)
	}
}
