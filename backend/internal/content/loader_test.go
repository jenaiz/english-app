package content

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

func TestLoadBundledContent(t *testing.T) {
	c, err := Load("../../data/levels")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	sums := c.Summaries()
	if len(sums) < 5 {
		t.Fatalf("expected at least 5 levels, got %d", len(sums))
	}
	if sums[0].LevelID != "A1" || sums[4].LevelID != "C1" {
		t.Errorf("levels not sorted: first=%s fifth=%s", sums[0].LevelID, sums[4].LevelID)
	}
	if g := sums[2].Themes[0].Units[0].Lessons[0].Grammar; len(g) == 0 {
		t.Error("expected grammar titles in B1 unit summary")
	}
	ref, ok := c.Unit("B1", "hotel_checkin")
	if !ok {
		t.Fatal("B1/hotel_checkin not found")
	}
	if len(ref.Unit.Lessons) == 0 || len(ref.Unit.Lessons[0].Steps) == 0 {
		t.Error("hotel_checkin has no lessons/steps")
	}
	if _, ok := c.Unit("A1", "hotel_checkin"); ok {
		t.Error("expected level mismatch to fail")
	}
}

func TestLoadRejectsDuplicateUnits(t *testing.T) {
	dir := t.TempDir()
	doc := `{"level_id":"%s","title":"x","themes":[{"theme_id":"t","title":"t","units":[{"unit_id":"same","title":"u","lessons":[]}]}]}`
	os.WriteFile(filepath.Join(dir, "a.json"), []byte(fmt.Sprintf(doc, "A1")), 0o644)
	os.WriteFile(filepath.Join(dir, "b.json"), []byte(fmt.Sprintf(doc, "A2")), 0o644)
	if _, err := Load(dir); err == nil {
		t.Fatal("expected duplicate unit_id error")
	}
}

func TestLoadMergesLevelFragments(t *testing.T) {
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, "a1"), 0o755)
	files := map[string]string{
		"a1/00_level.json": `{"level_id":"A1","title":"A1 Beginner","themes":[{"theme_id":"t1","title":"First"},{"theme_id":"t2","title":"Second"}]}`,
		"a1/02_u2.json":    `{"level_id":"A1","themes":[{"theme_id":"t2","units":[{"unit_id":"u2","title":"U2","lessons":[]}]}]}`,
		"a1/01_u1.json":    `{"level_id":"A1","themes":[{"theme_id":"t1","units":[{"unit_id":"u1","title":"U1","lessons":[]}]}]}`,
		"a1/03_u3.json":    `{"level_id":"A1","themes":[{"theme_id":"t1","units":[{"unit_id":"u3","title":"U3","lessons":[]}]}]}`,
	}
	for name, doc := range files {
		os.WriteFile(filepath.Join(dir, name), []byte(doc), 0o644)
	}
	c, err := Load(dir)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	sums := c.Summaries()
	if len(sums) != 1 || sums[0].Title != "A1 Beginner" || len(sums[0].Themes) != 2 {
		t.Fatalf("unexpected merge: %+v", sums)
	}
	var got []string
	for _, th := range sums[0].Themes {
		for _, u := range th.Units {
			got = append(got, th.ThemeID+"/"+u.UnitID)
		}
	}
	if fmt.Sprint(got) != "[t1/u1 t1/u3 t2/u2]" {
		t.Errorf("units out of order: %v", got)
	}
	if ref, ok := c.Unit("A1", "u3"); !ok || ref.ThemeID != "t1" {
		t.Errorf("u3 not indexed under t1: %+v", ref)
	}
}

func TestBundledSpeakersHaveVoices(t *testing.T) {
	c, err := Load("../../data/levels")
	if err != nil {
		t.Fatal(err)
	}
	v, err := LoadVoices("../../data/voices.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := c.CheckSpeakers(v); err != nil {
		t.Fatal(err)
	}
	a, _ := v.AudioFile("Daniel", " Hi! ")
	b, _ := v.AudioFile("Daniel", "Hi!")
	if c, _ := v.AudioFile("Sam", "Hi!"); a != b || a == c {
		t.Errorf("audio file names: %s %s %s", a, b, c)
	}
}
