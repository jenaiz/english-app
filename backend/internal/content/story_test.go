package content

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"
)

var (
	chapterUnitRe = regexp.MustCompile("^`unit: (\\w+(?:/\\w+)?)`$")
	dialogueRe    = regexp.MustCompile(`^\*\*(.+?):\*\* (.+)$`)
)

// TestStoryMatchesLessons checks that every chapter of the story book (docs/story/<level>.md)
// is the context of its unit, word for word, so the book and the lessons never drift apart.
func TestStoryMatchesLessons(t *testing.T) {
	c, err := Load("../../data/levels")
	if err != nil {
		t.Fatal(err)
	}
	books, _ := filepath.Glob("../../../docs/story/[a-c][1-2].md")
	if len(books) == 0 {
		t.Skip("story books not found")
	}
	for _, book := range books {
		for key, want := range parseChapters(t, book) {
			// A chapter is the context of a unit's first lesson, or of the lesson named in "unit/lesson".
			unitID, lessonID, _ := strings.Cut(key, "/")
			ref, ok := c.Unit("", unitID)
			if !ok || len(ref.Unit.Lessons) == 0 {
				t.Errorf("%s: unit %q not found", filepath.Base(book), unitID)
				continue
			}
			lesson := &ref.Unit.Lessons[0]
			if lessonID != "" {
				i := slices.IndexFunc(ref.Unit.Lessons, func(l Lesson) bool { return l.LessonID == lessonID })
				if i < 0 {
					t.Errorf("%s: lesson %q not found in unit %q", filepath.Base(book), lessonID, unitID)
					continue
				}
				lesson = &ref.Unit.Lessons[i]
			}
			var got []Line
			for _, s := range lesson.Steps {
				if s.Type != "audio_context" {
					continue
				}
				var ac struct {
					Dialogue []struct{ Speaker, Text string } `json:"dialogue"`
					Passage  string                           `json:"passage"`
				}
				json.Unmarshal(s.Content, &ac)
				if ac.Passage != "" {
					got = append(got, Line{NarratorSpeaker, ac.Passage})
				}
				for _, d := range ac.Dialogue {
					got = append(got, Line{d.Speaker, d.Text})
				}
			}
			if len(got) != len(want) {
				t.Errorf("%s: %s has %d lines, the book %d", filepath.Base(book), key, len(got), len(want))
				continue
			}
			for i := range want {
				if got[i] != want[i] {
					t.Errorf("%s: %s line %d: lesson %q, book %q", filepath.Base(book), key, i+1, got[i], want[i])
				}
			}
		}
	}
}

// parseChapters reads "## N. Title", "`unit: id`", "> scene" and "**Speaker:** text" lines.
func parseChapters(t *testing.T, path string) map[string][]Line {
	f, err := os.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	out := map[string][]Line{}
	var unit string
	var scene []string
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Text()
		if m := chapterUnitRe.FindStringSubmatch(line); m != nil {
			unit, scene = m[1], nil
			continue
		}
		if unit == "" {
			continue
		}
		if strings.HasPrefix(line, "> ") {
			scene = append(scene, line[2:])
			continue
		}
		if m := dialogueRe.FindStringSubmatch(line); m != nil {
			if len(out[unit]) == 0 && len(scene) > 0 {
				out[unit] = append(out[unit], Line{NarratorSpeaker, strings.Join(scene, " ")})
			}
			out[unit] = append(out[unit], Line{m[1], m[2]})
		}
	}
	return out
}

// completeLevels are the levels already rewritten around the story: 12 units each.
var completeLevels = []string{"A1", "A2", "B1", "B2", "C1"}

func TestLevelsAreComplete(t *testing.T) {
	c, err := Load("../../data/levels")
	if err != nil {
		t.Fatal(err)
	}
	exams, err := LoadExams("../../data/exams", c)
	if err != nil {
		t.Fatal(err)
	}
	for _, s := range c.Summaries() {
		if !slices.Contains(completeLevels, s.LevelID) {
			continue
		}
		units, tests := 0, 0
		for _, th := range s.Themes {
			for _, u := range th.Units {
				units++
				for _, l := range u.Lessons {
					if l.Kind == KindTest {
						tests++
					}
				}
			}
		}
		// 12 units and a checkpoint every 3 units. The level is certified by its level exam
		// (data/exams); levels without one yet keep the old final test lesson in unit 12.
		want := 4
		if _, ok := exams.ForLevel(s.LevelID); !ok {
			want = 5
		}
		if units != 12 || tests != want {
			t.Errorf("%s has %d units and %d tests, want 12 and %d", s.LevelID, units, tests, want)
		}
	}
}
