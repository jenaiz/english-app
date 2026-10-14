package content

import (
	"encoding/json"
	"strings"
	"testing"
)

// A topic is only worth opening if it gives real practice: many items, several formats.
const (
	minPracticeItems   = 40
	minPracticeFormats = 3
)

func loadBundledPractice(t *testing.T) (*Catalog, *Exams, *Practice) {
	t.Helper()
	c, x, _ := loadBundledExams(t)
	p, err := LoadPractice("../../data/practice", c, x)
	if err != nil {
		t.Fatal(err)
	}
	return c, x, p
}

func TestBundledPractice(t *testing.T) {
	_, _, p := loadBundledPractice(t)
	if len(p.Topics) == 0 {
		t.Fatal("no practice topics")
	}
	for _, topic := range p.Topics {
		formats := map[string]bool{}
		for _, s := range topic.Sets {
			formats[s.Type] = true
		}
		if n := len(topic.Items()); n < minPracticeItems {
			t.Errorf("%s: %d items, want at least %d", topic.TopicID, n, minPracticeItems)
		}
		if len(formats) < minPracticeFormats {
			t.Errorf("%s: %d formats, want at least %d", topic.TopicID, len(formats), minPracticeFormats)
		}
		for _, it := range topic.Items() {
			if it.Answer(topic) == "" {
				t.Errorf("%s: no expected answer", it.ID)
			}
		}
	}
	if got := p.ForTag("time_prepositions"); len(got) == 0 {
		t.Error("no topic practises time_prepositions")
	}
}

// Topics are listed in course order: the unit that opens them, then the order the unit teaches them.
func TestPracticeOrder(t *testing.T) {
	_, _, p := loadBundledPractice(t)
	var got []string
	for _, topic := range p.Topics {
		if topic.LevelID == "A1" {
			got = append(got, topic.TopicID)
		}
	}
	want := []string{"a1_to_be", "a1_possessives", "a1_a_some_any", "a1_plurals", "a1_this_that", "a1_possessive_s",
		"a1_questions", "a1_in_on_at", "a1_there_is_are", "a1_how_much_many", "a1_present_simple", "a1_linking_words",
		"a1_present_simple_he_she", "a1_frequency_adverbs", "a1_a_an_the", "a1_place_imperatives", "a1_comparatives",
		"a1_like_ing", "a1_object_pronouns", "a1_can_could", "a1_present_continuous", "a1_simple_vs_continuous",
		"a1_going_to", "a1_was_were", "a1_past_simple"}
	if strings.Join(got, " ") != strings.Join(want, " ") {
		t.Errorf("A1 order:\n got %v\nwant %v", got, want)
	}
}

func TestPracticeAnswer(t *testing.T) {
	topic := &PracticeTopic{Sets: []PracticeSet{
		{Type: "fill_blanks"}, {Type: "multiple_choice"}, {Type: "translation"}, {Type: "word_order"},
	}}
	cases := []struct {
		set  int
		raw  string
		want string
	}{
		{0, `{"sentence": "See you ___ Monday ___ ten.", "answers": [["on"], ["at"]]}`, "See you on Monday at ten."},
		{1, `{"options": ["a", "an"], "answer": 1}`, "an"},
		{2, `{"answers": ["I'm busy", "I am busy"]}`, "I'm busy"},
		{3, `{"answer": "We have pizza on Fridays"}`, "We have pizza on Fridays"},
	}
	for _, c := range cases {
		if got := (PracticeItem{Set: c.set, Raw: json.RawMessage(c.raw)}).Answer(topic); got != c.want {
			t.Errorf("set %d: got %q, want %q", c.set, got, c.want)
		}
	}
}

func TestPracticeValidation(t *testing.T) {
	c, x, _ := loadBundledPractice(t)
	base := func() PracticeTopic {
		return PracticeTopic{
			TopicID: "a1_x", LevelID: "A1", Title: "X", Tags: []string{"time_prepositions"}, Units: []string{"first_day"},
			Rule: json.RawMessage(`{"title": "R", "explanation": "E"}`),
			Sets: []PracticeSet{{Type: "fill_blanks", Instructions: "Completa.", Items: []json.RawMessage{
				json.RawMessage(`{"id": "a1_x.1", "sentence": "At ___ ten.", "answers": [["at"]]}`),
			}}},
		}
	}
	if topic := base(); topic.validate(c, x) != nil {
		t.Fatalf("base topic must be valid: %v", topic.validate(c, x))
	}
	cases := []struct {
		name   string
		change func(*PracticeTopic)
		want   string
	}{
		{"tag of a later level", func(p *PracticeTopic) { p.Tags = []string{"passive"} }, "syllabus"},
		{"unit of a later level", func(p *PracticeTopic) { p.Units = []string{"airport_travel"} }, "above level"},
		{"rule without explanation", func(p *PracticeTopic) { p.Rule = json.RawMessage(`{"title": "R"}`) }, "rule"},
		{"unknown type", func(p *PracticeTopic) { p.Sets[0].Type = "speaking" }, "can't be used"},
		{"blanks and answers differ", func(p *PracticeTopic) {
			p.Sets[0].Items[0] = json.RawMessage(`{"id": "a1_x.1", "sentence": "___ ___", "answers": [["at"]]}`)
		}, "blanks"},
		{"id without topic prefix", func(p *PracticeTopic) {
			p.Sets[0].Items[0] = json.RawMessage(`{"id": "other.1", "sentence": "At ___.", "answers": [["at"]]}`)
		}, "must start"},
		{"choice answer out of range", func(p *PracticeTopic) {
			p.Sets[0] = PracticeSet{Type: "multiple_choice", Instructions: "Elige.", Items: []json.RawMessage{
				json.RawMessage(`{"id": "a1_x.1", "question": "Q", "options": ["a", "b"], "answer": 2}`),
			}}
		}, "options"},
	}
	for _, tc := range cases {
		topic := base()
		tc.change(&topic)
		err := topic.validate(c, x)
		if err == nil || !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%s: got %v, want an error with %q", tc.name, err, tc.want)
		}
	}
}

// A level with a practice bank covers its whole grammar syllabus: every grammar topic of its
// exam (vocabulary topics aside) has at least one practice topic, so any mistake leads somewhere.
func TestPracticeCoversSyllabus(t *testing.T) {
	_, x, p := loadBundledPractice(t)
	for level := range p.Levels() {
		e, ok := x.ForLevel(level)
		if !ok {
			t.Fatalf("no exam for %s", level)
		}
		for _, topic := range e.Syllabus {
			if strings.HasPrefix(topic.Tag, "vocab_") {
				continue
			}
			if len(p.ForTag(topic.Tag)) == 0 {
				t.Errorf("%s: syllabus topic %q (%s) has no practice topic", level, topic.Tag, topic.Label)
			}
		}
	}
}
