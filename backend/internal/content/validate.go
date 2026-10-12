package content

import (
	"encoding/json"
	"fmt"
	"strings"
)

// Phases is the 7-phase flow every lesson must follow, in order.
var Phases = []string{"context", "discovery", "grammar", "practice", "production", "vocabulary", "review"}

var phaseIndex = func() map[string]int {
	m := map[string]int{}
	for i, p := range Phases {
		m[p] = i
	}
	return m
}()

const blankMarker = "___"

// gradedTypes are the step types that score the learner; a test needs at least one.
var gradedTypes = map[string]bool{
	"multiple_choice": true, "speed_quiz": true, "match_pairs": true, "fill_blanks": true,
	"word_order": true, "transformation": true, "translation": true, "dictation": true,
	"verb_cloze": true,
}

// validateLesson checks phase order/completeness and the content of each known step type.
// Tests (Kind == KindTest) skip the phase sequence but must contain graded exercises.
func validateLesson(l *Lesson) error {
	switch l.Kind {
	case "":
	case KindTest:
		return validateTest(l)
	default:
		return fmt.Errorf("unknown kind %q", l.Kind)
	}
	seen := make([]bool, len(Phases))
	last := -1
	for i, s := range l.Steps {
		where := fmt.Sprintf("step %d (%s)", i+1, s.Type)
		idx, ok := phaseIndex[s.Phase]
		if !ok {
			return fmt.Errorf("%s: unknown phase %q (want one of %s)", where, s.Phase, strings.Join(Phases, ", "))
		}
		if idx < last {
			return fmt.Errorf("%s: phase %q appears after %q", where, s.Phase, Phases[last])
		}
		last, seen[idx] = idx, true
		if err := validateStep(s); err != nil {
			return fmt.Errorf("%s: %w", where, err)
		}
	}
	var missing []string
	for i, ok := range seen {
		if !ok {
			missing = append(missing, Phases[i])
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing phases: %s", strings.Join(missing, ", "))
	}
	return nil
}

func validateTest(l *Lesson) error {
	graded := 0
	for i, s := range l.Steps {
		where := fmt.Sprintf("step %d (%s)", i+1, s.Type)
		if _, ok := phaseIndex[s.Phase]; !ok {
			return fmt.Errorf("%s: unknown phase %q", where, s.Phase)
		}
		if err := validateStep(s); err != nil {
			return fmt.Errorf("%s: %w", where, err)
		}
		if gradedTypes[s.Type] {
			graded++
		}
	}
	if graded == 0 {
		return fmt.Errorf("test needs at least one graded step")
	}
	return nil
}

type choiceItem struct {
	Question string   `json:"question"`
	Options  []string `json:"options"`
	Answer   *int     `json:"answer"`
}

func (c choiceItem) check() error {
	if c.Question == "" {
		return fmt.Errorf("missing question")
	}
	if len(c.Options) < 2 {
		return fmt.Errorf("needs at least 2 options")
	}
	if c.Answer == nil || *c.Answer < 0 || *c.Answer >= len(c.Options) {
		return fmt.Errorf("answer must be an option index 0..%d", len(c.Options)-1)
	}
	return nil
}

func validateStep(s Step) error {
	switch s.Type {
	case "audio_context":
		var c struct {
			Dialogue []struct{ Speaker, Text string } `json:"dialogue"`
			Passage  string                           `json:"passage"`
		}
		if err := json.Unmarshal(s.Content, &c); err != nil {
			return err
		}
		if len(c.Dialogue) == 0 && c.Passage == "" {
			return fmt.Errorf("needs dialogue or passage")
		}
	case "grammar_rule":
		var c struct {
			Title       string `json:"title"`
			Explanation string `json:"explanation"`
			Table       *struct {
				Headers []string   `json:"headers"`
				Rows    [][]string `json:"rows"`
			} `json:"table"`
		}
		if err := json.Unmarshal(s.Content, &c); err != nil {
			return err
		}
		if c.Title == "" || c.Explanation == "" {
			return fmt.Errorf("needs title and explanation")
		}
		if c.Table != nil {
			for i, r := range c.Table.Rows {
				if len(r) != len(c.Table.Headers) {
					return fmt.Errorf("table row %d has %d cells, want %d", i+1, len(r), len(c.Table.Headers))
				}
			}
		}
	case "vocabulary_table":
		var c struct {
			Items []VocabItem `json:"items"`
		}
		if err := json.Unmarshal(s.Content, &c); err != nil {
			return err
		}
		if len(c.Items) == 0 {
			return fmt.Errorf("needs items")
		}
		for i, it := range c.Items {
			if it.Term == "" || it.Translation == "" {
				return fmt.Errorf("item %d needs term and translation", i+1)
			}
		}
	case "multiple_choice":
		return eachItem[choiceItem](s.Content, choiceItem.check)
	case "speed_quiz":
		var c struct {
			TimeLimit int `json:"time_limit_seconds"`
		}
		if err := json.Unmarshal(s.Content, &c); err != nil {
			return err
		}
		if c.TimeLimit <= 0 {
			return fmt.Errorf("time_limit_seconds must be > 0")
		}
		return eachItem[choiceItem](s.Content, choiceItem.check)
	case "match_pairs":
		var c struct {
			Pairs []struct{ Left, Right string } `json:"pairs"`
		}
		if err := json.Unmarshal(s.Content, &c); err != nil {
			return err
		}
		if len(c.Pairs) < 2 {
			return fmt.Errorf("needs at least 2 pairs")
		}
		for i, p := range c.Pairs {
			if p.Left == "" || p.Right == "" {
				return fmt.Errorf("pair %d needs left and right", i+1)
			}
		}
	case "fill_blanks":
		return eachItem(s.Content, func(it struct {
			Sentence string     `json:"sentence"`
			Answers  [][]string `json:"answers"`
		}) error {
			n := strings.Count(it.Sentence, blankMarker)
			if n == 0 {
				return fmt.Errorf("sentence has no %s blank", blankMarker)
			}
			if n != len(it.Answers) {
				return fmt.Errorf("has %d blanks but %d answers", n, len(it.Answers))
			}
			for _, a := range it.Answers {
				if len(a) == 0 {
					return fmt.Errorf("every blank needs at least one accepted answer")
				}
			}
			return nil
		})
	case "verb_cloze":
		return validateVerbCloze(s.Content)
	case "word_order":
		return eachItem(s.Content, func(it struct {
			Answer string `json:"answer"`
		}) error {
			if len(strings.Fields(it.Answer)) < 2 {
				return fmt.Errorf("answer needs at least 2 words")
			}
			return nil
		})
	case "transformation", "translation":
		return eachItem(s.Content, func(it struct {
			Source  string   `json:"source"`
			Answers []string `json:"answers"`
		}) error {
			if it.Source == "" || len(it.Answers) == 0 {
				return fmt.Errorf("needs source and answers")
			}
			return nil
		})
	case "dictation", "speaking":
		return eachItem(s.Content, func(it struct {
			Text string `json:"text"`
		}) error {
			if it.Text == "" {
				return fmt.Errorf("needs text")
			}
			return nil
		})
	}
	// Unknown types are allowed: the frontend shows a fallback.
	return nil
}

// eachItem decodes content.items as []T and runs check on each item.
func eachItem[T any](raw json.RawMessage, check func(T) error) error {
	var c struct {
		Items []T `json:"items"`
	}
	if err := json.Unmarshal(raw, &c); err != nil {
		return err
	}
	if len(c.Items) == 0 {
		return fmt.Errorf("needs at least one item")
	}
	for i, it := range c.Items {
		if err := check(it); err != nil {
			return fmt.Errorf("item %d %w", i+1, err)
		}
	}
	return nil
}
