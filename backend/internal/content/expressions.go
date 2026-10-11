package content

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

// Expressions is the content of the Expresiones section: idioms, phrasal verbs and English hacks.
type Expressions struct {
	Idioms       []Idiom         `json:"idioms"`
	PhrasalVerbs []PhrasalFamily `json:"phrasal_verbs"`
	Hacks        []Hack          `json:"hacks"`
	Particles    []Particle      `json:"particles"`
	idiomByID    map[string]*Idiom
	phrasalByID  map[string]PhrasalRef
}

type Idiom struct {
	ID           string `json:"id"`
	Term         string `json:"term"`
	Level        string `json:"level"`
	Topic        string `json:"topic"`
	Register     string `json:"register"`
	Definition   string `json:"definition"`
	EquivalentES string `json:"equivalent_es"`
	LiteralES    string `json:"literal_es,omitempty"`
	Note         string `json:"note,omitempty"`
	// Similar lists idioms with nearly the same meaning, never offered as wrong options for this one.
	Similar  []string `json:"similar,omitempty"`
	Examples []string `json:"examples"`
	Image    string   `json:"image,omitempty"`
	// Situation is a short scenario where the idiom fits, for the "which idiom would you use?" exercise.
	Situation string `json:"situation,omitempty"`
	// Gap is a key word of the idiom and wrong alternatives, for the "complete the idiom" exercise.
	Gap *IdiomGap `json:"gap,omitempty"`
}

type IdiomGap struct {
	Word  string   `json:"word"`
	Wrong []string `json:"wrong"`
}

// PhrasalFamily groups the phrasal verbs that share a root verb ("look" → up, after, into…).
type PhrasalFamily struct {
	Root  string        `json:"root"`
	Items []PhrasalVerb `json:"items"`
}

type PhrasalVerb struct {
	ID          string `json:"id"`
	Particle    string `json:"particle"`
	Meaning     string `json:"meaning"`
	Translation string `json:"translation"`
	Level       string `json:"level"`
	Separable   bool   `json:"separable"`
	Example     string `json:"example"`
	// Also lists other particles that would also be correct in the example, never offered as wrong options.
	Also []string `json:"also,omitempty"`
	// Similar lists phrasal verbs with nearly the same meaning (by id), never offered as wrong options.
	Similar []string `json:"similar,omitempty"`
}

type PhrasalRef struct {
	Root string
	Verb *PhrasalVerb
}

// Term is the full phrasal verb, e.g. "look after".
func (r PhrasalRef) Term() string { return r.Root + " " + r.Verb.Particle }

// Particle explains the general idea a particle adds, for the "by particle" view of phrasal verbs.
// Multi-word particles ("up with", "out of") are grouped under their first word.
type Particle struct {
	Particle string `json:"particle"`
	Idea     string `json:"idea"`
	Note     string `json:"note,omitempty"`
}

type Hack struct {
	ID          string   `json:"id"`
	Level       string   `json:"level"`
	Title       string   `json:"title"`
	Formula     string   `json:"formula"`
	Explanation string   `json:"explanation"`
	Examples    []string `json:"examples"`
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slug(s string) string {
	return strings.Trim(slugRe.ReplaceAllString(strings.ToLower(s), "-"), "-")
}

// LoadExpressions reads idioms.json, phrasal_verbs.json and hacks.json from dir.
func LoadExpressions(dir string) (*Expressions, error) {
	e := &Expressions{idiomByID: map[string]*Idiom{}, phrasalByID: map[string]PhrasalRef{}}
	for name, dst := range map[string]any{"idioms.json": &e.Idioms, "phrasal_verbs.json": &e.PhrasalVerbs, "hacks.json": &e.Hacks, "particles.json": &e.Particles} {
		data, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(data, dst); err != nil {
			return nil, fmt.Errorf("%s: %w", name, err)
		}
	}
	if err := e.index(); err != nil {
		return nil, err
	}
	return e, nil
}

// index validates the content and builds the lookup maps. Phrasal verb IDs are derived from root and particle.
func (e *Expressions) index() error {
	for i := range e.Idioms {
		it := &e.Idioms[i]
		if it.ID == "" || it.Term == "" || it.Definition == "" || it.EquivalentES == "" {
			return fmt.Errorf("idioms.json: idiom %d (%q) needs id, term, definition and equivalent_es", i, it.Term)
		}
		if _, ok := levelOrder[it.Level]; !ok {
			return fmt.Errorf("idioms.json: %s has unknown level %q", it.ID, it.Level)
		}
		if _, dup := e.idiomByID[it.ID]; dup {
			return fmt.Errorf("idioms.json: duplicate id %q", it.ID)
		}
		e.idiomByID[it.ID] = it
	}
	for _, it := range e.Idioms {
		if it.Gap != nil {
			if _, ok := BlankParticle(it.Term, it.Gap.Word); !ok {
				return fmt.Errorf("idioms.json: %s gap word %q is not in %q", it.ID, it.Gap.Word, it.Term)
			}
			if len(it.Gap.Wrong) < 2 || slices.Contains(it.Gap.Wrong, it.Gap.Word) {
				return fmt.Errorf("idioms.json: %s gap needs at least two wrong words different from %q", it.ID, it.Gap.Word)
			}
		}
		for _, id := range it.Similar {
			if _, ok := e.idiomByID[id]; !ok {
				return fmt.Errorf("idioms.json: %s lists unknown similar idiom %q", it.ID, id)
			}
		}
	}
	roots := map[string]bool{}
	for fi := range e.PhrasalVerbs {
		f := &e.PhrasalVerbs[fi]
		if f.Root == "" || len(f.Items) == 0 {
			return fmt.Errorf("phrasal_verbs.json: family %d needs a root and items", fi)
		}
		if roots[f.Root] {
			return fmt.Errorf("phrasal_verbs.json: duplicate root %q", f.Root)
		}
		roots[f.Root] = true
		for ii := range f.Items {
			v := &f.Items[ii]
			if v.Particle == "" || v.Meaning == "" || v.Translation == "" {
				return fmt.Errorf("phrasal_verbs.json: %s item %d needs particle, meaning and translation", f.Root, ii)
			}
			if _, ok := levelOrder[v.Level]; !ok {
				return fmt.Errorf("phrasal_verbs.json: %s %s has unknown level %q", f.Root, v.Particle, v.Level)
			}
			v.ID = slug(f.Root + " " + v.Particle)
			if _, dup := e.phrasalByID[v.ID]; dup {
				return fmt.Errorf("phrasal_verbs.json: duplicate %s %s", f.Root, v.Particle)
			}
			e.phrasalByID[v.ID] = PhrasalRef{Root: f.Root, Verb: v}
		}
	}
	for id, ref := range e.phrasalByID {
		for _, other := range ref.Verb.Similar {
			if _, ok := e.phrasalByID[other]; !ok {
				return fmt.Errorf("phrasal_verbs.json: %s lists unknown similar phrasal verb %q", id, other)
			}
		}
	}
	particles := map[string]bool{}
	for i, p := range e.Particles {
		if p.Particle == "" || p.Idea == "" {
			return fmt.Errorf("particles.json: particle %d needs particle and idea", i)
		}
		if particles[p.Particle] {
			return fmt.Errorf("particles.json: duplicate particle %q", p.Particle)
		}
		particles[p.Particle] = true
	}
	ids := map[string]bool{}
	for i, h := range e.Hacks {
		if h.ID == "" || h.Formula == "" {
			return fmt.Errorf("hacks.json: hack %d needs id and formula", i)
		}
		if ids[h.ID] {
			return fmt.Errorf("hacks.json: duplicate id %q", h.ID)
		}
		ids[h.ID] = true
	}
	return nil
}

func (e *Expressions) Idiom(id string) (*Idiom, bool) {
	it, ok := e.idiomByID[id]
	return it, ok
}

func (e *Expressions) Phrasal(id string) (PhrasalRef, bool) {
	ref, ok := e.phrasalByID[id]
	return ref, ok
}
