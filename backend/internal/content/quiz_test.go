package content

import (
	"fmt"
	"slices"
	"strings"
	"testing"
)

func TestBlankParticle(t *testing.T) {
	cases := []struct{ example, particle, want string }{
		{"I'm looking forward to the trip.", "forward to", "I'm looking ___ the trip."},
		{"If you don't know a word, look it up.", "up", "If you don't know a word, look it ___."},
		{"Come in and sit down.", "in", "Come ___ and sit down."},
	}
	for _, c := range cases {
		got, ok := BlankParticle(c.example, c.particle)
		if !ok || got != c.want {
			t.Errorf("BlankParticle(%q, %q) = %q, %v; want %q", c.example, c.particle, got, ok, c.want)
		}
	}
	if _, ok := BlankParticle("Turn it off.", "on"); ok {
		t.Error("expected no match for a particle that isn't in the sentence")
	}
}

// Every bundled phrasal verb must work in the "choose the particle" exercise.
func TestBundledExamplesContainParticle(t *testing.T) {
	e, err := LoadExpressions("../../data/expressions")
	if err != nil {
		t.Fatal(err)
	}
	for _, f := range e.PhrasalVerbs {
		for _, v := range f.Items {
			if _, ok := BlankParticle(v.Example, v.Particle); !ok {
				t.Errorf("%s %s: example %q doesn't contain the particle", f.Root, v.Particle, v.Example)
			}
		}
	}
}

func TestChoiceLadder(t *testing.T) {
	e, err := LoadExpressions("../../data/expressions")
	if err != nil {
		t.Fatal(err)
	}
	check := func(c *Choice, wantType string, wantOptions int) {
		t.Helper()
		if c == nil || c.Type != wantType {
			t.Fatalf("got %+v, want type %s", c, wantType)
		}
		if len(c.Options) != wantOptions || !slices.Contains(c.Options, c.Answer) {
			t.Errorf("%s: options %v must have %d entries including %q", wantType, c.Options, wantOptions, c.Answer)
		}
		seen := map[string]bool{}
		for _, o := range c.Options {
			if seen[o] {
				t.Errorf("%s: duplicate option %q", wantType, o)
			}
			seen[o] = true
		}
	}

	c := e.PhrasalChoice("look-after", 0, "seed")
	check(c, "context", 3)
	if c.Prompt != "Can you look after my dog this weekend?" || c.Focus != "look after" {
		t.Errorf("context exercise: %+v", c)
	}
	c = e.PhrasalChoice("look-after", 1, "seed")
	check(c, "particle", 4)
	if c.Prompt != "Can you look ___ my dog this weekend?" || c.Answer != "after" {
		t.Errorf("particle exercise: %+v", c)
	}
	check(e.PhrasalChoice("look-after", 2, "seed"), "phrasal", 4)
	if e.PhrasalChoice("look-after", ChoiceUntil, "seed") != nil {
		t.Error("mature phrasal cards should use free recall")
	}
	// Small families are completed with common particles.
	check(e.PhrasalChoice("pick-on", 1, "seed"), "particle", 4)

	// Particles that also fit the sentence, and synonyms, are never wrong options.
	for seed := range 30 {
		c := e.PhrasalChoice("throw-away", 1, fmt.Sprint(seed))
		if slices.Contains(c.Options, "out") {
			t.Fatalf("throw away offers 'out', which also fits: %v", c.Options)
		}
		c = e.PhrasalChoice("go-over", 1, fmt.Sprint(seed))
		if slices.Contains(c.Options, "through") {
			t.Fatalf("go over offers 'through', which also fits: %v", c.Options)
		}
		c = e.PhrasalChoice("go-on", 2, fmt.Sprint(seed))
		if slices.Contains(c.Options, "carry on") || slices.Contains(c.Options, "keep on") {
			t.Fatalf("go on offers a synonym: %v", c.Options)
		}
	}

	check(e.IdiomChoice("break-the-ice", 0, "seed"), "meaning", 3)
	check(e.IdiomChoice("break-the-ice", 2, "seed"), "situation", 4)
	c = e.IdiomChoice("break-the-ice", 3, "seed")
	check(c, "complete", 3)
	if c.Prompt != "break the ___" || c.Answer != "ice" {
		t.Errorf("complete exercise: %+v", c)
	}
	if e.IdiomChoice("break-the-ice", ChoiceUntil, "seed") != nil {
		t.Error("mature idiom cards should use free recall")
	}

	// Idioms with nearly the same meaning are never wrong options for each other.
	for seed := range 20 {
		for _, id := range []string{"spill-the-beans", "let-the-cat-out-of-the-bag"} {
			for _, reps := range []int{0, 2} {
				c := e.IdiomChoice(id, reps, fmt.Sprint(seed))
				for _, o := range c.Options {
					if o != c.Answer && (strings.Contains(o, "secret") || o == "spill the beans" || o == "let the cat out of the bag") {
						t.Fatalf("%s offers a similar idiom as a wrong option: %v", id, c.Options)
					}
				}
			}
		}
	}

	// Idioms without situation or gap fall back to choosing the idiom from its definition.
	e.idiomByID["break-the-ice"].Situation, e.idiomByID["break-the-ice"].Gap = "", nil
	check(e.IdiomChoice("break-the-ice", 2, "seed"), "idiom", 4)
	check(e.IdiomChoice("break-the-ice", 3, "seed"), "idiom", 4)

	a, b := e.PhrasalChoice("give-up", 2, "card-1"), e.PhrasalChoice("give-up", 2, "card-1")
	if !slices.Equal(a.Options, b.Options) {
		t.Error("options must be stable for the same card")
	}
}
