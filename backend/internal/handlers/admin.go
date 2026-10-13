package handlers

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/jenaiz/english-app/backend/internal/auth"
	"github.com/jenaiz/english-app/backend/internal/content"
	"github.com/jenaiz/english-app/backend/internal/store"
)

// adminListLimit caps the user list; enough until the panel needs pagination.
const adminListLimit = 500

// Admins is the set of emails allowed into the admin panel.
type Admins map[string]bool

// ParseAdmins reads a comma-separated list of emails.
func ParseAdmins(list string) Admins {
	a := Admins{}
	for _, e := range strings.Split(list, ",") {
		if e = strings.ToLower(strings.TrimSpace(e)); e != "" {
			a[e] = true
		}
	}
	return a
}

// Allows reports whether u is an admin. The email must be verified, so nobody can claim
// the address by registering it before its owner.
func (a Admins) Allows(u *store.User) bool {
	return u != nil && u.EmailVerified && a[strings.ToLower(u.Email)]
}

type AdminHandler struct {
	Store   *store.Store
	Catalog *content.Catalog
	Admins  Admins
	// Auth sends the verification and reset emails.
	Auth *AuthHandler
}

// RequireAdmin lets only admins through; everyone else gets a 404, as if the route didn't exist.
func (h *AdminHandler) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, err := h.Store.UserByID(r.Context(), auth.UserID(r.Context()))
		if err != nil && !errors.Is(err, store.ErrNotFound) {
			log.Printf("admin: load user: %v", err)
		}
		if !h.Admins.Allows(u) {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *AdminHandler) Stats(w http.ResponseWriter, r *http.Request) {
	st, err := h.Store.AdminStats(r.Context())
	if err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, st)
}

// adminUser adds the levels, worked out from the catalog, to a user row.
type adminUser struct {
	*store.AdminUser
	// Level is the level of the unit the user studied last ("" if they haven't started).
	Level string `json:"level"`
	// CertifiedLevel is the highest level whose exam they passed ("" if none).
	CertifiedLevel string `json:"certified_level"`
}

func (h *AdminHandler) withLevels(u *store.AdminUser) adminUser {
	return adminUser{
		AdminUser:      u,
		Level:          currentLevel(h.Catalog, u.LastUnitID),
		CertifiedLevel: highestLevel(h.Catalog, u.PassedLevels),
	}
}

// currentLevel is the level of unitID, the unit the user worked on last.
func currentLevel(catalog *content.Catalog, unitID string) string {
	if ref, ok := catalog.Unit("", unitID); ok {
		return ref.LevelID
	}
	return ""
}

// highestLevel returns the last of levels in course order.
func highestLevel(catalog *content.Catalog, levels []string) string {
	best := ""
	for _, lv := range catalog.Summaries() {
		for _, id := range levels {
			if strings.EqualFold(id, lv.LevelID) {
				best = lv.LevelID
			}
		}
	}
	return best
}

func (h *AdminHandler) Users(w http.ResponseWriter, r *http.Request) {
	users, err := h.Store.AdminUsers(r.Context(), adminListLimit)
	if err != nil {
		h.internal(w, err)
		return
	}
	out := make([]adminUser, len(users))
	for i, u := range users {
		out[i] = h.withLevels(u)
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": out, "limit": adminListLimit})
}

type adminLevelProgress struct {
	LevelID    string `json:"level_id"`
	Title      string `json:"title"`
	UnitsDone  int    `json:"units_done"`
	UnitsTotal int    `json:"units_total"`
}

type adminAttempt struct {
	ExamID      string     `json:"exam_id"`
	LevelID     string     `json:"level_id"`
	StartedAt   time.Time  `json:"started_at"`
	SubmittedAt *time.Time `json:"submitted_at,omitempty"`
	Score       *int       `json:"score,omitempty"`
	Passed      *bool      `json:"passed,omitempty"`
}

// User returns one user with their progress per level, exams, Club and review cards.
func (h *AdminHandler) User(w http.ResponseWriter, r *http.Request) {
	u, ok := h.target(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	progress, err := h.Store.ListProgress(ctx, u.ID)
	if err != nil {
		h.internal(w, err)
		return
	}
	attempts, err := h.Store.ListAttempts(ctx, u.ID)
	if err != nil {
		h.internal(w, err)
		return
	}
	activities, err := h.Store.ListActivities(ctx, u.ID)
	if err != nil {
		h.internal(w, err)
		return
	}
	due, total, _, err := h.Store.CardSummary(ctx, u.ID)
	if err != nil {
		h.internal(w, err)
		return
	}

	done := map[string]bool{}
	for _, id := range completedUnits(h.Catalog, progress) {
		done[id] = true
	}
	levels := []adminLevelProgress{}
	for _, lv := range h.Catalog.Summaries() {
		lp := adminLevelProgress{LevelID: lv.LevelID, Title: lv.Title}
		for _, th := range lv.Themes {
			for _, un := range th.Units {
				lp.UnitsTotal++
				if done[un.UnitID] {
					lp.UnitsDone++
				}
			}
		}
		levels = append(levels, lp)
	}
	exams := make([]adminAttempt, len(attempts))
	for i, a := range attempts {
		exams[i] = adminAttempt{ExamID: a.ExamID, LevelID: a.LevelID, StartedAt: a.StartedAt, SubmittedAt: a.SubmittedAt, Score: a.Score, Passed: a.Passed}
	}
	clubDone := 0
	for _, a := range activities {
		if a.CompletedAt != nil {
			clubDone++
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user":            h.withLevels(u),
		"levels":          levels,
		"exams":           exams,
		"club_unlocked":   len(activities),
		"club_completed":  clubDone,
		"cards_due":       due,
		"cards_total":     total,
		"lessons_started": len(progress),
	})
}

// ResendVerification emails the confirmation link again to an unverified user.
func (h *AdminHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	u, ok := h.target(w, r)
	if !ok {
		return
	}
	if u.EmailVerified {
		writeError(w, http.StatusConflict, "email already verified")
		return
	}
	h.send(w, r, u, store.PurposeVerifyEmail)
}

// SendReset emails a password reset link (also lets Google-only accounts add a password).
func (h *AdminHandler) SendReset(w http.ResponseWriter, r *http.Request) {
	u, ok := h.target(w, r)
	if !ok {
		return
	}
	h.send(w, r, u, store.PurposeResetPassword)
}

// send reports sent=false when the same email went out less than emailCooldown ago,
// since sendEmail would skip it silently.
func (h *AdminHandler) send(w http.ResponseWriter, r *http.Request, u *store.AdminUser, purpose string) {
	recent, err := h.Store.TokenSentRecently(r.Context(), u.ID, purpose, emailCooldown)
	if err != nil {
		h.internal(w, err)
		return
	}
	if !recent {
		h.Auth.sendEmail(&store.User{ID: u.ID, Email: u.Email}, purpose)
		log.Printf("admin %s: %s email for user %s", auth.UserID(r.Context()), purpose, u.ID)
	}
	writeJSON(w, http.StatusOK, map[string]bool{"sent": !recent})
}

// DeleteUser removes an account and all its data. Admins can't delete themselves here.
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	u, ok := h.target(w, r)
	if !ok {
		return
	}
	if u.ID == auth.UserID(r.Context()) {
		writeError(w, http.StatusConflict, "use Settings to delete your own account")
		return
	}
	if err := h.Store.DeleteUser(r.Context(), u.ID); err != nil {
		h.internal(w, err)
		return
	}
	log.Printf("admin %s: deleted user %s (%s)", auth.UserID(r.Context()), u.ID, u.Email)
	w.WriteHeader(http.StatusNoContent)
}

// target loads the user named in the URL.
func (h *AdminHandler) target(w http.ResponseWriter, r *http.Request) (*store.AdminUser, bool) {
	id := chi.URLParam(r, "userID")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return nil, false
	}
	u, err := h.Store.AdminUser(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "user not found")
		return nil, false
	}
	if err != nil {
		h.internal(w, err)
		return nil, false
	}
	return u, true
}

func (h *AdminHandler) internal(w http.ResponseWriter, err error) {
	log.Printf("admin error: %v", err)
	writeError(w, http.StatusInternalServerError, "internal error")
}

// LastSeen records authenticated visits (see Store.TouchLastSeen). A per-process cache
// skips the database for users already recorded in the last few minutes.
type LastSeen struct {
	Store *store.Store
	mu    sync.Mutex
	seen  map[string]time.Time
}

const lastSeenEvery = 10 * time.Minute

func (l *LastSeen) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if id := auth.UserID(r.Context()); id != "" && l.due(id, time.Now()) {
			if err := l.Store.TouchLastSeen(r.Context(), id); err != nil {
				log.Printf("last seen %s: %v", id, err)
			}
		}
		next.ServeHTTP(w, r)
	})
}

// due reports whether id should be written now, and remembers it if so.
func (l *LastSeen) due(id string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.seen == nil {
		l.seen = map[string]time.Time{}
	}
	if t, ok := l.seen[id]; ok && now.Sub(t) < lastSeenEvery {
		return false
	}
	// Drop stale entries now and then so the map doesn't grow forever.
	if len(l.seen) > 10000 {
		for k, t := range l.seen {
			if now.Sub(t) >= lastSeenEvery {
				delete(l.seen, k)
			}
		}
	}
	l.seen[id] = now
	return true
}
