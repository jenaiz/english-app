package content

import "testing"

func TestStudyLevel(t *testing.T) {
	c, err := Load("../../data/levels")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	s, ok := c.Study("a1")
	if !ok {
		t.Fatal("A1 study sheet not found")
	}
	if s.LevelID != "A1" || len(s.Themes) == 0 {
		t.Fatalf("unexpected sheet: level=%s themes=%d", s.LevelID, len(s.Themes))
	}
	u := s.Themes[0].Units[0]
	if u.UnitID != "saying_hello" || len(u.Grammar) == 0 || len(u.Vocabulary) == 0 {
		t.Errorf("first unit: id=%s grammar=%d vocabulary=%d", u.UnitID, len(u.Grammar), len(u.Vocabulary))
	}
	if _, ok := c.Study("Z9"); ok {
		t.Error("expected unknown level to fail")
	}
}
