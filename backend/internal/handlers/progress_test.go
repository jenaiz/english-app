package handlers

import (
	"strings"
	"testing"

	"github.com/jenaiz/english-app/backend/internal/content"
	"github.com/jenaiz/english-app/backend/internal/store"
)

func TestValidResults(t *testing.T) {
	steps := []content.Step{{Type: "grammar_rule"}, {Type: "fill_blanks"}}
	ok := store.StepResult{Correct: 1, Total: 2, Items: []store.ItemOutcome{{I: 0, OK: true, Answer: "in"}, {I: 1, Answer: "on"}}}
	cases := []struct {
		name string
		res  map[string]store.StepResult
		want bool
	}{
		{"valid", map[string]store.StepResult{"1": ok}, true},
		{"no items (older clients)", map[string]store.StepResult{"1": {Correct: 1, Total: 2}}, true},
		{"step out of range", map[string]store.StepResult{"2": ok}, false},
		{"more correct than total", map[string]store.StepResult{"1": {Correct: 3, Total: 2}}, false},
		{"more items than total", map[string]store.StepResult{"1": {Total: 1, Items: ok.Items}}, false},
		{"item out of range", map[string]store.StepResult{"1": {Total: 2, Items: []store.ItemOutcome{{I: 2}}}}, false},
	}
	for _, c := range cases {
		if got := validResults(c.res, steps); got != c.want {
			t.Errorf("%s: got %v, want %v", c.name, got, c.want)
		}
	}
}

func TestValidResultsCutsLongAnswers(t *testing.T) {
	res := map[string]store.StepResult{"0": {Total: 1, Items: []store.ItemOutcome{{Answer: strings.Repeat("ñ", maxAnswer+5)}}}}
	if !validResults(res, []content.Step{{Type: "translation"}}) {
		t.Fatal("a long answer must not reject the results")
	}
	if n := len([]rune(res["0"].Items[0].Answer)); n != maxAnswer {
		t.Fatalf("answer cut to %d runes, want %d", n, maxAnswer)
	}
}

func TestAttemptSteps(t *testing.T) {
	steps := []content.Step{{Type: "grammar_rule"}, {Type: "fill_blanks"}, {Type: "translation"}}
	got := attemptSteps(map[string]store.StepResult{"2": {Total: 1}, "1": {Correct: 1, Total: 1}}, steps)
	if len(got) != 2 || got[0].Step != 1 || got[0].Type != "fill_blanks" || got[1].Step != 2 || got[1].Type != "translation" {
		t.Fatalf("got %+v", got)
	}
}
