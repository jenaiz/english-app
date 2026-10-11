package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/jenaiz/english-app/backend/internal/auth"
	appmail "github.com/jenaiz/english-app/backend/internal/mail"
	"github.com/jenaiz/english-app/backend/internal/store"
)

const (
	verifyTokenTTL = 48 * time.Hour
	resetTokenTTL  = time.Hour
	// emailCooldown limits how often the same kind of email is sent to one account.
	emailCooldown = time.Minute
)

type AuthHandler struct {
	Store        *store.Store
	Tokens       *auth.TokenManager
	GoogleAuth   *auth.GoogleVerifier
	CookieSecure bool
	// GAMeasurementID is passed to the frontend, which loads Analytics only after consent.
	GAMeasurementID string
	Mail            appmail.Sender
	// AppURL is the frontend's public URL, used to build the links in emails.
	AppURL string
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
	if !validPassword(in.Password) {
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
	// No session until the email is confirmed.
	h.sendEmail(user, store.PurposeVerifyEmail)
	writeJSON(w, http.StatusCreated, map[string]any{"verification_sent": true, "email": user.Email})
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
	// Checked after the password so this doesn't reveal which emails are registered.
	if !user.EmailVerified {
		writeErrorCode(w, http.StatusForbidden, "email_not_verified", "confirm your email before signing in")
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
// account on first use. If the email already has an account, the first call answers
// 409 link_required and the client repeats it with link=true once the user agrees.
func (h *AuthHandler) Google(w http.ResponseWriter, r *http.Request) {
	if !h.GoogleAuth.Enabled() {
		writeError(w, http.StatusNotFound, "google sign-in is not configured")
		return
	}
	var in struct {
		Credential string `json:"credential"`
		Link       bool   `json:"link"`
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
	email := strings.ToLower(id.Email)
	user, err := h.Store.GoogleUser(r.Context(), id.Subject, email)
	if errors.Is(err, store.ErrLinkRequired) {
		if !in.Link {
			writeJSON(w, http.StatusConflict, map[string]any{
				"error": "an account with this email already exists", "code": "link_required",
				"email": user.Email, "keeps_password": user.EmailVerified && user.PasswordHash != "",
			})
			return
		}
		user, err = h.Store.LinkGoogle(r.Context(), id.Subject, email)
	}
	if errors.Is(err, store.ErrEmailTaken) {
		writeError(w, http.StatusConflict, "email already linked to another google account")
		return
	}
	if err != nil {
		h.internal(w, err)
		return
	}
	if user.Name == "" && id.Name != "" {
		// Use the Google profile name until the user picks one in Settings.
		if err := h.Store.SetDisplayNameIfEmpty(r.Context(), user.ID, truncateRunes(id.Name, maxNameLength)); err != nil {
			log.Printf("set name from google: %v", err)
		} else {
			user.Name = truncateRunes(id.Name, maxNameLength)
		}
	}
	token, err := h.setSession(w, user)
	if err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user, "token": token})
}

// VerifyEmail confirms the email with the token from the confirmation link and signs in.
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Token string `json:"token"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Token == "" {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	userID, err := h.Store.ConsumeToken(r.Context(), in.Token, store.PurposeVerifyEmail)
	if errors.Is(err, store.ErrInvalidToken) {
		writeErrorCode(w, http.StatusBadRequest, "invalid_token", "the link is invalid or has expired")
		return
	}
	if err == nil {
		err = h.Store.MarkEmailVerified(r.Context(), userID)
	}
	h.signInByID(w, r, userID, err)
}

// ResendVerification sends the confirmation email again. It always answers 204 so it
// can't be used to find out which emails are registered.
func (h *AuthHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromEmailBody(w, r)
	if !ok {
		return
	}
	if user != nil && !user.EmailVerified {
		h.sendEmail(user, store.PurposeVerifyEmail)
	}
	w.WriteHeader(http.StatusNoContent)
}

// ForgotPassword emails a password reset link. Always 204, like ResendVerification.
// It also works for Google-only accounts that want to add a password.
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromEmailBody(w, r)
	if !ok {
		return
	}
	if user != nil {
		h.sendEmail(user, store.PurposeResetPassword)
	}
	w.WriteHeader(http.StatusNoContent)
}

// ResetPassword sets a new password with the token from the reset link and signs in.
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Token == "" {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !validPassword(in.Password) {
		writeError(w, http.StatusBadRequest, "password must be 8-72 characters")
		return
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		h.internal(w, err)
		return
	}
	userID, err := h.Store.ConsumeToken(r.Context(), in.Token, store.PurposeResetPassword)
	if errors.Is(err, store.ErrInvalidToken) {
		writeErrorCode(w, http.StatusBadRequest, "invalid_token", "the link is invalid or has expired")
		return
	}
	if err == nil {
		err = h.Store.SetPassword(r.Context(), userID, hash)
	}
	h.signInByID(w, r, userID, err)
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

func validPassword(p string) bool { return len(p) >= 8 && len(p) <= 72 }

// userFromEmailBody reads {"email"} and returns that user, or nil if there is none.
func (h *AuthHandler) userFromEmailBody(w http.ResponseWriter, r *http.Request) (*store.User, bool) {
	var in struct {
		Email string `json:"email"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return nil, false
	}
	user, err := h.Store.UserByEmail(r.Context(), strings.ToLower(strings.TrimSpace(in.Email)))
	if errors.Is(err, store.ErrNotFound) {
		return nil, true
	}
	if err != nil {
		h.internal(w, err)
		return nil, false
	}
	return user, true
}

// sendEmail issues a token and emails the link in the background, so the response
// time doesn't depend on whether an email was sent. Failures are only logged.
func (h *AuthHandler) sendEmail(user *store.User, purpose string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if recent, err := h.Store.TokenSentRecently(ctx, user.ID, purpose, emailCooldown); err != nil || recent {
			if err != nil {
				log.Printf("email %s for %s: %v", purpose, user.ID, err)
			}
			return
		}
		ttl, path, build := verifyTokenTTL, "/verificar-email", appmail.VerifyEmail
		if purpose == store.PurposeResetPassword {
			ttl, path, build = resetTokenTTL, "/restablecer-contrasena", appmail.ResetPassword
		}
		token, err := h.Store.CreateToken(ctx, user.ID, purpose, ttl)
		if err != nil {
			log.Printf("email %s for %s: create token: %v", purpose, user.ID, err)
			return
		}
		link := h.AppURL + path + "?token=" + url.QueryEscape(token)
		if err := h.Mail.Send(ctx, build(user.Email, link)); err != nil {
			log.Printf("email %s for %s: %v", purpose, user.ID, err)
		}
	}()
}

// signInByID finishes a token flow: it starts a session for userID unless err is set.
func (h *AuthHandler) signInByID(w http.ResponseWriter, r *http.Request, userID string, err error) {
	var user *store.User
	if err == nil {
		user, err = h.Store.UserByID(r.Context(), userID)
	}
	var token string
	if err == nil {
		token, err = h.setSession(w, user)
	}
	if err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user, "token": token})
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
