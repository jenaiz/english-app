package content

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadBundledExpressions(t *testing.T) {
	e, err := LoadExpressions("../../data/expressions")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(e.Idioms) < 100 || len(e.PhrasalVerbs) < 30 || len(e.Hacks) == 0 {
		t.Errorf("unexpected sizes: %d idioms, %d families, %d hacks", len(e.Idioms), len(e.PhrasalVerbs), len(e.Hacks))
	}
	// The essentials shown by default stay a small part of the catalog.
	coreIdioms, corePhrasal := 0, 0
	for _, it := range e.Idioms {
		if it.Core {
			coreIdioms++
		}
	}
	for _, f := range e.PhrasalVerbs {
		for _, v := range f.Items {
			if v.Core {
				corePhrasal++
			}
		}
	}
	if coreIdioms < 30 || coreIdioms > 60 || corePhrasal < 30 || corePhrasal > 60 {
		t.Errorf("core sizes out of range: %d idioms, %d phrasal verbs", coreIdioms, corePhrasal)
	}
	if it, ok := e.Idiom("break-the-ice"); !ok || it.Term != "break the ice" {
		t.Error("break-the-ice not found")
	}
	ref, ok := e.Phrasal("look-forward-to")
	if !ok || ref.Term() != "look forward to" {
		t.Errorf("look-forward-to: ok=%v ref=%+v", ok, ref)
	}
	// Every particle used by a phrasal verb has an explanation for the "by particle" view.
	explained := map[string]bool{}
	for _, p := range e.Particles {
		explained[p.Particle] = true
	}
	for _, f := range e.PhrasalVerbs {
		for _, v := range f.Items {
			if main := strings.Fields(v.Particle)[0]; !explained[main] {
				t.Errorf("%s %s: particle %q has no entry in particles.json", f.Root, v.Particle, main)
			}
		}
	}
	if len(e.Packs) < 10 {
		t.Errorf("expected at least 10 packs, got %d", len(e.Packs))
	}
	if e.PhrasalVerbs[0].Items[0].ID == "" {
		t.Error("phrasal verb IDs must be filled in for the API")
	}
}

func TestLoadExpressionsRejectsBadContent(t *testing.T) {
	write := func(idioms, phrasal string) string {
		dir := t.TempDir()
		os.WriteFile(filepath.Join(dir, "idioms.json"), []byte(idioms), 0o644)
		os.WriteFile(filepath.Join(dir, "phrasal_verbs.json"), []byte(phrasal), 0o644)
		os.WriteFile(filepath.Join(dir, "hacks.json"), []byte(`[]`), 0o644)
		os.WriteFile(filepath.Join(dir, "particles.json"), []byte(`[]`), 0o644)
		os.WriteFile(filepath.Join(dir, "packs.json"), []byte(`[]`), 0o644)
		os.WriteFile(filepath.Join(dir, "unit_expressions.json"), []byte(`{}`), 0o644)
		return dir
	}
	idiom := `{"id":"x","term":"x","level":"B1","definition":"d","equivalent_es":"e"}`
	verb := `{"particle":"up","meaning":"m","translation":"t","level":"A2"}`
	cases := map[string]struct{ idioms, phrasal, want string }{
		"duplicate idiom":   {`[` + idiom + `,` + idiom + `]`, `[]`, "duplicate id"},
		"bad level":         {`[{"id":"x","term":"x","level":"Z9","definition":"d","equivalent_es":"e"}]`, `[]`, "unknown level"},
		"missing meaning":   {`[]`, `[{"root":"look","items":[{"particle":"up","level":"A2"}]}]`, "needs particle"},
		"gap not in term":   {`[{"id":"x","term":"break the ice","level":"B1","definition":"d","equivalent_es":"e","gap":{"word":"snow","wrong":["a","b"]}}]`, `[]`, "gap word"},
		"duplicate phrasal": {`[]`, `[{"root":"look","items":[` + verb + `,` + verb + `]}]`, "duplicate look up"},
	}
	for name, c := range cases {
		_, err := LoadExpressions(write(c.idioms, c.phrasal))
		if err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%s: got %v, want error containing %q", name, err, c.want)
		}
	}
}

// Every unit listed in unit_expressions.json exists, so a renamed unit doesn't silently lose its expressions.
func TestUnitExpressionsMatchUnits(t *testing.T) {
	e, err := LoadExpressions("../../data/expressions")
	if err != nil {
		t.Fatal(err)
	}
	c, err := Load("../../data/levels")
	if err != nil {
		t.Fatal(err)
	}
	for unit := range e.UnitExpressions {
		if _, ok := c.Unit("", unit); !ok {
			t.Errorf("unit_expressions.json lists unknown unit %q", unit)
		}
	}
}
