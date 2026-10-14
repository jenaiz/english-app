package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/jenaiz/english-app/backend/internal/auth"
	"github.com/jenaiz/english-app/backend/internal/content"
	"github.com/jenaiz/english-app/backend/internal/store"
)

type ProgressHandler struct {
	Store   *store.Store
	Catalog *content.Catalog
	Club    *content.Club
}

func (h *ProgressHandler) Get(w http.ResponseWriter, r *http.Request) {
	items, err := h.Store.ListProgress(r.Context(), auth.UserID(r.Context()))
	if err != nil {
		log.Printf("list progress: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"lessons":         items,
		"completed_units": completedUnits(h.Catalog, items),
	})
}

// completedUnits returns the units whose lessons are all completed.
func completedUnits(catalog *content.Catalog, items []store.Progress) []string {
	done := map[string]bool{}
	for _, p := range items {
		if p.Status == "completed" {
			done[p.LessonID] = true
		}
	}
	out := []string{}
	for id, ref := range catalog.Units() {
		if len(ref.Unit.Lessons) == 0 {
			continue
		}
		all := true
		for _, l := range ref.Unit.Lessons {
			if !done[l.LessonID] {
				all = false
				break
			}
		}
		if all {
			out = append(out, id)
		}
	}
	return out
}

type completeRequest struct {
	UnitID   string `json:"unit_id"`
	LessonID string `json:"lesson_id,omitempty"`
	Score    int    `json:"score,omitempty"`
	// Steps are the lesson's graded exercises keyed by step index, saved as an attempt.
	Steps map[string]store.StepResult `json:"steps,omitempty"`
}

func (h *ProgressHandler) Complete(w http.ResponseWriter, r *http.Request) {
	var in completeRequest
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ref, ok := h.Catalog.Unit("", in.UnitID)
	if !ok {
		writeError(w, http.StatusNotFound, "unit not found")
		return
	}
	if in.Score < 0 || in.Score > 100 {
		writeError(w, http.StatusBadRequest, "score must be between 0 and 100")
		return
	}

	var lessonIDs []string
	var attempt []store.AttemptStep
	if in.LessonID != "" {
		lesson, ok := h.Catalog.Lesson(in.LessonID)
		if !ok || lesson.Unit.UnitID != in.UnitID {
			writeError(w, http.StatusNotFound, "lesson not found in unit")
			return
		}
		lessonIDs = []string{in.LessonID}
		if in.Steps != nil {
			if !validResults(in.Steps, lesson.Lesson.Steps) {
				writeError(w, http.StatusBadRequest, "invalid steps")
				return
			}
			attempt = attemptSteps(in.Steps, lesson.Lesson.Steps)
		}
	} else {
		for _, l := range ref.Unit.Lessons {
			lessonIDs = append(lessonIDs, l.LessonID)
		}
	}

	if err := h.Store.CompleteLessons(r.Context(), auth.UserID(r.Context()), in.UnitID, lessonIDs, in.Score, attempt); err != nil {
		log.Printf("complete lessons: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	// A finished lesson has no half-done position left to resume.
	if err := h.Store.ClearPosition(r.Context(), auth.UserID(r.Context()), in.UnitID, lessonIDs); err != nil {
		log.Printf("clear position: %v", err)
	}
	// Seed spaced-repetition cards with the vocabulary of the completed lessons.
	cardsAdded := 0
	for _, id := range lessonIDs {
		var terms []string
		for _, v := range h.Catalog.Vocabulary(id) {
			terms = append(terms, v.Term)
		}
		n, err := h.Store.AddCards(r.Context(), auth.UserID(r.Context()), id, terms)
		if err != nil {
			log.Printf("add srs cards: %v", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		cardsAdded += n
	}
	// Finishing a unit or passing a checkpoint unlocks Club activities: the end-of-lesson surprise.
	unlocked, err := syncClub(r.Context(), h.Store, h.Catalog, h.Club, auth.UserID(r.Context()))
	if err != nil {
		log.Printf("sync club: %v", err)
		unlocked = []unlockedActivity{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"unit_id": in.UnitID, "completed_lessons": lessonIDs, "cards_added": cardsAdded,
		"unlocked_activities": unlocked,
	})
}

// GetPosition returns where the learner left a unit ({"position": null} if nowhere).
func (h *ProgressHandler) GetPosition(w http.ResponseWriter, r *http.Request) {
	unitID := chi.URLParam(r, "unitID")
	if _, ok := h.Catalog.Unit("", unitID); !ok {
		writeError(w, http.StatusNotFound, "unit not found")
		return
	}
	p, err := h.Store.GetPosition(r.Context(), auth.UserID(r.Context()), unitID)
	if err != nil {
		log.Printf("get position: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"position": p})
}

type positionRequest struct {
	UnitID   string                      `json:"unit_id"`
	LessonID string                      `json:"lesson_id"`
	Step     int                         `json:"step"`
	Results  map[string]store.StepResult `json:"results"`
}

// SavePosition remembers the step the learner is on, so leaving mid-unit never means starting over.
func (h *ProgressHandler) SavePosition(w http.ResponseWriter, r *http.Request) {
	var in positionRequest
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ref, ok := h.Catalog.Lesson(in.LessonID)
	if !ok || ref.Unit.UnitID != in.UnitID {
		writeError(w, http.StatusNotFound, "lesson not found in unit")
		return
	}
	steps := len(ref.Lesson.Steps)
	if in.Step < 0 || in.Step >= steps {
		writeError(w, http.StatusBadRequest, "step out of range")
		return
	}
	if !validResults(in.Results, ref.Lesson.Steps) {
		writeError(w, http.StatusBadRequest, "invalid results")
		return
	}
	p := store.Position{LessonID: in.LessonID, Step: in.Step, Results: in.Results}
	if err := h.Store.SavePosition(r.Context(), auth.UserID(r.Context()), in.UnitID, p); err != nil {
		log.Printf("save position: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// maxAnswer caps a saved answer: enough for any sentence, not a place to store anything else.
const maxAnswer = 300

// validResults checks exercise results keyed by step index within a lesson, and cuts answers
// longer than maxAnswer (a long answer is no reason to lose the lesson).
func validResults(results map[string]store.StepResult, steps []content.Step) bool {
	for k, res := range results {
		i, err := strconv.Atoi(k)
		if err != nil || i < 0 || i >= len(steps) || res.Correct < 0 || res.Total < res.Correct || len(res.Items) > res.Total {
			return false
		}
		for j, it := range res.Items {
			if it.I < 0 || it.I >= res.Total {
				return false
			}
			if r := []rune(it.Answer); len(r) > maxAnswer {
				res.Items[j].Answer = string(r[:maxAnswer])
			}
		}
	}
	return true
}

// attemptSteps lists a lesson's results in step order, with each step's exercise type.
func attemptSteps(results map[string]store.StepResult, steps []content.Step) []store.AttemptStep {
	out := []store.AttemptStep{}
	for i, step := range steps {
		if res, ok := results[strconv.Itoa(i)]; ok {
			out = append(out, store.AttemptStep{Step: i, Type: step.Type, StepResult: res})
		}
	}
	return out
}
