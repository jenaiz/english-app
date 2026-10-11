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
