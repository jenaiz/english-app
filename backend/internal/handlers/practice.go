package handlers

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"sort"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/jenaiz/english-app/backend/internal/auth"
	"github.com/jenaiz/english-app/backend/internal/content"
	"github.com/jenaiz/english-app/backend/internal/srs"
	"github.com/jenaiz/english-app/backend/internal/store"
)

// PracticeHandler serves Repaso → Gramática: grammar topics with many exercises each, in
// rounds of a few items, spaced out over the days.
type PracticeHandler struct {
	Store    *store.Store
	Catalog  *content.Catalog
	Practice *content.Practice
}

// roundSize is how many items a practice round has (about five minutes).
const roundSize = 12

type unitLink struct {
	UnitID  string `json:"unit_id"`
	LevelID string `json:"level_id"`
	Title   string `json:"title"`
}

type practiceTopicSummary struct {
	TopicID string `json:"topic_id"`
	LevelID string `json:"level_id"`
	Title   string `json:"title"`
	Items   int    `json:"items"`
	// Locked topics open with their first unit (OpensWith).
	Locked    bool      `json:"locked"`
	OpensWith *unitLink `json:"opens_with,omitempty"`
	// Status: "new" (never practised), "due" (practise today) or "done" (up to date).
	Status   string     `json:"status"`
	DueAt    *time.Time `json:"due_at,omitempty"`
	Sessions int        `json:"sessions"`
	// Accuracy over every round (0-100); Recent are the last rounds' scores, oldest first.
	Accuracy *int       `json:"accuracy,omitempty"`
	Recent   []int      `json:"recent"`
	LastAt   *time.Time `json:"last_at,omitempty"`
}

// List returns every practice topic with the learner's state.
func (h *PracticeHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r.Context())
	open, err := h.openTopics(r, userID)
	if err != nil {
		h.internal(w, err)
		return
	}
	states, err := h.Store.PracticeTopicStates(r.Context(), userID)
	if err != nil {
		h.internal(w, err)
		return
	}
	now := time.Now()
	out := []practiceTopicSummary{}
	due := 0
	for _, t := range h.Practice.Topics {
		s := practiceTopicSummary{TopicID: t.TopicID, LevelID: t.LevelID, Title: t.Title, Items: len(t.Items()), Status: "new", Recent: []int{}}
		if !open[t.TopicID] {
			s.Locked = true
			s.OpensWith = h.firstUnit(t)
		}
		if st := states[t.TopicID]; st != nil {
			s.Sessions, s.LastAt = st.Sessions, st.LastAt
			if st.Recent != nil {
				s.Recent = st.Recent
			}
			if st.Total > 0 {
				acc := (st.Correct*100 + st.Total/2) / st.Total
				s.Accuracy = &acc
			}
			if st.Scheduled {
				dueAt := st.DueAt
				s.DueAt = &dueAt
				s.Status = "done"
				if !dueAt.After(now) {
					s.Status = "due"
				}
			}
		}
		if s.Status == "due" && !s.Locked {
			due++
		}
		out = append(out, s)
	}
	writeJSON(w, http.StatusOK, map[string]any{"topics": out, "due": due})
}

// openTopics returns the topics the learner can practise: those of a unit they have started,
// and every topic of a level below the highest one they have reached.
func (h *PracticeHandler) openTopics(r *http.Request, userID string) (map[string]bool, error) {
	progress, err := h.Store.ListProgress(r.Context(), userID)
	if err != nil {
		return nil, err
	}
	started := map[string]bool{}
	top := -1
	for _, p := range progress {
		started[p.UnitID] = true
		if ref, ok := h.Catalog.Unit("", p.UnitID); ok && content.LevelRank(ref.LevelID) > top {
			top = content.LevelRank(ref.LevelID)
		}
	}
	open := map[string]bool{}
	for _, t := range h.Practice.Topics {
		if content.LevelRank(t.LevelID) < top {
			open[t.TopicID] = true
			continue
		}
		for _, u := range t.Units {
			if started[u] {
				open[t.TopicID] = true
			}
		}
	}
	return open, nil
}

// firstUnit is the earliest unit in the course that teaches the topic.
func (h *PracticeHandler) firstUnit(t *content.PracticeTopic) *unitLink {
	var best *content.UnitRef
	for _, id := range t.Units {
		if ref, ok := h.Catalog.Unit("", id); ok && (best == nil || ref.Pos < best.Pos) {
			r := ref
			best = &r
		}
	}
	if best == nil {
		return nil
	}
	return &unitLink{UnitID: best.Unit.UnitID, LevelID: best.LevelID, Title: best.Unit.Title}
}

// unitLinks are the units that teach the topic, in course order, to go back to their rule.
func (h *PracticeHandler) unitLinks(t *content.PracticeTopic) []unitLink {
	var refs []content.UnitRef
	for _, id := range t.Units {
		if ref, ok := h.Catalog.Unit("", id); ok {
			refs = append(refs, ref)
		}
	}
	sort.Slice(refs, func(i, j int) bool { return refs[i].Pos < refs[j].Pos })
	out := []unitLink{}
	for _, ref := range refs {
		out = append(out, unitLink{UnitID: ref.Unit.UnitID, LevelID: ref.LevelID, Title: ref.Unit.Title})
	}
	return out
}

type practiceStep struct {
	Type    string         `json:"type"`
	Content map[string]any `json:"content"`
}

// Session returns a round of the topic: its rule and roundSize items grouped by exercise type.
func (h *PracticeHandler) Session(w http.ResponseWriter, r *http.Request) {
	t, ok := h.topic(w, r)
	if !ok {
		return
	}
	stats, err := h.Store.PracticeItemStats(r.Context(), auth.UserID(r.Context()), t.TopicID)
	if err != nil {
		h.internal(w, err)
		return
	}
	picked := pickItems(t.Items(), stats, roundSize, rand.New(rand.NewSource(time.Now().UnixNano())))
	var steps []practiceStep
	for _, it := range picked {
		set := t.Sets[it.Set]
		if len(steps) == 0 || steps[len(steps)-1].Content["set"] != it.Set {
			c := map[string]any{"set": it.Set, "instructions": set.Instructions, "items": []json.RawMessage{}}
			if len(set.Bank) > 0 {
				c["bank"] = set.Bank
			}
			if set.Strict {
				c["strict"] = true
			}
			steps = append(steps, practiceStep{Type: set.Type, Content: c})
		}
		last := steps[len(steps)-1].Content
		last["items"] = append(last["items"].([]json.RawMessage), it.Raw)
	}
	for _, s := range steps {
		delete(s.Content, "set")
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"topic": map[string]any{"topic_id": t.TopicID, "level_id": t.LevelID, "title": t.Title, "rule": t.Rule, "units": h.unitLinks(t)},
		"steps": steps,
	})
}

// pickItems chooses n items for a round: first the ones missed last time (longest ago first),
// then unseen ones in random order, then the rest by how long ago they were seen. No exercise
// type takes more than its share while others have items left, so a round mixes formats.
// The result is in set order, so the round runs one exercise type after another.
func pickItems(items []content.PracticeItem, stats map[string]store.ItemStat, n int, rnd *rand.Rand) []content.PracticeItem {
	type cand struct {
		item  content.PracticeItem
		class int
		seen  time.Time
		order int
	}
	shuffled := rnd.Perm(len(items))
	cands := make([]cand, len(items))
	sets := map[int]bool{}
	for i, it := range items {
		c := cand{item: it, class: 1, order: shuffled[i]}
		if st, ok := stats[it.ID]; ok {
			c.seen = st.LastSeenAt
			c.class = 2
			if !st.LastOK {
				c.class = 0
			}
		}
		cands[i] = c
		sets[it.Set] = true
	}
	sort.SliceStable(cands, func(i, j int) bool {
		a, b := cands[i], cands[j]
		if a.class != b.class {
			return a.class < b.class
		}
		if a.class != 1 && !a.seen.Equal(b.seen) {
			return a.seen.Before(b.seen)
		}
		return a.order < b.order
	})
	share := (n+len(sets)-1)/max(len(sets), 1) + 1
	perSet := map[int]int{}
	taken := map[string]bool{}
	var out []content.PracticeItem
	for pass := 0; pass < 2 && len(out) < n; pass++ {
		for _, c := range cands {
			if len(out) == n {
				break
			}
			if taken[c.item.ID] || (pass == 0 && perSet[c.item.Set] >= share) {
				continue
			}
			taken[c.item.ID] = true
			perSet[c.item.Set]++
			out = append(out, c.item)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Set < out[j].Set })
	return out
}

type practiceResultRequest struct {
	Results []store.PracticeResult `json:"results"`
}

// Finish records a round and schedules the topic: the better the round, the longer until it
// is due again (SM-2, like the review cards).
func (h *PracticeHandler) Finish(w http.ResponseWriter, r *http.Request) {
	t, ok := h.topic(w, r)
	if !ok {
		return
	}
	var in practiceResultRequest
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !validPracticeResults(t, in.Results) {
		writeError(w, http.StatusBadRequest, "invalid results")
		return
	}
	userID := auth.UserID(r.Context())
	current, err := h.Store.TopicSchedule(r.Context(), userID, t.TopicID)
	if err != nil {
		h.internal(w, err)
		return
	}
	correct := 0
	for _, res := range in.Results {
		if res.OK {
			correct++
		}
	}
	score := (correct*100 + len(in.Results)/2) / len(in.Results)
	next := srs.Next(current, roundGrade(score), time.Now())
	if err := h.Store.SavePracticeSession(r.Context(), userID, t.TopicID, in.Results, next); err != nil {
		h.internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"score": score, "correct": correct, "total": len(in.Results), "due_at": next.DueAt})
}

// roundGrade turns a round's score into a review grade for the topic's schedule.
func roundGrade(score int) srs.Grade {
	switch {
	case score >= 90:
		return srs.Easy
	case score >= 70:
		return srs.Good
	case score >= 50:
		return srs.Hard
	}
	return srs.Again
}

// validPracticeResults checks a round: known, distinct items of the topic, answers cut to size.
func validPracticeResults(t *content.PracticeTopic, results []store.PracticeResult) bool {
	if len(results) == 0 || len(results) > 3*roundSize {
		return false
	}
	ids := map[string]bool{}
	for _, it := range t.Items() {
		ids[it.ID] = true
	}
	seen := map[string]bool{}
	for i, res := range results {
		if !ids[res.ID] || seen[res.ID] {
			return false
		}
		seen[res.ID] = true
		if a := []rune(res.Answer); len(a) > maxAnswer {
			results[i].Answer = string(a[:maxAnswer])
		}
	}
	return true
}

// topic loads the topic of the URL and checks the learner can practise it.
func (h *PracticeHandler) topic(w http.ResponseWriter, r *http.Request) (*content.PracticeTopic, bool) {
	t, ok := h.Practice.Topic(chi.URLParam(r, "topicID"))
	if !ok {
		writeError(w, http.StatusNotFound, "topic not found")
		return nil, false
	}
	open, err := h.openTopics(r, auth.UserID(r.Context()))
	if err != nil {
		h.internal(w, err)
		return nil, false
	}
	if !open[t.TopicID] {
		writeError(w, http.StatusForbidden, "locked")
		return nil, false
	}
	return t, true
}

func (h *PracticeHandler) internal(w http.ResponseWriter, err error) {
	log.Printf("practice: %v", err)
	writeError(w, http.StatusInternalServerError, "internal error")
}
