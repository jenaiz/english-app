package handlers

import (
	"log"
	"net/http"

	"github.com/jenaiz/english-app/backend/internal/auth"
	"github.com/jenaiz/english-app/backend/internal/content"
	"github.com/jenaiz/english-app/backend/internal/store"
)

type ProgressHandler struct {
	Store   *store.Store
	Catalog *content.Catalog
}

func (h *ProgressHandler) Get(w http.ResponseWriter, r *http.Request) {
	items, err := h.Store.ListProgress(r.Context(), auth.UserID(r.Context()))
	if err != nil {
		log.Printf("list progress: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	done := map[string]bool{}
	for _, p := range items {
		if p.Status == "completed" {
			done[p.LessonID] = true
		}
	}
	completedUnits := []string{}
	for id, ref := range h.Catalog.Units() {
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
			completedUnits = append(completedUnits, id)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"lessons":         items,
		"completed_units": completedUnits,
	})
}

type completeRequest struct {
	UnitID   string `json:"unit_id"`
	LessonID string `json:"lesson_id,omitempty"`
	Score    int    `json:"score,omitempty"`
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
	if in.LessonID != "" {
		if !ref.Unit.HasLesson(in.LessonID) {
			writeError(w, http.StatusNotFound, "lesson not found in unit")
			return
		}
		lessonIDs = []string{in.LessonID}
	} else {
		for _, l := range ref.Unit.Lessons {
			lessonIDs = append(lessonIDs, l.LessonID)
		}
	}

	if err := h.Store.CompleteLessons(r.Context(), auth.UserID(r.Context()), in.UnitID, lessonIDs, in.Score); err != nil {
		log.Printf("complete lessons: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
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
	writeJSON(w, http.StatusOK, map[string]any{
		"unit_id": in.UnitID, "completed_lessons": lessonIDs, "cards_added": cardsAdded,
	})
}
