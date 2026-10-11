package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

const CookieName = "token"

type ctxKey struct{}

// Middleware requires a valid JWT from the auth cookie or an Authorization: Bearer header.
func (m *TokenManager) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := ""
		if c, err := r.Cookie(CookieName); err == nil {
			token = c.Value
		}
		if h := r.Header.Get("Authorization"); token == "" && strings.HasPrefix(h, "Bearer ") {
			token = strings.TrimPrefix(h, "Bearer ")
		}
		claims, err := m.Parse(token)
		if token == "" || err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, claims.Subject)))
	})
}

// UserID returns the authenticated user's id set by Middleware.
func UserID(ctx context.Context) string {
	id, _ := ctx.Value(ctxKey{}).(string)
	return id
}
