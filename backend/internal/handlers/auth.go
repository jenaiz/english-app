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
	CookieSecure bool
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
