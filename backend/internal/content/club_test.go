package content

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func loadBundled(t *testing.T) (*Catalog, *Expressions) {
	t.Helper()
	c, err := Load("../../data/levels")
	if err != nil {
		t.Fatalf("load levels: %v", err)
	}
	e, err := LoadExpressions("../../data/expressions")
	if err != nil {
		t.Fatalf("load expressions: %v", err)
	}
	return c, e
}

func TestLoadBundledClub(t *testing.T) {
	c, e := loadBundled(t)
	club, err := LoadClub("../../data/club", c, e)
	if err != nil {
		t.Fatalf("load club: %v", err)
	}
	for _, a := range club.Activities {
		if a.Room == "" {
			t.Errorf("%s has no room", a.ID)
		}
	}
}

func TestLoadClubMissingDirIsEmpty(t *testing.T) {
	c, e := loadBundled(t)
	club, err := LoadClub(filepath.Join(t.TempDir(), "nope"), c, e)
	if err != nil || len(club.Activities) != 0 {
		t.Fatalf("got %v, %v", club, err)
	}
}

func words(n int) string { return strings.TrimSpace(strings.Repeat("word ", n)) }

func TestClubValidation(t *testing.T) {
	c, e := loadBundled(t)
	q := `[{"question":"q","options":["a","b"],"answer":0},{"question":"q","options":["a","b"],"answer":1},{"question":"q","options":["a","b"],"answer":0}]`
	song := `{"end":20,"lines":[{"t":1,"text":"I ___ you","answers":[["love"]]},{"t":5,"text":"yeah"}]}`
	cases := []struct {
		name, doc, wantErr string
	}{
		{"song ok", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","youtube_id":"x","content":` + song + `}`, ""},
		{"song without video", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","content":` + song + `}`, "youtube_id"},
		{"song too long", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","youtube_id":"x","content":{"end":99,"lines":[` + strings.Repeat(`{"t":1,"text":"a ___","answers":[["b"]]},`, 16) + `{"t":2,"text":"c"}]}}`, "fragment"},
		{"song times out of order", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","youtube_id":"x","content":{"end":20,"lines":[{"t":5,"text":"a ___","answers":[["b"]]},{"t":1,"text":"c"}]}}`, "increasing"},
		{"blank count", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","youtube_id":"x","content":{"end":20,"lines":[{"t":1,"text":"a ___ ___","answers":[["b"]]},{"t":2,"text":"c"}]}}`, "2 blanks"},
		{"reading ok", `{"id":"r","type":"reading","level":"A1","title":"R","minutes":8,"milestone":"unit","content":{"paragraphs":["` + words(600) + `"],"glossary":{"word":"palabra"},"questions":` + q + `}}`, ""},
		{"reading too short", `{"id":"r","type":"reading","level":"A1","title":"R","minutes":8,"milestone":"unit","content":{"paragraphs":["` + words(100) + `"],"questions":` + q + `}}`, "100 words"},
		{"glossary not in text", `{"id":"r","type":"reading","level":"A1","title":"R","minutes":8,"milestone":"unit","content":{"paragraphs":["` + words(600) + `"],"glossary":{"cat":"gato"},"questions":` + q + `}}`, "glossary"},
		{"unknown expression", `{"id":"r","type":"reading","level":"A1","title":"R","minutes":8,"milestone":"unit","content":{"paragraphs":["` + words(600) + `"],"questions":` + q + `,"expressions":["phrasal:nope"]}}`, "nope"},
		{"video without license", `{"id":"v","type":"video","level":"B1","title":"V","minutes":12,"milestone":"checkpoint","youtube_id":"x","content":{"source_url":"u","transcript":[{"t":0,"text":"hi"}],"checkpoints":[{"t":10,"questions":` + q + `}]}}`, "license"},
		{"video ok", `{"id":"v","type":"video","level":"B1","title":"V","minutes":12,"milestone":"checkpoint","youtube_id":"x","content":{"license":"CC","source_url":"u","transcript":[{"t":0,"text":"hi"}],"checkpoints":[{"t":10,"questions":` + q + `}]}}`, ""},
		{"verb cloze ok", `{"id":"g","type":"verb_cloze","level":"A2","title":"G","minutes":5,"milestone":"unit","content":{"items":[{"text":"She ___ (go) home.","answers":[["went"]]}]}}`, ""},
		{"bad milestone", `{"id":"g","type":"verb_cloze","level":"A2","title":"G","minutes":5,"milestone":"lesson","content":{"items":[{"text":"She ___ (go) home.","answers":[["went"]]}]}}`, "milestone"},
		{"after unknown unit", `{"id":"g","type":"verb_cloze","level":"A2","title":"G","minutes":5,"milestone":"unit","after_unit":"nope","content":{"items":[{"text":"x ___","answers":[["y"]]}]}}`, "after_unit"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			if err := os.WriteFile(filepath.Join(dir, "a.json"), []byte(tc.doc), 0o644); err != nil {
				t.Fatal(err)
			}
			_, err := LoadClub(dir, c, e)
			if tc.wantErr == "" && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tc.wantErr != "" && (err == nil || !strings.Contains(err.Error(), tc.wantErr)) {
				t.Fatalf("want error containing %q, got %v", tc.wantErr, err)
			}
		})
	}
}

func TestMilestones(t *testing.T) {
	c, _ := loadBundled(t)
	var unit *Unit
	var test *Lesson
	for _, ref := range c.Units() {
		for i, l := range ref.Unit.Lessons {
			if l.Kind == KindTest {
				unit, test = ref.Unit, &ref.Unit.Lessons[i]
			}
		}
		if unit != nil {
			break
		}
	}
	if unit == nil {
		t.Fatal("no unit with a checkpoint")
	}
	got := c.Milestones(map[string]bool{test.LessonID: true})
	if len(got) != 1 || got[0].Key != "checkpoint:"+test.LessonID || got[0].Kind != MilestoneCheckpoint {
		t.Fatalf("checkpoint only: %+v", got)
	}
	done := map[string]bool{}
	for _, l := range unit.Lessons {
		done[l.LessonID] = true
	}
	got = c.Milestones(done)
	if len(got) != 2 || got[1].Key != "unit:"+unit.UnitID {
		t.Fatalf("whole unit: %+v", got)
	}
}

func testClub(acts ...Activity) *Club {
	c := &Club{Activities: acts, byID: map[string]*Activity{}}
	for i := range c.Activities {
		c.byID[c.Activities[i].ID] = &c.Activities[i]
	}
	return c
}

func TestPick(t *testing.T) {
	club := testClub(
		Activity{ID: "a1-song-1", Level: "A1", Milestone: MilestoneUnit},
		Activity{ID: "a1-song-2", Level: "A1", Milestone: MilestoneUnit},
		Activity{ID: "a1-song-3", Level: "A1", Milestone: MilestoneUnit},
		Activity{ID: "a1-cafe", Level: "A1", Milestone: MilestoneUnit, AfterUnit: "cafe"},
		Activity{ID: "a1-video", Level: "A1", Milestone: MilestoneCheckpoint},
		Activity{ID: "a2-song", Level: "A2", Milestone: MilestoneUnit},
	)
	unit := Milestone{Key: "unit:home", Kind: MilestoneUnit, Level: "A1", UnitID: "home"}
	none := map[string]bool{}

	first := club.Pick("user-1", unit, none)
	if !strings.HasPrefix(first, "a1-song-") {
		t.Fatalf("unit milestone picked %q", first)
	}
	for i := 0; i < 5; i++ {
		if got := club.Pick("user-1", unit, none); got != first {
			t.Fatalf("not deterministic: %q then %q", first, got)
		}
	}
	seen := map[string]bool{}
	for _, u := range []string{"u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"} {
		seen[club.Pick(u, unit, none)] = true
	}
	if len(seen) < 2 {
		t.Errorf("every learner gets the same surprise: %v", seen)
	}

	if got := club.Pick("user-1", Milestone{Key: "unit:cafe", Kind: MilestoneUnit, Level: "A1", UnitID: "cafe"}, none); got != "a1-cafe" {
		t.Errorf("unit with its own activity picked %q", got)
	}
	if got := club.Pick("user-1", Milestone{Key: "checkpoint:t", Kind: MilestoneCheckpoint, Level: "A1"}, none); got != "a1-video" {
		t.Errorf("checkpoint picked %q", got)
	}
	// Checkpoint pool empty: fall back to the level's other activities, never a higher level.
	got := club.Pick("user-1", Milestone{Key: "checkpoint:t", Kind: MilestoneCheckpoint, Level: "A1"}, map[string]bool{"a1-video": true})
	if !strings.HasPrefix(got, "a1-song-") {
		t.Errorf("checkpoint fallback picked %q", got)
	}
	all := map[string]bool{"a1-song-1": true, "a1-song-2": true, "a1-song-3": true, "a1-video": true}
	if got := club.Pick("user-1", unit, all); got != "a1-cafe" {
		t.Errorf("last resort should be the activity tied to another unit, got %q", got)
	}
	all["a1-cafe"] = true
	if got := club.Pick("user-1", unit, all); got != "" {
		t.Errorf("A1 exhausted should pick nothing, got %q", got)
	}
}

func TestLockedHint(t *testing.T) {
	c, _ := loadBundled(t)
	var id, title string
	for uid, ref := range c.Units() {
		id, title = uid, ref.Unit.Title
		break
	}
	if h := c.LockedHint(&Activity{AfterUnit: id}); !strings.Contains(h, title) {
		t.Errorf("hint %q", h)
	}
	if h := c.LockedHint(&Activity{Level: "B1", Milestone: MilestoneCheckpoint}); h != "Supera un checkpoint de B1" {
		t.Errorf("hint %q", h)
	}
}

// The step type in units uses the same validation as the Club activity.
func TestVerbClozeStep(t *testing.T) {
	ok := Step{Type: "verb_cloze", Content: json.RawMessage(`{"items":[{"text":"I ___ (be) tired.","answers":[["am","'m"]]}]}`)}
	if err := validateStep(ok); err != nil {
		t.Fatal(err)
	}
	bad := Step{Type: "verb_cloze", Content: json.RawMessage(`{"items":[{"text":"I ___ (be) tired.","answers":[]}]}`)}
	if err := validateStep(bad); err == nil {
		t.Fatal("expected error")
	}
}
