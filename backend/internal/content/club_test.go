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

func loadExams(t *testing.T, c *Catalog) *Exams {
	t.Helper()
	x, err := LoadExams("../../data/exams", c)
	if err != nil {
		t.Fatalf("load exams: %v", err)
	}
	return x
}

// game is an A2 game tied to unit a_bad_day: n paragraphs of k past simple blanks.
func game(n, k int) string {
	answers := strings.TrimSuffix(strings.Repeat(`["went"],`, k), ",")
	tags := strings.TrimSuffix(strings.Repeat(`"past_simple",`, k), ",")
	item := `{"text":"` + strings.Repeat("I ___ (go). ", k) + `","answers":[` + answers + `],"tags":[` + tags + `]}`
	items := strings.TrimSuffix(strings.Repeat(item+",", n), ",")
	return `{"id":"g","type":"verb_cloze","level":"A2","title":"G","minutes":5,"milestone":"unit","after_unit":"a_bad_day","content":{"items":[` + items + `]}}`
}

func TestLoadBundledClub(t *testing.T) {
	c, e := loadBundled(t)
	club, err := LoadClub("../../data/club", "../../data/lab_club", c, e, loadExams(t, c))
	if err != nil {
		t.Fatalf("load club: %v", err)
	}
	for _, a := range club.Activities {
		if a.Room == "" {
			t.Errorf("%s has no room", a.ID)
		}
		if a.Type == "verb_cloze" && len(a.Topics) == 0 {
			t.Errorf("game %s has no exam topics", a.ID)
		}
	}
}

func TestLoadClubMissingDirIsEmpty(t *testing.T) {
	c, e := loadBundled(t)
	club, err := LoadClub(filepath.Join(t.TempDir(), "nope"), "", c, e, nil)
	if err != nil || len(club.Activities) != 0 {
		t.Fatalf("got %v, %v", club, err)
	}
}

func words(n int) string { return strings.TrimSpace(strings.Repeat("word ", n)) }

func TestClubValidation(t *testing.T) {
	c, e := loadBundled(t)
	x := loadExams(t, c)
	q6 := strings.TrimSuffix(strings.Repeat(`{"question":"q","options":["a","b"],"answer":0},`, 6), ",")
	b1Reading := func(extra string) string {
		return `{"id":"r","type":"reading","level":"B1","title":"R","minutes":15,"milestone":"unit","after_unit":"galway_family","content":{"paragraphs":["` + words(1100) + `"],"questions":[` + q6 + `]` + extra + `}}`
	}
	practice := `{"title":"T","instructions":"I","items":[{"text":"` + strings.Repeat("It ___ (build). ", 6) + `","answers":[["was built"],["was built"],["was built"],["was built"],["was built"],["was built"]],"tags":["passive","passive","passive","passive","passive","passive"]}]}`
	q := `[{"question":"q","options":["a","b"],"answer":0},{"question":"q","options":["a","b"],"answer":1},{"question":"q","options":["a","b"],"answer":0}]`
	song := `{"channel":"Artist","end":20,"lines":[{"t":1,"text":"I ___ you","answers":[["love"]]},{"t":5,"text":"yeah"}]}`
	cases := []struct {
		name, doc, wantErr string
	}{
		{"song ok", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","youtube_id":"x","content":` + song + `}`, ""},
		{"song without video", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","content":` + song + `}`, "youtube_id"},
		{"song too long", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","youtube_id":"x","content":{"channel":"A","end":99,"lines":[` + strings.Repeat(`{"t":1,"text":"a ___","answers":[["b"]]},`, 16) + `{"t":2,"text":"c"}]}}`, "fragment"},
		{"song times out of order", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","youtube_id":"x","content":{"channel":"A","end":20,"lines":[{"t":5,"text":"a ___","answers":[["b"]]},{"t":1,"text":"c"}]}}`, "increasing"},
		{"blank count", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","youtube_id":"x","content":{"channel":"A","end":20,"lines":[{"t":1,"text":"a ___ ___","answers":[["b"]]},{"t":2,"text":"c"}]}}`, "2 blanks"},
		{"reading ok", `{"id":"r","type":"reading","level":"A1","title":"R","minutes":8,"milestone":"unit","content":{"paragraphs":["` + words(600) + `"],"glossary":{"word":"palabra"},"questions":` + q + `}}`, ""},
		{"reading too short", `{"id":"r","type":"reading","level":"A1","title":"R","minutes":8,"milestone":"unit","content":{"paragraphs":["` + words(100) + `"],"questions":` + q + `}}`, "100 words"},
		{"glossary not in text", `{"id":"r","type":"reading","level":"A1","title":"R","minutes":8,"milestone":"unit","content":{"paragraphs":["` + words(600) + `"],"glossary":{"cat":"gato"},"questions":` + q + `}}`, "glossary"},
		{"unknown expression", `{"id":"r","type":"reading","level":"A1","title":"R","minutes":8,"milestone":"unit","content":{"paragraphs":["` + words(600) + `"],"questions":` + q + `,"expressions":["phrasal:nope"]}}`, "nope"},
		{"song without channel", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","youtube_id":"x","content":{"end":20,"lines":[{"t":1,"text":"I ___ you","answers":[["love"]]},{"t":5,"text":"yeah"}]}}`, "channel"},
		{"song with lyric questions", `{"id":"s","type":"song","level":"A1","title":"S","minutes":4,"milestone":"unit","youtube_id":"x","content":{"channel":"A","end":20,"lines":[{"t":1,"text":"I ___ you","answers":[["love"]]},{"t":5,"text":"yeah"}],"questions":[{"question":"q","options":["a"],"answer":0}]}}`, "2 options"},
		{"video without license", `{"id":"v","type":"video","level":"B1","title":"V","minutes":12,"milestone":"checkpoint","youtube_id":"x","content":{"channel":"TED","source_url":"u","checkpoints":[{"t":10,"questions":` + q + `}]}}`, "license"},
		{"video with transcript", `{"id":"v","type":"video","level":"B1","title":"V","minutes":12,"milestone":"checkpoint","youtube_id":"x","content":{"channel":"TED","license":"CC","source_url":"u","transcript":[{"t":0,"text":"hi"}],"checkpoints":[{"t":10,"questions":` + q + `}]}}`, "transcript"},
		{"video without questions", `{"id":"v","type":"video","level":"B1","title":"V","minutes":12,"milestone":"checkpoint","youtube_id":"x","content":{"channel":"TED","license":"CC","source_url":"u"}}`, "checkpoints or final"},
		{"video ok", `{"id":"v","type":"video","level":"B1","title":"V","minutes":12,"milestone":"checkpoint","youtube_id":"x","content":{"channel":"TED","license":"CC","source_url":"u","checkpoints":[{"t":10,"questions":` + q + `}],"questions":` + q + `}}`, ""},
		{"video segment", `{"id":"v","type":"video","level":"B1","title":"V","minutes":12,"milestone":"checkpoint","youtube_id":"x","content":{"channel":"TED","license":"CC","source_url":"u","start":60,"end":600,"checkpoints":[{"t":120,"questions":` + q + `}]}}`, ""},
		{"checkpoint after segment end", `{"id":"v","type":"video","level":"B1","title":"V","minutes":12,"milestone":"checkpoint","youtube_id":"x","content":{"channel":"TED","license":"CC","source_url":"u","start":60,"end":600,"checkpoints":[{"t":700,"questions":` + q + `}]}}`, "after the end"},
		{"checkpoint before segment start", `{"id":"v","type":"video","level":"B1","title":"V","minutes":12,"milestone":"checkpoint","youtube_id":"x","content":{"channel":"TED","license":"CC","source_url":"u","start":60,"checkpoints":[{"t":30,"questions":` + q + `}]}}`, "increasing"},
		{"video only final questions", `{"id":"v","type":"video","level":"B1","title":"V","minutes":12,"milestone":"checkpoint","youtube_id":"x","content":{"channel":"TED","license":"CC","source_url":"u","questions":` + q + `}}`, ""},
		{"B1 reading without exam practice", b1Reading(""), "exam_practice parts"},
		{"B1 reading ok", b1Reading(`,"exam_practice":[` + practice + `,` + practice + `]`), ""},
		{"B1 reading with one part", b1Reading(`,"exam_practice":[` + practice + `]`), "exam_practice parts"},
		{"B1 reading with untagged practice", b1Reading(`,"exam_practice":[` + strings.Replace(practice, `"tags"`, `"x"`, 1) + `,` + practice + `]`), "tags"},
		{"game ok", game(6, 5), ""},
		{"game too short", game(2, 5), "paragraphs"},
		{"game with few blanks", game(6, 2), "blanks"},
		{"game without after_unit", strings.Replace(game(6, 5), `"after_unit":"a_bad_day"`, `"subtitle":"s"`, 1), "after_unit"},
		{"game without tags", strings.Replace(game(6, 5), `,"tags":["past_simple","past_simple","past_simple","past_simple","past_simple"]`, ``, 1), "tags"},
		{"game tag not in the exam", strings.Replace(game(6, 5), `"tags":["past_simple",`, `"tags":["nope",`, 1), "syllabus"},
		{"game tag taught later", strings.Replace(game(6, 5), `"tags":["past_simple",`, `"tags":["present_perfect",`, 1), "taught after"},
		{"bad milestone", `{"id":"g","type":"verb_cloze","level":"A2","title":"G","minutes":5,"milestone":"lesson","content":{"items":[{"text":"She ___ (go) home.","answers":[["went"]]}]}}`, "milestone"},
		{"vocabulary already taught", `{"id":"g","type":"verb_cloze","level":"A2","title":"G","minutes":5,"milestone":"unit","content":{"items":[{"text":"x ___","answers":[["y"]]}],"vocabulary":[{"term":"Umbrella","translation":"paraguas"}]}}`, "already taught"},
		{"after unknown unit", `{"id":"g","type":"verb_cloze","level":"A2","title":"G","minutes":5,"milestone":"unit","after_unit":"nope","content":{"items":[{"text":"x ___","answers":[["y"]]}]}}`, "after_unit"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			if err := os.WriteFile(filepath.Join(dir, "a.json"), []byte(tc.doc), 0o644); err != nil {
				t.Fatal(err)
			}
			_, err := LoadClub(dir, "", c, e, x)
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
	tests := 0
	for _, l := range unit.Lessons {
		if l.Kind == KindTest {
			tests++
		}
	}
	// One milestone per checkpoint in the unit, then the unit itself.
	if len(got) != tests+1 || got[len(got)-1].Key != "unit:"+unit.UnitID {
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
		Activity{ID: "lab-song", Level: "A1", Milestone: MilestoneUnit, Lab: true},
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

	// An activity tied to a later unit waits for it, even if nothing else is left.
	later := testClub(Activity{ID: "a1-park", Level: "A1", Milestone: MilestoneUnit, AfterUnit: "park", afterPos: 10})
	if got := later.Pick("user-1", Milestone{Key: "unit:home", Kind: MilestoneUnit, Level: "A1", UnitID: "home", Pos: 3}, none); got != "" {
		t.Errorf("activity for a later unit came early: %q", got)
	}
	if got := later.Pick("user-1", Milestone{Key: "exam:a1", Kind: MilestoneCheckpoint, Level: "A1", Pos: 12}, none); got != "a1-park" {
		t.Errorf("activity for an earlier unit should still come, got %q", got)
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
