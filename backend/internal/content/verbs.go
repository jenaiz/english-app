package content

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
)

// IrregularVerb is one row of the irregular verbs table. Past and participle may list
// accepted variants separated by "/" ("learnt/learned").
type IrregularVerb struct {
	ID          string `json:"id"`
	Base        string `json:"base"`
	Past        string `json:"past"`
	Participle  string `json:"participle"`
	Translation string `json:"translation"`
	Level       string `json:"level"`
	// Example is a past simple sentence taken from the course story.
	Example string `json:"example"`
}

// LoadIrregularVerbs reads and validates irregular_verbs.json from dir.
func LoadIrregularVerbs(dir string) ([]IrregularVerb, error) {
	const name = "irregular_verbs.json"
	data, err := os.ReadFile(filepath.Join(dir, name))
	if err != nil {
		return nil, err
	}
	var verbs []IrregularVerb
	if err := json.Unmarshal(data, &verbs); err != nil {
		return nil, fmt.Errorf("%s: %w", name, err)
	}
	ids := map[string]bool{}
	for i, v := range verbs {
		if v.ID == "" || v.Base == "" || v.Past == "" || v.Participle == "" || v.Translation == "" {
			return nil, fmt.Errorf("%s: verb %d (%q) needs id, base, past, participle and translation", name, i, v.Base)
		}
		if _, ok := levelOrder[v.Level]; !ok {
			return nil, fmt.Errorf("%s: %s has unknown level %q", name, v.ID, v.Level)
		}
		if ids[v.ID] {
			return nil, fmt.Errorf("%s: duplicate id %q", name, v.ID)
		}
		ids[v.ID] = true
	}
	return verbs, nil
}

func (e *Expressions) Verb(id string) (*IrregularVerb, bool) {
	v, ok := e.verbByID[id]
	return v, ok
}

// Term shows the three forms, e.g. "go – went – gone".
func (v *IrregularVerb) Term() string { return v.Base + " – " + v.Past + " – " + v.Participle }

// VerbChoice builds the multiple-choice exercise of a young verb card: first the past form,
// then the past in the story example, then the participle. Older cards are free recall (nil).
func (e *Expressions) VerbChoice(id string, repetitions int, seed string) *Choice {
	v, ok := e.verbByID[id]
	if !ok || repetitions >= ChoiceUntil {
		return nil
	}
	r := newRand(seed)
	if repetitions == 1 {
		if c := e.verbGap(v, r); c != nil {
			return c
		}
	}
	if repetitions >= 2 && v.Participle != v.Past {
		return &Choice{Type: "verb_participle", Prompt: v.Base, Hint: v.Translation,
			Options: shuffled(r, v.Participle, e.verbDistractors(v, v.Participle, func(o *IrregularVerb) string { return o.Participle }, r)),
			Answer:  v.Participle}
	}
	return &Choice{Type: "verb_past", Prompt: v.Base, Hint: v.Translation,
		Options: shuffled(r, v.Past, e.verbDistractors(v, v.Past, func(o *IrregularVerb) string { return o.Past }, r)),
		Answer:  v.Past}
}

// verbGap blanks the past form in the example sentence: "Lucía ___ tired after the flight. (be)".
func (e *Expressions) verbGap(v *IrregularVerb, r *rand.Rand) *Choice {
	for _, form := range strings.Split(v.Past, "/") {
		if sentence, ok := BlankParticle(v.Example, form); ok {
			wrong := e.verbDistractors(v, form, func(o *IrregularVerb) string { return o.Past }, r)
			return &Choice{Type: "verb_gap", Prompt: sentence, Hint: v.Base + " (" + v.Translation + ")",
				Options: shuffled(r, form, wrong), Answer: form}
		}
	}
	return nil
}

// verbDistractors returns three wrong forms: the typical regularised mistake ("goed"),
// the other form of the same verb, and forms of other verbs of the same level.
func (e *Expressions) verbDistractors(v *IrregularVerb, answer string, form func(*IrregularVerb) string, r *rand.Rand) []string {
	exclude := map[string]bool{answer: true}
	for _, f := range strings.Split(v.Past+"/"+v.Participle, "/") {
		exclude[f] = true // never offer another valid variant ("learned") as wrong
	}
	var out []string
	add := func(s string) {
		if s != "" && !exclude[s] && len(out) < 3 {
			out = append(out, s)
			exclude[s] = true
		}
	}
	add(regularised(v.Base))
	if form(v) == v.Past && v.Participle != v.Past {
		// Asking for the past: the participle is a classic wrong pick (and vice versa).
		exclude[v.Participle] = false
		add(strings.Split(v.Participle, "/")[0])
	} else if v.Past != v.Participle {
		exclude[v.Past] = false
		add(strings.Split(v.Past, "/")[0])
	}
	var same []string
	for i := range e.IrregularVerbs {
		o := &e.IrregularVerbs[i]
		if o != v && o.Level == v.Level {
			same = append(same, strings.Split(form(o), "/")[0])
		}
	}
	out = append(out, pickDistinct(r, same, exclude, 3-len(out))...)
	return out
}

// regularised is the -ed form a learner would guess: go → goed, make → maked, buy → buyed.
func regularised(base string) string {
	if base == "be" || strings.Contains(base, " ") {
		return "" // "bed" is a real word, not a useful mistake
	}
	if strings.HasSuffix(base, "e") {
		return base + "d"
	}
	return base + "ed"
}
