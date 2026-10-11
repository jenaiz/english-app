package content

import (
	"slices"
	"testing"
)

func TestLoadIrregularVerbs(t *testing.T) {
	verbs, err := LoadIrregularVerbs("../../data/expressions")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	perLevel := map[string]int{}
	for _, v := range verbs {
		perLevel[v.Level]++
	}
	for _, lvl := range []string{"A1", "A2", "B1", "B2", "C1"} {
		if perLevel[lvl] == 0 {
			t.Errorf("no irregular verbs at %s", lvl)
		}
	}
	if verbs[0].ID != "be" || verbs[0].Past != "was/were" {
		t.Errorf("unexpected first verb: %+v", verbs[0])
	}
}

func TestVerbChoice(t *testing.T) {
	e, err := LoadExpressions("../../data/expressions")
	if err != nil {
		t.Fatal(err)
	}
	for _, v := range e.IrregularVerbs {
		for reps := 0; reps < ChoiceUntil; reps++ {
			c := e.VerbChoice(v.ID, reps, "seed-"+v.ID)
			if c == nil {
				t.Fatalf("%s reps %d: no choice", v.ID, reps)
			}
			seen := map[string]bool{}
			for _, o := range c.Options {
				if seen[o] {
					t.Errorf("%s %s: duplicate option %q in %v", v.ID, c.Type, o, c.Options)
				}
				seen[o] = true
			}
			if !seen[c.Answer] || len(c.Options) != 4 {
				t.Errorf("%s %s: answer %q, options %v", v.ID, c.Type, c.Answer, c.Options)
			}
		}
		if e.VerbChoice(v.ID, ChoiceUntil, "x") != nil {
			t.Errorf("%s: mature cards should be free recall", v.ID)
		}
	}
	c := e.VerbChoice("go", 0, "s")
	if c.Type != "verb_past" || c.Answer != "went" || !slices.Contains(c.Options, "goed") {
		t.Errorf("go: %+v", c)
	}
	if c := e.VerbChoice("go", 1, "s"); c.Type != "verb_gap" || c.Prompt != "We ___ to a pub near the river." {
		t.Errorf("go gap: %+v", c)
	}
}
