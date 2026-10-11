package handlers

import (
	"errors"
	"log"
	"net/http"
	"net/mail"
	"strings"

	"github.com/jenaiz/english-app/backend/internal/auth"
	"github.com/jenaiz/english-app/backend/internal/store"
)

type AuthHandler struct {
	Store        *store.Store
	Tokens       *auth.TokenManager
	GoogleAuth   *auth.GoogleVerifier
	CookieSecure bool
	// GAMeasurementID is passed to the frontend, which loads Analytics only after consent.
	GAMeasurementID string
}

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (c *credentials) normalize() {
	c.Email = strings.ToLower(strings.TrimSpace(c.Email))
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.normalize()
	if _, err := mail.ParseAddress(in.Email); err != nil || !strings.Contains(in.Email, "@") {
		writeError(w, http.StatusBadRequest, "invalid email")
		return
	}
	if len(in.Password) < 8 || len(in.Password) > 72 {
		writeError(w, http.StatusBadRequest, "password must be 8-72 characters")
		return
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		h.internal(w, err)
		return
	}
	user, err := h.Store.CreateUser(r.Context(), in.Email, hash)
	if errors.Is(err, store.ErrEmailTaken) {
		writeError(w, http.StatusConflict, "email already registered")
		return
	}
	if err != nil {
		h.internal(w, err)
		return
	}
	token, err := h.setSession(w, user)
	if err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"user": user, "token": token})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.normalize()
	user, err := h.Store.UserByEmail(r.Context(), in.Email)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		h.internal(w, err)
		return
	}
	if user != nil && user.PasswordHash == "" && user.HasGoogle {
		writeError(w, http.StatusUnauthorized, "this account uses Google sign-in")
		return
	}
	if user == nil || !auth.CheckPassword(user.PasswordHash, in.Password) {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	token, err := h.setSession(w, user)
	if err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user, "token": token})
}

// Config tells the frontend which sign-in methods and analytics are available.
func (h *AuthHandler) Config(w http.ResponseWriter, r *http.Request) {
	clientID := ""
	if h.GoogleAuth.Enabled() {
		clientID = h.GoogleAuth.ClientID
	}
	writeJSON(w, http.StatusOK, map[string]any{"google_client_id": clientID, "ga_measurement_id": h.GAMeasurementID})
}

// Google signs in with an ID token from Google Identity Services, creating the
// account on first use.
func (h *AuthHandler) Google(w http.ResponseWriter, r *http.Request) {
	if !h.GoogleAuth.Enabled() {
		writeError(w, http.StatusNotFound, "google sign-in is not configured")
		return
	}
	var in struct {
		Credential string `json:"credential"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Credential == "" {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	id, err := h.GoogleAuth.Verify(r.Context(), in.Credential)
	if err != nil {
		log.Printf("google sign-in rejected: %v", err)
		writeError(w, http.StatusUnauthorized, "invalid google credential")
		return
	}
	user, err := h.Store.GoogleUser(r.Context(), id.Subject, strings.ToLower(id.Email))
	if errors.Is(err, store.ErrEmailTaken) {
		writeError(w, http.StatusConflict, "email already linked to another google account")
		return
	}
	if err != nil {
		h.internal(w, err)
		return
	}
	token, err := h.setSession(w, user)
	if err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user, "token": token})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name: auth.CookieName, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: h.CookieSecure, SameSite: http.SameSiteLaxMode,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, err := h.Store.UserByID(r.Context(), auth.UserID(r.Context()))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *AuthHandler) setSession(w http.ResponseWriter, user *store.User) (string, error) {
	token, err := h.Tokens.Issue(user.ID, user.Email)
	if err != nil {
		return "", err
	}
	http.SetCookie(w, &http.Cookie{
		Name: auth.CookieName, Value: token, Path: "/",
		MaxAge:   int(h.Tokens.TTL().Seconds()),
		HttpOnly: true, Secure: h.CookieSecure, SameSite: http.SameSiteLaxMode,
	})
	return token, nil
}

func (h *AuthHandler) internal(w http.ResponseWriter, err error) {
	log.Printf("auth error: %v", err)
	writeError(w, http.StatusInternalServerError, "internal error")
}
