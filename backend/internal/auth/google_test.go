package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestGoogleVerifier(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=3600")
		json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
			"kid": "k1", "kty": "RSA", "alg": "RS256",
			"n": base64.RawURLEncoding.EncodeToString(key.N.Bytes()),
			"e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes()),
		}}})
	}))
	defer srv.Close()

	v := NewGoogleVerifier("client-123")
	v.CertsURL = srv.URL

	sign := func(kid string, mutate func(*googleClaims)) string {
		c := &googleClaims{
			Email: "ana@example.com", EmailVerified: true, Name: "Ana",
			RegisteredClaims: jwt.RegisteredClaims{
				Issuer: "https://accounts.google.com", Subject: "google-sub-1",
				Audience:  jwt.ClaimStrings{"client-123"},
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			},
		}
		if mutate != nil {
			mutate(c)
		}
		tok := jwt.NewWithClaims(jwt.SigningMethodRS256, c)
		tok.Header["kid"] = kid
		s, err := tok.SignedString(key)
		if err != nil {
			t.Fatal(err)
		}
		return s
	}

	id, err := v.Verify(context.Background(), sign("k1", nil))
	if err != nil {
		t.Fatalf("valid token rejected: %v", err)
	}
	if id.Subject != "google-sub-1" || id.Email != "ana@example.com" || id.Name != "Ana" {
		t.Fatalf("unexpected identity %+v", id)
	}

	bad := map[string]string{
		"wrong audience":   sign("k1", func(c *googleClaims) { c.Audience = jwt.ClaimStrings{"other"} }),
		"wrong issuer":     sign("k1", func(c *googleClaims) { c.Issuer = "https://evil.example" }),
		"expired":          sign("k1", func(c *googleClaims) { c.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Hour)) }),
		"unverified email": sign("k1", func(c *googleClaims) { c.EmailVerified = false }),
		"unknown kid":      sign("k2", nil),
		"garbage":          "not-a-jwt",
	}
	for name, tok := range bad {
		if _, err := v.Verify(context.Background(), tok); err == nil {
			t.Errorf("%s: expected error", name)
		}
	}

	if _, err := NewGoogleVerifier("").Verify(context.Background(), sign("k1", nil)); err == nil {
		t.Error("disabled verifier accepted a token")
	}
}
