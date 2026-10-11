package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const googleCertsURL = "https://www.googleapis.com/oauth2/v3/certs"

// GoogleIdentity is what we keep from a verified Google ID token.
type GoogleIdentity struct {
	Subject string
	Email   string
	Name    string
}

type googleClaims struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	jwt.RegisteredClaims
}

// GoogleVerifier checks ID tokens issued by Google Identity Services ("Sign in with
// Google") against Google's public keys, which are cached as long as Google allows.
type GoogleVerifier struct {
	ClientID string
	CertsURL string
	Client   *http.Client

	mu      sync.Mutex
	keys    map[string]*rsa.PublicKey
	expires time.Time
}

func NewGoogleVerifier(clientID string) *GoogleVerifier {
	return &GoogleVerifier{ClientID: clientID, CertsURL: googleCertsURL, Client: &http.Client{Timeout: 10 * time.Second}}
}

func (v *GoogleVerifier) Enabled() bool { return v != nil && v.ClientID != "" }

func (v *GoogleVerifier) Verify(ctx context.Context, idToken string) (*GoogleIdentity, error) {
	if !v.Enabled() {
		return nil, errors.New("google sign-in not configured")
	}
	claims := &googleClaims{}
	_, err := jwt.ParseWithClaims(idToken, claims, func(t *jwt.Token) (any, error) {
		kid, _ := t.Header["kid"].(string)
		return v.key(ctx, kid)
	},
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithAudience(v.ClientID),
		jwt.WithExpirationRequired(),
		jwt.WithLeeway(30*time.Second),
	)
	if err != nil {
		return nil, err
	}
	if claims.Issuer != "accounts.google.com" && claims.Issuer != "https://accounts.google.com" {
		return nil, fmt.Errorf("unexpected issuer %q", claims.Issuer)
	}
	if claims.Subject == "" || claims.Email == "" || !claims.EmailVerified {
		return nil, errors.New("google account has no verified email")
	}
	return &GoogleIdentity{Subject: claims.Subject, Email: claims.Email, Name: claims.Name}, nil
}

func (v *GoogleVerifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	if k, ok := v.keys[kid]; ok && time.Now().Before(v.expires) {
		return k, nil
	}
	// Unknown kid or expired cache: Google rotates keys, so refetch once.
	if err := v.refresh(ctx); err != nil {
		return nil, err
	}
	if k, ok := v.keys[kid]; ok {
		return k, nil
	}
	return nil, fmt.Errorf("unknown key id %q", kid)
}

var maxAgeRe = regexp.MustCompile(`max-age=(\d+)`)

func (v *GoogleVerifier) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.CertsURL, nil)
	if err != nil {
		return err
	}
	res, err := v.Client.Do(req)
	if err != nil {
		return fmt.Errorf("fetch google certs: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("fetch google certs: status %d", res.StatusCode)
	}
	var set struct {
		Keys []struct {
			Kid string `json:"kid"`
			Kty string `json:"kty"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(res.Body).Decode(&set); err != nil {
		return fmt.Errorf("decode google certs: %w", err)
	}
	keys := make(map[string]*rsa.PublicKey, len(set.Keys))
	for _, k := range set.Keys {
		if k.Kty != "RSA" {
			continue
		}
		n, err1 := base64.RawURLEncoding.DecodeString(k.N)
		e, err2 := base64.RawURLEncoding.DecodeString(k.E)
		if err1 != nil || err2 != nil {
			continue
		}
		keys[k.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}
	}
	ttl := time.Hour
	if m := maxAgeRe.FindStringSubmatch(res.Header.Get("Cache-Control")); m != nil {
		if secs, err := strconv.Atoi(m[1]); err == nil {
			ttl = time.Duration(secs) * time.Second
		}
	}
	v.keys, v.expires = keys, time.Now().Add(ttl)
	return nil
}
