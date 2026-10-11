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
	Store       *store.Store
	Catalog     *content.Catalog
	Expressions *content.Expressions
}

type reviewCard struct {
	ID          string    `json:"id"`
	Kind        string    `json:"kind"`
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
	// Multiple-choice exercise for young expression cards; nil means free recall.
	Choice *content.Choice `json:"choice,omitempty"`
}

func (h *SRSHandler) Summary(w http.ResponseWriter, r *http.Request) {
	due, total, byKind, err := h.Store.CardSummary(r.Context(), auth.UserID(r.Context()))
	if err != nil {
		h.internal(w, err)
		return
	}
	queued := 0
	for _, c := range byKind {
		queued += c.Queued
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"due": due, "total": total, "queued": queued, "by_kind": byKind,
		"new_per_day": srs.NewExpressionsPerDay, "backlog_limit": srs.BacklogLimit,
	})
}

func (h *SRSHandler) Due(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	kind := r.URL.Query().Get("kind")
	if kind != "" && kind != store.KindVocab && kind != store.KindIdiom && kind != store.KindPhrasal {
		writeError(w, http.StatusBadRequest, "kind must be vocab, idiom or phrasal")
		return
	}
	cards, err := h.Store.DueCards(r.Context(), auth.UserID(r.Context()), kind, limit)
	if err != nil {
		h.internal(w, err)
		return
	}
	now := time.Now()
	out := []reviewCard{}
	for _, c := range cards {
		rc, ok := h.resolve(c)
		if !ok {
			continue // content removed since the card was created
		}
		rc.ID, rc.Kind, rc.Repetitions, rc.DueAt = c.ID, c.Kind, c.Repetitions, c.DueAt
		rc.Preview = map[srs.Grade]float64{}
		for _, g := range []srs.Grade{srs.Again, srs.Hard, srs.Good, srs.Easy} {
			next := srs.Next(c.State(), g, now)
			rc.Preview[g] = next.DueAt.Sub(now).Hours() / 24
		}
		out = append(out, rc)
	}
	writeJSON(w, http.StatusOK, out)
}

// resolve fills a review card with the content the SRS card points to.
func (h *SRSHandler) resolve(c *store.Card) (reviewCard, bool) {
	switch c.Kind {
	case store.KindIdiom:
		it, ok := h.Expressions.Idiom(c.Term)
		if !ok {
			return reviewCard{}, false
		}
		ex := ""
		if len(it.Examples) > 0 {
			ex = it.Examples[0]
		}
		return reviewCard{Term: it.Term, Definition: it.Definition, Translation: it.EquivalentES, Example: ex,
			LevelID: it.Level, UnitTitle: "Expresiones", LessonTitle: "Idioms",
			Choice: h.Expressions.IdiomChoice(it.ID, c.Repetitions, c.ID)}, true
	case store.KindPhrasal:
		ref, ok := h.Expressions.Phrasal(c.Term)
		if !ok {
			return reviewCard{}, false
		}
		return reviewCard{Term: ref.Term(), Definition: ref.Verb.Meaning, Translation: ref.Verb.Translation, Example: ref.Verb.Example,
			LevelID: ref.Verb.Level, UnitTitle: "Expresiones", LessonTitle: "Phrasal verbs",
			Choice: h.Expressions.PhrasalChoice(ref.Verb.ID, c.Repetitions, c.ID)}, true
	default:
		ref, ok := h.Catalog.Lesson(c.LessonID)
		if !ok {
			return reviewCard{}, false
		}
		for _, v := range h.Catalog.Vocabulary(c.LessonID) {
			if v.Term == c.Term {
				return reviewCard{Term: v.Term, Definition: v.Definition, Translation: v.Translation, Example: v.Example,
					LevelID: ref.LevelID, UnitTitle: ref.Unit.Title, LessonTitle: ref.Lesson.Title}, true
			}
		}
		return reviewCard{}, false
	}
}

// SavedExpressions lists the idioms and phrasal verbs the user has added to their review.
func (h *SRSHandler) SavedExpressions(w http.ResponseWriter, r *http.Request) {
	ids, err := h.Store.ExpressionCards(r.Context(), auth.UserID(r.Context()))
	if err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ids)
}

// AddExpression adds an idiom or phrasal verb from Expresiones to the user's review.
func (h *SRSHandler) AddExpression(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Kind string `json:"kind"`
		ID   string `json:"id"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	var exists bool
	switch in.Kind {
	case store.KindIdiom:
		_, exists = h.Expressions.Idiom(in.ID)
	case store.KindPhrasal:
		_, exists = h.Expressions.Phrasal(in.ID)
	default:
		writeError(w, http.StatusBadRequest, "kind must be idiom or phrasal")
		return
	}
	if !exists {
		writeError(w, http.StatusNotFound, "expression not found")
		return
	}
	added, err := h.Store.AddExpressionCard(r.Context(), auth.UserID(r.Context()), in.Kind, in.ID)
	if err != nil {
		h.internal(w, err)
		return
	}
	queued, err := h.Store.IsQueued(r.Context(), auth.UserID(r.Context()), in.Kind, in.ID)
	if err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"kind": in.Kind, "id": in.ID, "added": added, "queued": queued})
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
