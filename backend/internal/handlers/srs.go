package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jenaiz/english-app/backend/internal/auth"
	"github.com/jenaiz/english-app/backend/internal/content"
	"github.com/jenaiz/english-app/backend/internal/srs"
	"github.com/jenaiz/english-app/backend/internal/store"
)

type SRSHandler struct {
	Store   *store.Store
	Catalog *content.Catalog
}

type reviewCard struct {
	ID          string    `json:"id"`
	Term        string    `json:"term"`
	Definition  string    `json:"definition"`
	Translation string    `json:"translation"`
	Example     string    `json:"example,omitempty"`
	LevelID     string    `json:"level_id"`
	UnitTitle   string    `json:"unit_title"`
	LessonTitle string    `json:"lesson_title"`
	Repetitions int       `json:"repetitions"`
	DueAt       time.Time `json:"due_at"`
	// Preview of the next interval (days) for each grade, for the buttons.
	Preview map[srs.Grade]float64 `json:"preview"`
}

func (h *SRSHandler) Summary(w http.ResponseWriter, r *http.Request) {
	due, total, err := h.Store.CardSummary(r.Context(), auth.UserID(r.Context()))
	if err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"due": due, "total": total})
}

func (h *SRSHandler) Due(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	cards, err := h.Store.DueCards(r.Context(), auth.UserID(r.Context()), limit)
	if err != nil {
		h.internal(w, err)
		return
	}
	now := time.Now()
	out := []reviewCard{}
	for _, c := range cards {
		ref, ok := h.Catalog.Lesson(c.LessonID)
		if !ok {
			continue // content removed since the card was created
		}
		var item *content.VocabItem
		for _, v := range h.Catalog.Vocabulary(c.LessonID) {
			if v.Term == c.Term {
				item = &v
				break
			}
		}
		if item == nil {
			continue
		}
		preview := map[srs.Grade]float64{}
		for _, g := range []srs.Grade{srs.Again, srs.Hard, srs.Good, srs.Easy} {
			next := srs.Next(c.State(), g, now)
			preview[g] = next.DueAt.Sub(now).Hours() / 24
		}
		out = append(out, reviewCard{
			ID: c.ID, Term: item.Term, Definition: item.Definition, Translation: item.Translation, Example: item.Example,
			LevelID: ref.LevelID, UnitTitle: ref.Unit.Title, LessonTitle: ref.Lesson.Title,
			Repetitions: c.Repetitions, DueAt: c.DueAt, Preview: preview,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *SRSHandler) Review(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CardID string `json:"card_id"`
		Grade  string `json:"grade"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	grade, err := srs.ParseGrade(in.Grade)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if _, err := uuid.Parse(in.CardID); err != nil {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}
	userID := auth.UserID(r.Context())
	card, err := h.Store.Card(r.Context(), userID, in.CardID)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}
	if err != nil {
		h.internal(w, err)
		return
	}
	next := srs.Next(card.State(), grade, time.Now())
	if err := h.Store.UpdateCard(r.Context(), userID, card.ID, next); err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id": card.ID, "due_at": next.DueAt, "interval_days": next.IntervalDays,
		"repetitions": next.Repetitions, "ease": next.Ease,
	})
}

func (h *SRSHandler) internal(w http.ResponseWriter, err error) {
	log.Printf("srs error: %v", err)
	writeError(w, http.StatusInternalServerError, "internal error")
}
