package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jenaiz/english-app/backend/internal/auth"
	"github.com/jenaiz/english-app/backend/internal/store"
)

const maxNameLength = 50

// UpdateAccount changes the user's settings. For now only the display name.
func (h *AuthHandler) UpdateAccount(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name string `json:"name"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	name := strings.Join(strings.Fields(in.Name), " ")
	if utf8.RuneCountInString(name) > maxNameLength {
		writeError(w, http.StatusBadRequest, "name must be at most 50 characters")
		return
	}
	user, err := h.Store.SetDisplayName(r.Context(), auth.UserID(r.Context()), name)
	if err != nil {
		h.accountError(w, err)
		return
	}
	user.IsAdmin = h.Admins.Allows(user)
	writeJSON(w, http.StatusOK, user)
}

// ChangePassword replaces the password after checking the current one. Accounts
// without a password (Google only) add one through the reset email instead.
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	user, err := h.Store.UserByID(r.Context(), auth.UserID(r.Context()))
	if err != nil {
		h.accountError(w, err)
		return
	}
	if !user.HasPassword {
		writeErrorCode(w, http.StatusBadRequest, "no_password", "this account has no password")
		return
	}
	if !auth.CheckPassword(user.PasswordHash, in.CurrentPassword) {
		writeErrorCode(w, http.StatusForbidden, "wrong_password", "current password is incorrect")
		return
	}
	if !validPassword(in.NewPassword) {
		writeError(w, http.StatusBadRequest, "password must be 8-72 characters")
		return
	}
	hash, err := auth.HashPassword(in.NewPassword)
	if err == nil {
		err = h.Store.SetPassword(r.Context(), user.ID, hash)
	}
	if err != nil {
		h.internal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ExportAccount returns all the user's data as a JSON download (GDPR portability).
func (h *AuthHandler) ExportAccount(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user, err := h.Store.UserByID(ctx, auth.UserID(ctx))
	if err != nil {
		h.accountError(w, err)
		return
	}
	progress, err := h.Store.ListProgress(ctx, user.ID)
	if err != nil {
		h.internal(w, err)
		return
	}
	cards, err := h.Store.AllCards(ctx, user.ID)
	if err != nil {
		h.internal(w, err)
		return
	}
	activities, err := h.Store.ListActivities(ctx, user.ID)
	if err != nil {
		h.internal(w, err)
		return
	}
	exams, err := h.Store.ListAttempts(ctx, user.ID)
	if err != nil {
		h.internal(w, err)
		return
	}
	attempts, err := h.Store.ListLessonAttempts(ctx, user.ID, "")
	if err != nil {
		h.internal(w, err)
		return
	}
	practice, err := h.Store.ListPracticeSessions(ctx, user.ID)
	if err != nil {
		h.internal(w, err)
		return
	}
	w.Header().Set("Content-Disposition", `attachment; filename="fluently-datos.json"`)
	writeJSON(w, http.StatusOK, map[string]any{
		"exported_at": time.Now().UTC(),
		"account":     user,
		"progress":    progress,
		"attempts":    attempts,
		"practice":    practice,
		"srs_cards":   cards,
		"club":        activities,
		"level_exams": exams,
	})
}

// DeleteAccount permanently deletes the account and all its data, then signs out.
// Accounts with a password must confirm it.
func (h *AuthHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	user, err := h.Store.UserByID(r.Context(), auth.UserID(r.Context()))
	if err != nil {
		h.accountError(w, err)
		return
	}
	if user.HasPassword && !auth.CheckPassword(user.PasswordHash, in.Password) {
		writeErrorCode(w, http.StatusForbidden, "wrong_password", "password is incorrect")
		return
	}
	if err := h.Store.DeleteUser(r.Context(), user.ID); err != nil {
		h.internal(w, err)
		return
	}
	h.Logout(w, r)
}

func (h *AuthHandler) accountError(w http.ResponseWriter, err error) {
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	h.internal(w, err)
}

func truncateRunes(s string, n int) string {
	if r := []rune(strings.TrimSpace(s)); len(r) > n {
		return string(r[:n])
	}
	return strings.TrimSpace(s)
}
