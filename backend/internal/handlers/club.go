package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/jenaiz/english-app/backend/internal/auth"
	"github.com/jenaiz/english-app/backend/internal/content"
	"github.com/jenaiz/english-app/backend/internal/store"
)

type ClubHandler struct {
	Store   *store.Store
	Catalog *content.Catalog
	Club    *content.Club
}

// Activity states as the learner sees them.
const (
	stateLocked   = "locked"
	stateNew      = "new"
	stateUnlocked = "unlocked"
	stateDone     = "done"
)

// activityCard is an activity in the Club catalog. Locked ones keep their surprise: no title,
// subtitle or video, just the room, level and a hint of what unlocks them.
type activityCard struct {
	ID         string     `json:"id"`
	Type       string     `json:"type"`
	Room       string     `json:"room"`
	Level      string     `json:"level"`
	Minutes    int        `json:"minutes"`
	State      string     `json:"state"`
	Title      string     `json:"title,omitempty"`
	Subtitle   string     `json:"subtitle,omitempty"`
	YouTubeID  string     `json:"youtube_id,omitempty"`
	Hint       string     `json:"hint,omitempty"`
	BestScore  *int       `json:"best_score,omitempty"`
	UnlockedAt *time.Time `json:"unlocked_at,omitempty"`
}

func stateOf(st *store.ActivityState) string {
	switch {
	case st == nil:
		return stateLocked
	case st.CompletedAt != nil:
		return stateDone
	case st.SeenAt == nil:
		return stateNew
	}
	return stateUnlocked
}

func (h *ClubHandler) card(a *content.Activity, st *store.ActivityState) activityCard {
	c := activityCard{ID: a.ID, Type: a.Type, Room: a.Room, Level: a.Level, Minutes: a.Minutes, State: stateOf(st)}
	if st == nil {
		c.Hint = h.Catalog.LockedHint(a)
		return c
	}
	c.Title, c.Subtitle, c.YouTubeID = a.Title, a.Subtitle, a.YouTubeID
	c.BestScore, c.UnlockedAt = st.BestScore, &st.UnlockedAt
	return c
}

// List returns every activity with the learner's state, after unlocking whatever milestones
// they have reached (so content added later reaches learners who are already ahead).
func (h *ClubHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	if _, err := syncClub(r.Context(), h.Store, h.Catalog, h.Club, userID); err != nil {
		log.Printf("sync club: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	states, err := h.states(r.Context(), userID)
	if err != nil {
		log.Printf("list activities: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	cards := make([]activityCard, 0, len(h.Club.Activities))
	for i := range h.Club.Activities {
		a := &h.Club.Activities[i]
		cards = append(cards, h.card(a, states[a.ID]))
	}
	writeJSON(w, http.StatusOK, map[string]any{"activities": cards})
}

// Summary counts the activities still unopened, for the navbar badge.
func (h *ClubHandler) Summary(w http.ResponseWriter, r *http.Request) {
	states, err := h.states(r.Context(), auth.UserID(r.Context()))
	if err != nil {
		log.Printf("list activities: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	fresh := 0
	for _, st := range states {
		if stateOf(st) == stateNew {
			fresh++
		}
	}
	writeJSON(w, http.StatusOK, map[string]int{"new": fresh, "unlocked": len(states), "total": len(h.Club.Activities)})
}

// Get returns an unlocked activity with its content, and marks it as seen.
func (h *ClubHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	a, st, ok := h.unlocked(w, r)
	if !ok {
		return
	}
	if err := h.Store.MarkActivitySeen(r.Context(), userID, a.ID); err != nil {
		log.Printf("mark activity seen: %v", err)
	}
	writeJSON(w, http.StatusOK, map[string]any{"activity": a, "card": h.card(a, st)})
}

// Complete records a finished activity with its score (0-100).
func (h *ClubHandler) Complete(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Score int `json:"score"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if in.Score < 0 || in.Score > 100 {
		writeError(w, http.StatusBadRequest, "score must be between 0 and 100")
		return
	}
	a, st, ok := h.unlocked(w, r)
	if !ok {
		return
	}
	if a.Lab {
		// A lab activity has no record until it is first completed.
		if _, err := h.Store.UnlockActivity(r.Context(), auth.UserID(r.Context()), a.ID, "lab"); err != nil {
			log.Printf("unlock lab activity: %v", err)
		}
	}
	if err := h.Store.CompleteActivity(r.Context(), auth.UserID(r.Context()), a.ID, in.Score); err != nil {
		log.Printf("complete activity: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	best := in.Score
	if st.BestScore != nil && *st.BestScore > best {
		best = *st.BestScore
	}
	writeJSON(w, http.StatusOK, map[string]int{"best_score": best})
}

// unlocked loads the activity named in the URL, writing an error unless the learner has unlocked it.
func (h *ClubHandler) unlocked(w http.ResponseWriter, r *http.Request) (*content.Activity, *store.ActivityState, bool) {
	a, ok := h.Club.Activity(chi.URLParam(r, "activityID"))
	if !ok {
		writeError(w, http.StatusNotFound, "activity not found")
		return nil, nil, false
	}
	states, err := h.states(r.Context(), auth.UserID(r.Context()))
	if err != nil {
		log.Printf("list activities: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return nil, nil, false
	}
	st := states[a.ID]
	if st == nil {
		writeErrorCode(w, http.StatusForbidden, "locked", "activity is locked")
		return nil, nil, false
	}
	return a, st, true
}

// states returns the learner's unlocked activities by id, skipping any no longer in the catalog.
// Lab activities count as unlocked.
func (h *ClubHandler) states(ctx context.Context, userID string) (map[string]*store.ActivityState, error) {
	list, err := h.Store.ListActivities(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := map[string]*store.ActivityState{}
	for i := range list {
		if _, ok := h.Club.Activity(list[i].ActivityID); ok {
			out[list[i].ActivityID] = &list[i]
		}
	}
	// Lab activities are always open, whether they have a record yet or not.
	for _, a := range h.Club.Activities {
		if a.Lab && out[a.ID] == nil {
			now := time.Now()
			out[a.ID] = &store.ActivityState{ActivityID: a.ID, Milestone: "lab", UnlockedAt: now, SeenAt: &now}
		}
	}
	return out, nil
}

// unlockedActivity is an activity a milestone has just unlocked, for the end-of-lesson surprise.
type unlockedActivity struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Room      string `json:"room"`
	Title     string `json:"title"`
	Subtitle  string `json:"subtitle,omitempty"`
	YouTubeID string `json:"youtube_id,omitempty"`
}

// syncClub unlocks one activity for each milestone the learner has reached that has not
// unlocked one yet, and returns the activities it unlocked. A milestone with nothing left to
// unlock stays pending, so new content reaches the learner later.
func syncClub(ctx context.Context, st *store.Store, catalog *content.Catalog, club *content.Club, userID string) ([]unlockedActivity, error) {
	out := []unlockedActivity{}
	if club == nil || len(club.Activities) == 0 {
		return out, nil
	}
	progress, err := st.ListProgress(ctx, userID)
	if err != nil {
		return nil, err
	}
	done := map[string]bool{}
	for _, p := range progress {
		if p.Status == "completed" {
			done[p.LessonID] = true
		}
	}
	milestones := catalog.Milestones(done)
	// Passing a level exam is a checkpoint of its level.
	passed, err := st.PassedExams(ctx, userID)
	if err != nil {
		return nil, err
	}
	for _, p := range passed {
		milestones = append(milestones, content.Milestone{Key: "exam:" + p.ExamID, Kind: content.MilestoneCheckpoint, Level: p.LevelID})
	}
	if len(milestones) == 0 {
		return out, nil
	}
	states, err := st.ListActivities(ctx, userID)
	if err != nil {
		return nil, err
	}
	unlocked, reached := map[string]bool{}, map[string]bool{}
	for _, s := range states {
		unlocked[s.ActivityID] = true
		reached[s.Milestone] = true
	}
	for _, m := range milestones {
		if reached[m.Key] {
			continue
		}
		id := club.Pick(userID, m, unlocked)
		if id == "" {
			continue
		}
		added, err := st.UnlockActivity(ctx, userID, id, m.Key)
		if err != nil {
			return nil, err
		}
		unlocked[id] = true
		if !added {
			continue
		}
		a, _ := club.Activity(id)
		out = append(out, unlockedActivity{ID: a.ID, Type: a.Type, Room: a.Room, Title: a.Title, Subtitle: a.Subtitle, YouTubeID: a.YouTubeID})
	}
	return out, nil
}
