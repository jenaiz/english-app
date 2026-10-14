package content

import (
	"encoding/json"
	"strings"
	"testing"
)

// The levels with a practice bank tag every exercise item, so every mistake leads to practice
// (see docs/levels/README.md).
func TestCourseTags(t *testing.T) {
	c, x, p := loadBundledPractice(t)
	if err := x.CheckTags(c, p.Levels()); err != nil {
		t.Fatal(err)
	}
}

func TestItemTags(t *testing.T) {
	s := Step{Type: "fill_blanks", Content: json.RawMessage(`{"tag": "to_be", "items": [{}, {"tag": "questions"}, {"tag": ""}]}`)}
	if got := strings.Join(s.ItemTags(), ","); got != "to_be,questions," {
		t.Fatalf("item tags %q", got)
	}
	pairs := Step{Type: "match_pairs", Content: json.RawMessage(`{"tag": "vocab_food", "pairs": [{}, {}]}`)}
	if got := strings.Join(pairs.ItemTags(), ","); got != "vocab_food,vocab_food" {
		t.Fatalf("pair tags %q", got)
	}
}

func TestCheckStepTags(t *testing.T) {
	known := map[string]bool{"to_be": true}
	step := func(phase, typ, content string) Step {
		return Step{Phase: phase, Type: typ, Content: json.RawMessage(content)}
	}
	cases := []struct {
		name  string
		step  Step
		items bool
		ok    bool
	}{
		{"rule with tag", step("grammar", "grammar_rule", `{"tag": "to_be"}`), false, true},
		{"rule without tag", step("grammar", "grammar_rule", `{}`), false, false},
		{"rule with unknown tag", step("grammar", "grammar_rule", `{"tag": "passive"}`), false, false},
		{"untagged items, level without bank", step("practice", "fill_blanks", `{"items": [{}]}`), false, true},
		{"untagged items, level with bank", step("practice", "fill_blanks", `{"items": [{}]}`), true, false},
		{"step default covers items", step("practice", "fill_blanks", `{"tag": "to_be", "items": [{}]}`), true, true},
		{"unknown item tag", step("practice", "fill_blanks", `{"items": [{"tag": "passive"}]}`), false, false},
		{"comprehension question opts out", step("discovery", "multiple_choice", `{"tag": "to_be", "items": [{"tag": ""}]}`), true, true},
		{"practice item cannot opt out", step("practice", "fill_blanks", `{"tag": "to_be", "items": [{"tag": ""}]}`), true, false},
		{"speaking needs no tags", step("production", "speaking", `{"items": [{}]}`), true, true},
	}
	for _, c := range cases {
		err := checkStepTags(c.step, known, c.items, c.name)
		if (err == nil) != c.ok {
			t.Errorf("%s: got %v", c.name, err)
		}
	}
}
