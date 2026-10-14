package content

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Practice is the bank of grammar practice behind Repaso → Gramática: per topic, many short
// items in several formats (Grammar in Use style), so a point is drilled until it sticks rather
// than seen once in a lesson. Every sentence is our own; books are only a reference for which
// topics to cover and how to exercise them.
type Practice struct {
	Topics []*PracticeTopic
	byID   map[string]*PracticeTopic
}

// PracticeTopic is one grammar point to practise, e.g. "in / on / at (time)".
type PracticeTopic struct {
	TopicID string `json:"topic_id"`
	LevelID string `json:"level_id"`
	Title   string `json:"title"`
	// Tags are the level-exam syllabus topics it practises: a mistake in a unit item or an exam
	// question with one of them sends the learner here.
	Tags []string `json:"tags"`
	// Units teach the point; the topic opens once the learner has started one of them.
	Units []string `json:"units"`
	// Order sorts the topics that open with the same unit, in the order the unit teaches them.
	Order int `json:"order,omitempty"`
	// Rule is a grammar_rule content, shown above the exercises.
	Rule json.RawMessage `json:"rule"`
	Sets []PracticeSet   `json:"sets"`
}

// PracticeSet is a group of items of one exercise type with shared instructions. Items are
// kept raw (each exercise type has its own fields) apart from their stable id.
type PracticeSet struct {
	Type         string `json:"type"`
	Instructions string `json:"instructions"`
	// Bank is the word list shown above fill-in-the-blank items ("Complete with in, on or at").
	Bank []string `json:"bank,omitempty"`
	// Strict makes apostrophes count when checking typed answers (possessive 's, yours).
	Strict bool              `json:"strict,omitempty"`
	Items  []json.RawMessage `json:"items"`
	ids    []string
}

// PracticeItem is one item of a topic with what is needed to grade and serve it.
type PracticeItem struct {
	ID  string
	Set int
	Raw json.RawMessage
}

// practiceTypes are the exercise types a practice set can use.
var practiceTypes = map[string]bool{"fill_blanks": true, "multiple_choice": true, "transformation": true, "translation": true, "word_order": true}

// LoadPractice reads every <level>/<topic>.json under dir. A missing dir is an empty bank.
func LoadPractice(dir string, catalog *Catalog, exams *Exams) (*Practice, error) {
	p := &Practice{byID: map[string]*PracticeTopic{}}
	files, err := filepath.Glob(filepath.Join(dir, "*", "*.json"))
	if err != nil {
		return nil, err
	}
	sort.Strings(files)
	itemIDs := map[string]string{}
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			return nil, err
		}
		var t PracticeTopic
		if err := json.Unmarshal(raw, &t); err != nil {
			return nil, fmt.Errorf("%s: %w", f, err)
		}
		if err := t.validate(catalog, exams); err != nil {
			return nil, fmt.Errorf("%s: %w", f, err)
		}
		if _, dup := p.byID[t.TopicID]; dup {
			return nil, fmt.Errorf("%s: duplicate topic %q", f, t.TopicID)
		}
		for _, s := range t.Sets {
			for _, id := range s.ids {
				if other, dup := itemIDs[id]; dup {
					return nil, fmt.Errorf("%s: item id %q already used in %s", f, id, other)
				}
				itemIDs[id] = t.TopicID
			}
		}
		p.byID[t.TopicID] = &t
		p.Topics = append(p.Topics, &t)
	}
	// In course order: by level, then by the first unit that teaches each topic, then Order.
	firstPos := func(t *PracticeTopic) int {
		pos := 1 << 30
		for _, id := range t.Units {
			if ref, ok := catalog.Unit("", id); ok && ref.Pos < pos {
				pos = ref.Pos
			}
		}
		return pos
	}
	sort.SliceStable(p.Topics, func(i, j int) bool {
		a, b := p.Topics[i], p.Topics[j]
		if rank(a.LevelID) != rank(b.LevelID) {
			return rank(a.LevelID) < rank(b.LevelID)
		}
		if firstPos(a) != firstPos(b) {
			return firstPos(a) < firstPos(b)
		}
		return a.Order < b.Order
	})
	return p, nil
}

// Topic returns a topic by id.
func (p *Practice) Topic(id string) (*PracticeTopic, bool) {
	t, ok := p.byID[id]
	return t, ok
}

// ForTag returns the topics that practise a syllabus tag.
func (p *Practice) ForTag(tag string) []*PracticeTopic {
	var out []*PracticeTopic
	for _, t := range p.Topics {
		for _, tg := range t.Tags {
			if tg == tag {
				out = append(out, t)
				break
			}
		}
	}
	return out
}

// Levels returns the levels that have a practice bank.
func (p *Practice) Levels() map[string]bool {
	out := map[string]bool{}
	for _, t := range p.Topics {
		out[t.LevelID] = true
	}
	return out
}

// Items lists every item of the topic in set order.
func (t *PracticeTopic) Items() []PracticeItem {
	var out []PracticeItem
	for si, s := range t.Sets {
		for i, raw := range s.Items {
			out = append(out, PracticeItem{ID: s.ids[i], Set: si, Raw: raw})
		}
	}
	return out
}

// Answer returns the expected answer of an item, to show it next to a mistake.
func (it PracticeItem) Answer(t *PracticeTopic) string {
	switch t.Sets[it.Set].Type {
	case "fill_blanks":
		var v struct {
			Sentence string     `json:"sentence"`
			Answers  [][]string `json:"answers"`
		}
		_ = json.Unmarshal(it.Raw, &v)
		parts := strings.Split(v.Sentence, "___")
		var b strings.Builder
		for i, part := range parts {
			b.WriteString(part)
			if i < len(v.Answers) && len(v.Answers[i]) > 0 {
				b.WriteString(v.Answers[i][0])
			}
		}
		return b.String()
	case "multiple_choice":
		var v struct {
			Options []string `json:"options"`
			Answer  int      `json:"answer"`
		}
		_ = json.Unmarshal(it.Raw, &v)
		if v.Answer < len(v.Options) {
			return v.Options[v.Answer]
		}
	case "word_order":
		var v struct {
			Answer string `json:"answer"`
		}
		_ = json.Unmarshal(it.Raw, &v)
		return v.Answer
	case "transformation", "translation":
		var v struct {
			Answers []string `json:"answers"`
		}
		_ = json.Unmarshal(it.Raw, &v)
		if len(v.Answers) > 0 {
			return v.Answers[0]
		}
	}
	return ""
}

func (t *PracticeTopic) validate(catalog *Catalog, exams *Exams) error {
	if t.TopicID == "" || t.Title == "" || len(t.Tags) == 0 || len(t.Units) == 0 {
		return fmt.Errorf("topic needs topic_id, title, tags and units")
	}
	if _, ok := levelOrder[strings.ToUpper(t.LevelID)]; !ok {
		return fmt.Errorf("unknown level %q", t.LevelID)
	}
	known := map[string]bool{}
	for _, e := range exams.List {
		if rank(e.LevelID) <= rank(t.LevelID) {
			for _, s := range e.Syllabus {
				known[s.Tag] = true
			}
		}
	}
	for _, tag := range t.Tags {
		if !known[tag] {
			return fmt.Errorf("tag %q is not in the syllabus of %s or an earlier level", tag, t.LevelID)
		}
	}
	for _, id := range t.Units {
		ref, ok := catalog.Unit("", id)
		if !ok {
			return fmt.Errorf("unknown unit %q", id)
		}
		if rank(ref.LevelID) > rank(t.LevelID) {
			return fmt.Errorf("unit %q is above level %s", id, t.LevelID)
		}
	}
	var rule GrammarRuleCheck
	if err := json.Unmarshal(t.Rule, &rule); err != nil || rule.Title == "" || rule.Explanation == "" {
		return fmt.Errorf("rule needs title and explanation")
	}
	if len(t.Sets) == 0 {
		return fmt.Errorf("topic has no sets")
	}
	for si := range t.Sets {
		s := &t.Sets[si]
		if !practiceTypes[s.Type] {
			return fmt.Errorf("set %d: type %q can't be used for practice", si+1, s.Type)
		}
		if s.Instructions == "" || len(s.Items) == 0 {
			return fmt.Errorf("set %d: needs instructions and items", si+1)
		}
		for i, raw := range s.Items {
			id, err := checkPracticeItem(s.Type, raw)
			if err != nil {
				return fmt.Errorf("set %d item %d: %w", si+1, i+1, err)
			}
			if !strings.HasPrefix(id, t.TopicID+".") {
				return fmt.Errorf("set %d item %d: id %q must start with %q", si+1, i+1, id, t.TopicID+".")
			}
			s.ids = append(s.ids, id)
		}
	}
	return nil
}

// GrammarRuleCheck holds the fields a grammar rule must have.
type GrammarRuleCheck struct {
	Title       string `json:"title"`
	Explanation string `json:"explanation"`
}

// checkPracticeItem validates one item of a set and returns its id.
func checkPracticeItem(typ string, raw json.RawMessage) (string, error) {
	var it struct {
		ID       string          `json:"id"`
		Sentence string          `json:"sentence"`
		Question string          `json:"question"`
		Options  []string        `json:"options"`
		Source   string          `json:"source"`
		Answer   json.RawMessage `json:"answer"`
		Answers  json.RawMessage `json:"answers"`
	}
	if err := json.Unmarshal(raw, &it); err != nil {
		return "", err
	}
	if it.ID == "" {
		return "", fmt.Errorf("missing id")
	}
	nonEmpty := func(ss []string) bool {
		for _, s := range ss {
			if strings.TrimSpace(s) == "" {
				return false
			}
		}
		return len(ss) > 0
	}
	switch typ {
	case "fill_blanks":
		var answers [][]string
		if err := json.Unmarshal(it.Answers, &answers); err != nil {
			return "", fmt.Errorf("answers must be a list per blank")
		}
		if n := strings.Count(it.Sentence, "___"); n == 0 || n != len(answers) {
			return "", fmt.Errorf("%d blanks but %d answer lists", n, len(answers))
		}
		for _, a := range answers {
			if !nonEmpty(a) {
				return "", fmt.Errorf("empty answer")
			}
		}
	case "multiple_choice":
		var n int
		if err := json.Unmarshal(it.Answer, &n); err != nil || it.Question == "" || len(it.Options) < 2 || n < 0 || n >= len(it.Options) || !nonEmpty(it.Options) {
			return "", fmt.Errorf("needs question, 2+ options and the index of the answer")
		}
	case "transformation", "translation":
		var answers []string
		if err := json.Unmarshal(it.Answers, &answers); err != nil || it.Source == "" || !nonEmpty(answers) {
			return "", fmt.Errorf("needs source and answers")
		}
	case "word_order":
		var answer string
		if err := json.Unmarshal(it.Answer, &answer); err != nil || len(strings.Fields(answer)) < 2 {
			return "", fmt.Errorf("needs an answer of 2+ words")
		}
	}
	return it.ID, nil
}
