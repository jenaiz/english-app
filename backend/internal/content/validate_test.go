package content

import (
	"encoding/json"
	"strings"
	"testing"
)

func step(phase, typ, content string) Step {
	return Step{Phase: phase, Type: typ, Content: json.RawMessage(content)}
}

func fullLesson() *Lesson {
	return &Lesson{LessonID: "l", Steps: []Step{
		step("context", "audio_context", `{"passage":"Hi"}`),
		step("discovery", "multiple_choice", `{"items":[{"question":"q","options":["a","b"],"answer":1}]}`),
		step("grammar", "grammar_rule", `{"title":"t","explanation":"e"}`),
		step("practice", "fill_blanks", `{"items":[{"sentence":"I ___ here","answers":[["am"]]}]}`),
		step("production", "dictation", `{"items":[{"text":"hello"}]}`),
		step("vocabulary", "vocabulary_table", `{"items":[{"term":"a","translation":"b"}]}`),
		step("review", "speed_quiz", `{"time_limit_seconds":30,"items":[{"question":"q","options":["a","b"],"answer":0}]}`),
	}}
}

func TestValidateLesson(t *testing.T) {
	if err := validateLesson(fullLesson()); err != nil {
		t.Fatalf("valid lesson rejected: %v", err)
	}

	cases := []struct {
		name    string
		mutate  func(l *Lesson)
		wantErr string
	}{
		{"missing phase", func(l *Lesson) { l.Steps = l.Steps[:6] }, "missing phases: review"},
		{"unknown phase", func(l *Lesson) { l.Steps[0].Phase = "intro" }, "unknown phase"},
		{"out of order", func(l *Lesson) { l.Steps[0], l.Steps[1] = l.Steps[1], l.Steps[0] }, "appears after"},
		{"blank mismatch", func(l *Lesson) {
			l.Steps[3] = step("practice", "fill_blanks", `{"items":[{"sentence":"I ___ ___","answers":[["am"]]}]}`)
		}, "2 blanks but 1 answers"},
		{"answer out of range", func(l *Lesson) {
			l.Steps[1] = step("discovery", "multiple_choice", `{"items":[{"question":"q","options":["a","b"],"answer":2}]}`)
		}, "answer must be an option index"},
		{"quiz without time", func(l *Lesson) {
			l.Steps[6] = step("review", "speed_quiz", `{"items":[{"question":"q","options":["a","b"],"answer":0}]}`)
		}, "time_limit_seconds"},
		{"single pair", func(l *Lesson) {
			l.Steps[1] = step("discovery", "match_pairs", `{"pairs":[{"left":"a","right":"b"}]}`)
		}, "at least 2 pairs"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			l := fullLesson()
			tc.mutate(l)
			err := validateLesson(l)
			if err == nil || !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("got %v, want error containing %q", err, tc.wantErr)
			}
		})
	}
}

func TestValidateTest(t *testing.T) {
	ok := &Lesson{LessonID: "t", Kind: KindTest, Steps: []Step{
		step("review", "multiple_choice", `{"items":[{"question":"q","options":["a","b"],"answer":1}]}`),
		step("practice", "fill_blanks", `{"items":[{"sentence":"I ___ here","answers":[["am"]]}]}`),
	}}
	if err := validateLesson(ok); err != nil {
		t.Fatalf("valid test rejected: %v", err)
	}
	ungraded := &Lesson{LessonID: "t", Kind: KindTest, Steps: []Step{step("context", "audio_context", `{"passage":"Hi"}`)}}
	if err := validateLesson(ungraded); err == nil || !strings.Contains(err.Error(), "graded") {
		t.Fatalf("got %v, want graded-step error", err)
	}
	if err := validateLesson(&Lesson{LessonID: "x", Kind: "quiz"}); err == nil {
		t.Fatal("expected unknown kind error")
	}
}

func TestVocabulary(t *testing.T) {
	c, err := Load("../../data/levels")
	if err != nil {
		t.Fatal(err)
	}
	if v := c.Vocabulary("phrasal_verbs_hotel"); len(v) == 0 || v[0].Term != "Check in" {
		t.Fatalf("unexpected vocabulary: %+v", v)
	}
}
