package content

import (
	"encoding/json"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func loadBundledExams(t *testing.T) (*Catalog, *Exams, Voices) {
	t.Helper()
	c, err := Load("../../data/levels")
	if err != nil {
		t.Fatal(err)
	}
	x, err := LoadExams("../../data/exams", c)
	if err != nil {
		t.Fatalf("load exams: %v", err)
	}
	v, err := LoadVoices("../../data/voices.json")
	if err != nil {
		t.Fatal(err)
	}
	return c, x, v
}

func TestBundledExams(t *testing.T) {
	_, x, voices := loadBundledExams(t)
	if _, ok := x.ForLevel("A1"); !ok {
		t.Fatal("A1 has no level exam")
	}
	if err := x.CheckSpeakers(voices); err != nil {
		t.Fatal(err)
	}
	c, _ := Load("../../data/levels")
	if err := x.CheckCoverage(c); err != nil {
		t.Fatal(err)
	}
	// Every listening line has its MP3: run `go run ./cmd/tts` after editing a listening.
	for _, l := range x.Lines() {
		name, _ := voices.AudioFile(l.Speaker, l.Text)
		if _, err := os.Stat(filepath.Join("../../data/audio", name)); err != nil {
			t.Errorf("missing audio for %s: %q (run go run ./cmd/tts)", l.Speaker, l.Text)
		}
	}
}

// rightAnswers answers every item of a form correctly.
func rightAnswers(e *Exam, f Form) map[string]string {
	out := map[string]string{}
	for _, s := range e.Sections {
		for pi := range s.Parts {
			for _, it := range e.variant(f, &s.Parts[pi]).Items {
				out[it.ID] = it.expected()
			}
		}
	}
	return out
}

func TestExamGrading(t *testing.T) {
	_, x, _ := loadBundledExams(t)
	e, _ := x.ForLevel("A1")
	f := e.NextForm(nil, rand.New(rand.NewSource(1)))

	all := rightAnswers(e, f)
	if r := e.Grade(f, all); r.Score != 100 || !r.Passed {
		t.Errorf("all right: score %d passed %v, want 100 true", r.Score, r.Passed)
	}
	if r := e.Grade(f, map[string]string{}); r.Score != 0 || r.Passed {
		t.Errorf("nothing answered: score %d passed %v, want 0 false", r.Score, r.Passed)
	}

	// A perfect paper except the whole listening fails: every section has a minimum.
	noListening := map[string]string{}
	for id, a := range all {
		if !strings.HasPrefix(id, "l") {
			noListening[id] = a
		}
	}
	r := e.Grade(f, noListening)
	if r.Passed || r.Score < e.PassScore {
		t.Errorf("no listening: score %d passed %v, want a pass mark but a fail", r.Score, r.Passed)
	}
	for _, tp := range r.Topics {
		if len(tp.Units) == 0 {
			t.Errorf("topic %s has no units to review", tp.Tag)
		}
	}

	// Typed answers are normalized like in the lessons.
	for _, s := range e.Sections {
		for pi := range s.Parts {
			for _, it := range e.variant(f, &s.Parts[pi]).Items {
				if it.Type == ExamGap && !it.correct("  "+strings.ToUpper(it.Accept[0])+" ") {
					t.Errorf("%s: %q not accepted for %q", it.ID, strings.ToUpper(it.Accept[0]), it.Accept[0])
				}
			}
		}
	}
}

func TestExamRetakeChangesVariants(t *testing.T) {
	_, x, _ := loadBundledExams(t)
	e, _ := x.ForLevel("A1")
	first := e.NextForm(nil, rand.New(rand.NewSource(7)))
	second := e.NextForm(first, rand.New(rand.NewSource(7)))
	for part, v := range first {
		if second[part] == v {
			t.Errorf("part %s repeats variant %d on a retake", part, v)
		}
	}
}

func TestExamPaperHidesAnswers(t *testing.T) {
	_, x, voices := loadBundledExams(t)
	e, _ := x.ForLevel("A1")
	f := e.NextForm(nil, rand.New(rand.NewSource(3)))
	p := e.Paper(f, "attempt-1", voices)
	data, _ := json.Marshal(p)
	js := string(data)
	for _, key := range []string{`"answer"`, `"accept"`, `"tag"`, `"dialogue"`} {
		if strings.Contains(js, key) {
			t.Errorf("paper leaks %s", key)
		}
	}
	for _, l := range x.Lines() {
		if strings.Contains(js, l.Text) {
			t.Errorf("paper leaks listening line %q", l.Text)
		}
	}
	if again, _ := json.Marshal(e.Paper(f, "attempt-1", voices)); string(again) != js {
		t.Error("paper of the same attempt changes between loads")
	}
	for _, s := range p.Sections {
		for _, pp := range s.Parts {
			for _, it := range pp.Items {
				if it.Type == ExamOrder && len(it.Words) < 3 {
					t.Errorf("%s: order item without words", it.ID)
				}
				for _, w := range it.Words {
					if strings.ContainsAny(w, ".,!?;:") {
						t.Errorf("%s: word %q gives away the order", it.ID, w)
					}
				}
			}
		}
	}
}

func TestExamCoverage(t *testing.T) {
	c, x, _ := loadBundledExams(t)
	e, _ := x.ForLevel("A1")
	for i := range e.Syllabus {
		e.Syllabus[i].Units = []string{"saying_hello"}
	}
	if err := x.CheckCoverage(c); err == nil {
		t.Error("expected uncovered units to fail")
	}
}

func TestExamValidation(t *testing.T) {
	c, err := Load("../../data/levels")
	if err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile("../../data/exams/a1.json")
	if err != nil {
		t.Fatal(err)
	}
	cases := map[string]func(e *Exam){
		"unknown unit": func(e *Exam) { e.Syllabus[0].Units = []string{"nope"} },
		"one variant":  func(e *Exam) { p := &e.Sections[0].Parts[0]; p.Variants = p.Variants[:1] },
		"unknown tag":  func(e *Exam) { e.Sections[0].Parts[0].Variants[0].Items[0].Tag = "nope" },
		"variant topics": func(e *Exam) {
			v := &e.Sections[0].Parts[0].Variants[1]
			v.Items[0].Tag = v.Items[2].Tag
		},
		"duplicate id": func(e *Exam) {
			v := e.Sections[0].Parts[0].Variants
			v[1].Items[0].ID = v[0].Items[0].ID
		},
		"bad answer": func(e *Exam) { n := 5; e.Sections[0].Parts[0].Variants[0].Items[0].Answer = &n },
		"two blanks": func(e *Exam) { e.Sections[0].Parts[1].Variants[0].Items[0].Prompt = "___ and ___" },
		"order words": func(e *Exam) {
			it := &e.Sections[0].Parts[2].Variants[0].Items[0]
			it.Accept = append(it.Accept, "Something else entirely here")
		},
	}
	for name, mutate := range cases {
		var e Exam
		if err := json.Unmarshal(raw, &e); err != nil {
			t.Fatal(err)
		}
		mutate(&e)
		if err := e.validate(c); err == nil {
			t.Errorf("%s: expected a validation error", name)
		}
	}
}
