package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestMiddlewareRefreshesOldSessions(t *testing.T) {
	m := NewTokenManager("secret", 30*24*time.Hour)
	handler := m.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if UserID(r.Context()) != "user-1" {
			t.Errorf("user id = %q", UserID(r.Context()))
		}
	}))

	tokenIssued := func(at time.Time) string {
		c := Claims{Email: "a@b.c", RegisteredClaims: jwt.RegisteredClaims{
			Subject: "user-1", IssuedAt: jwt.NewNumericDate(at), ExpiresAt: jwt.NewNumericDate(at.Add(m.TTL())),
		}}
		s, err := jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(m.secret)
		if err != nil {
			t.Fatal(err)
		}
		return s
	}
	call := func(token string, viaCookie bool) *http.Response {
		req := httptest.NewRequest("GET", "/", nil)
		if viaCookie {
			req.AddCookie(&http.Cookie{Name: CookieName, Value: token})
		} else {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec.Result()
	}

	if res := call(tokenIssued(time.Now().Add(-time.Hour)), true); len(res.Cookies()) != 0 {
		t.Error("fresh session was renewed")
	}
	res := call(tokenIssued(time.Now().Add(-48*time.Hour)), true)
	if res.StatusCode != http.StatusOK || len(res.Cookies()) != 1 {
		t.Fatalf("old session not renewed: status %d, %d cookies", res.StatusCode, len(res.Cookies()))
	}
	claims, err := m.Parse(res.Cookies()[0].Value)
	if err != nil || time.Since(claims.IssuedAt.Time) > time.Minute || res.Cookies()[0].MaxAge != int(m.TTL().Seconds()) {
		t.Errorf("renewed cookie is not a fresh 30-day token: %+v %v", res.Cookies()[0], err)
	}
	if res := call(tokenIssued(time.Now().Add(-48*time.Hour)), false); len(res.Cookies()) != 0 {
		t.Error("bearer token should not get a cookie")
	}
	if res := call(tokenIssued(time.Now().Add(-31*24*time.Hour)), true); res.StatusCode != http.StatusUnauthorized {
		t.Errorf("expired session accepted: %d", res.StatusCode)
	}
}
