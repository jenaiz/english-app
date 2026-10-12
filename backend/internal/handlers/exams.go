package handlers

import (
	"context"
	"errors"
	"log"
	"math/rand"
	"net/http"
	"regexp"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/jenaiz/english-app/backend/internal/auth"
	"github.com/jenaiz/english-app/backend/internal/content"
	"github.com/jenaiz/english-app/backend/internal/store"
)

// examGrace accepts answers saved a little after the deadline (network, the final autosave).
const examGrace = 30 * time.Second

var uuidRe = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// maxAnswerLen bounds a typed answer; the longest expected one is a short sentence.
const maxAnswerLen = 200

type ExamsHandler struct {
	Store   *store.Store
	Catalog *content.Catalog
	Exams   *content.Exams
	Club    *content.Club
	Voices  content.Voices
}

type examSectionSummary struct {
	SectionID string `json:"section_id"`
	Title     string `json:"title"`
	Items     int    `json:"items"`
}

type examStatus struct {
	Attempts  int        `json:"attempts"`
	BestScore *int       `json:"best_score"`
	Passed    bool       `json:"passed"`
	PassedAt  *time.Time `json:"passed_at,omitempty"`
	// PassedAttempt is the best passed attempt, for the certificate.
	PassedAttempt string     `json:"passed_attempt,omitempty"`
	LastAttempt   string     `json:"last_attempt,omitempty"`
	LastScore     *int       `json:"last_score,omitempty"`
	RetryAt       *time.Time `json:"retry_at,omitempty"`
	OpenAttempt   string     `json:"open_attempt,omitempty"`
	OpenDeadline  *time.Time `json:"open_deadline,omitempty"`
}

type examSummary struct {
	ExamID          string               `json:"exam_id"`
	LevelID         string               `json:"level_id"`
	Title           string               `json:"title"`
	Description     string               `json:"description"`
	DurationMinutes int                  `json:"duration_minutes"`
	PassScore       int                  `json:"pass_score"`
	SectionMinScore int                  `json:"section_min_score"`
	RetakeHours     int                  `json:"retake_hours"`
	MaxPlays        int                  `json:"max_plays"`
	Items           int                  `json:"items"`
	Sections        []examSectionSummary `json:"sections"`
	Topics          []string             `json:"topics"`
	Status          examStatus           `json:"status"`
}

func summarize(e *content.Exam) examSummary {
	s := examSummary{
		ExamID: e.ExamID, LevelID: e.LevelID, Title: e.Title, Description: e.Description,
		DurationMinutes: e.DurationMinutes, PassScore: e.PassScore, SectionMinScore: e.SectionMinScore,
		RetakeHours: e.RetakeHours, MaxPlays: e.MaxPlays, Topics: []string{},
	}
	for _, sec := range e.Sections {
		n := 0
		for _, p := range sec.Parts {
			n += len(p.Variants[0].Items)
		}
		s.Items += n
		s.Sections = append(s.Sections, examSectionSummary{SectionID: sec.SectionID, Title: sec.Title, Items: n})
	}
	for _, t := range e.Syllabus {
		s.Topics = append(s.Topics, t.Label)
	}
	return s
}

// attempts returns the user's attempts, grading first the open ones whose time is up.
func (h *ExamsHandler) attempts(ctx context.Context, userID string) ([]store.ExamAttempt, error) {
	list, err := h.Store.ListAttempts(ctx, userID)
	if err != nil {
		return nil, err
	}
	for i := range list {
		if list[i].SubmittedAt == nil && time.Now().After(list[i].Deadline.Add(examGrace)) {
			if _, err := h.finish(ctx, userID, &list[i]); err != nil {
				return nil, err
			}
		}
	}
	return list, nil
}

// finish grades an open attempt with its saved answers and closes it; a reached milestone may
// unlock Club activities. a is updated in place.
func (h *ExamsHandler) finish(ctx context.Context, userID string, a *store.ExamAttempt) ([]unlockedActivity, error) {
	e, ok := h.Exams.Exam(a.ExamID)
	if !ok {
		return nil, nil
	}
	res := e.Grade(a.Form, a.Answers)
	if _, err := h.Store.SubmitAttempt(ctx, userID, a.ID, res.Score, res.Passed, res); err != nil {
		return nil, err
	}
	fresh, err := h.Store.Attempt(ctx, userID, a.ID)
	if err != nil {
		return nil, err
	}
	*a = *fresh
	if !res.Passed {
		return []unlockedActivity{}, nil
	}
	return syncClub(ctx, h.Store, h.Catalog, h.Club, userID)
}

func (h *ExamsHandler) status(e *content.Exam, list []store.ExamAttempt) examStatus {
	var st examStatus
	bestPassed := -1
	for i := range list {
		a := &list[i]
		if a.ExamID != e.ExamID {
			continue
		}
		if a.SubmittedAt == nil {
			st.OpenAttempt, st.OpenDeadline = a.ID, &a.Deadline
			continue
		}
		st.Attempts++
		if st.LastAttempt == "" { // newest first
			st.LastAttempt, st.LastScore = a.ID, a.Score
			if retry := a.SubmittedAt.Add(time.Duration(e.RetakeHours) * time.Hour); time.Now().Before(retry) {
				st.RetryAt = &retry
			}
		}
		if a.Score != nil && (st.BestScore == nil || *a.Score > *st.BestScore) {
			st.BestScore = a.Score
		}
		if a.Passed != nil && *a.Passed {
			st.Passed = true
			if st.PassedAt == nil || a.SubmittedAt.Before(*st.PassedAt) {
				st.PassedAt = a.SubmittedAt
			}
			if *a.Score > bestPassed {
				st.PassedAttempt, bestPassed = a.ID, *a.Score
			}
		}
	}
	return st
}

// List returns every level exam with the learner's status in it.
func (h *ExamsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	list, err := h.attempts(r.Context(), userID)
	if err != nil {
		h.internal(w, "list attempts", err)
		return
	}
	out := []examSummary{}
	for _, e := range h.Exams.List {
		s := summarize(e)
		s.Status = h.status(e, list)
		out = append(out, s)
	}
	writeJSON(w, http.StatusOK, out)
}

// Start opens an attempt, or returns the open one. After a submitted attempt the learner waits
// RetakeHours: the exam is a check of the level, not something to retry until it sticks.
func (h *ExamsHandler) Start(w http.ResponseWriter, r *http.Request) {
	ctx, userID := r.Context(), auth.UserID(r.Context())
	e, ok := h.Exams.Exam(chi.URLParam(r, "examID"))
	if !ok {
		writeError(w, http.StatusNotFound, "exam not found")
		return
	}
	list, err := h.attempts(ctx, userID)
	if err != nil {
		h.internal(w, "list attempts", err)
		return
	}
	st := h.status(e, list)
	if st.OpenAttempt != "" {
		writeJSON(w, http.StatusOK, map[string]string{"attempt_id": st.OpenAttempt})
		return
	}
	if st.RetryAt != nil {
		writeJSON(w, http.StatusConflict, map[string]any{"error": "wait before retaking the exam", "code": "retake_wait", "retry_at": st.RetryAt})
		return
	}
	var prev content.Form
	for _, a := range list { // newest first
		if a.ExamID == e.ExamID {
			prev = a.Form
			break
		}
	}
	form := e.NextForm(prev, rand.New(rand.NewSource(time.Now().UnixNano())))
	deadline := time.Now().Add(time.Duration(e.DurationMinutes) * time.Minute)
	a, err := h.Store.CreateAttempt(ctx, userID, e.ExamID, e.LevelID, form, deadline)
	if errors.Is(err, store.ErrConflict) {
		// A parallel request opened it first.
		list, err = h.Store.ListAttempts(ctx, userID)
		if err == nil {
			if open := h.status(e, list).OpenAttempt; open != "" {
				writeJSON(w, http.StatusOK, map[string]string{"attempt_id": open})
				return
			}
		}
	}
	if err != nil {
		h.internal(w, "create attempt", err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"attempt_id": a.ID})
}

// attempt loads the user's attempt from the URL, grading it first if its time is up.
func (h *ExamsHandler) attempt(w http.ResponseWriter, r *http.Request) (*store.ExamAttempt, *content.Exam, bool) {
	ctx, userID := r.Context(), auth.UserID(r.Context())
	id := chi.URLParam(r, "attemptID")
	if !uuidRe.MatchString(id) {
		writeError(w, http.StatusNotFound, "attempt not found")
		return nil, nil, false
	}
	a, err := h.Store.Attempt(ctx, userID, id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "attempt not found")
		return nil, nil, false
	}
	if err != nil {
		h.internal(w, "load attempt", err)
		return nil, nil, false
	}
	e, ok := h.Exams.Exam(a.ExamID)
	if !ok {
		writeError(w, http.StatusNotFound, "exam not found")
		return nil, nil, false
	}
	if a.SubmittedAt == nil && time.Now().After(a.Deadline.Add(examGrace)) {
		if _, err := h.finish(ctx, userID, a); err != nil {
			h.internal(w, "finish attempt", err)
			return nil, nil, false
		}
	}
	return a, e, true
}

type attemptView struct {
	AttemptID       string             `json:"attempt_id"`
	ExamID          string             `json:"exam_id"`
	LevelID         string             `json:"level_id"`
	Title           string             `json:"title"`
	Status          string             `json:"status"` // open | submitted
	StartedAt       time.Time          `json:"started_at"`
	Deadline        time.Time          `json:"deadline"`
	Now             time.Time          `json:"now"`
	PassScore       int                `json:"pass_score"`
	SectionMinScore int                `json:"section_min_score"`
	Paper           *content.Paper     `json:"paper,omitempty"`
	Answers         map[string]string  `json:"answers,omitempty"`
	SubmittedAt     *time.Time         `json:"submitted_at,omitempty"`
	Result          any                `json:"result,omitempty"`
	RetryAt         *time.Time         `json:"retry_at,omitempty"`
	Unlocked        []unlockedActivity `json:"unlocked_activities,omitempty"`
}

func (h *ExamsHandler) view(a *store.ExamAttempt, e *content.Exam) attemptView {
	v := attemptView{
		AttemptID: a.ID, ExamID: e.ExamID, LevelID: e.LevelID, Title: e.Title,
		StartedAt: a.StartedAt, Deadline: a.Deadline, Now: time.Now(),
		PassScore: e.PassScore, SectionMinScore: e.SectionMinScore,
	}
	if a.SubmittedAt == nil {
		p := e.Paper(a.Form, a.ID, h.Voices)
		v.Status, v.Paper, v.Answers = "open", &p, a.Answers
		return v
	}
	v.Status, v.SubmittedAt, v.Result = "submitted", a.SubmittedAt, a.Result
	if retry := a.SubmittedAt.Add(time.Duration(e.RetakeHours) * time.Hour); time.Now().Before(retry) {
		v.RetryAt = &retry
	}
	return v
}

// Get returns an open attempt's paper and saved answers, or a submitted attempt's result.
func (h *ExamsHandler) Get(w http.ResponseWriter, r *http.Request) {
	a, e, ok := h.attempt(w, r)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, h.view(a, e))
}

type answersRequest struct {
	Answers map[string]string `json:"answers"`
}

// checkAnswers keeps only answers to items of the attempt's paper.
func checkAnswers(e *content.Exam, a *store.ExamAttempt, in map[string]string) (map[string]string, bool) {
	out := map[string]string{}
	for id, ans := range in {
		if !e.HasItem(a.Form, id) || len(ans) > maxAnswerLen {
			return nil, false
		}
		out[id] = ans
	}
	return out, true
}

// SaveAnswers stores answers as the learner goes, so a reload or a lost connection loses nothing.
func (h *ExamsHandler) SaveAnswers(w http.ResponseWriter, r *http.Request) {
	a, e, ok := h.attempt(w, r)
	if !ok {
		return
	}
	var in answersRequest
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	answers, ok := checkAnswers(e, a, in.Answers)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid answers")
		return
	}
	saved, err := h.Store.SaveAnswers(r.Context(), auth.UserID(r.Context()), a.ID, answers, examGrace)
	if err != nil {
		h.internal(w, "save answers", err)
		return
	}
	if !saved {
		writeErrorCode(w, http.StatusConflict, "attempt_closed", "the attempt is closed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Submit saves the last answers, grades the attempt and returns its result.
func (h *ExamsHandler) Submit(w http.ResponseWriter, r *http.Request) {
	ctx, userID := r.Context(), auth.UserID(r.Context())
	a, e, ok := h.attempt(w, r)
	if !ok {
		return
	}
	var in answersRequest
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if a.SubmittedAt != nil {
		writeJSON(w, http.StatusOK, h.view(a, e))
		return
	}
	answers, ok := checkAnswers(e, a, in.Answers)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid answers")
		return
	}
	if len(answers) > 0 {
		if _, err := h.Store.SaveAnswers(ctx, userID, a.ID, answers, examGrace); err != nil {
			h.internal(w, "save answers", err)
			return
		}
	}
	fresh, err := h.Store.Attempt(ctx, userID, a.ID)
	if err != nil {
		h.internal(w, "load attempt", err)
		return
	}
	unlocked, err := h.finish(ctx, userID, fresh)
	if err != nil {
		h.internal(w, "finish attempt", err)
		return
	}
	v := h.view(fresh, e)
	v.Unlocked = unlocked
	writeJSON(w, http.StatusOK, v)
}

func (h *ExamsHandler) internal(w http.ResponseWriter, what string, err error) {
	log.Printf("%s: %v", what, err)
	writeError(w, http.StatusInternalServerError, "internal error")
}
