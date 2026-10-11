package content

import (
	"hash/fnv"
	"math/rand"
	"regexp"
	"slices"
	"sort"
)

// Choice is a multiple-choice exercise for an expression card in Repaso.
// The exercise gets harder as the card matures; mature cards get none and use free recall.
type Choice struct {
	Type    string   `json:"type"`            // context | particle | phrasal | meaning | idiom | situation | complete
	Focus   string   `json:"focus,omitempty"` // expression the question is about, when the prompt is a sentence
	Prompt  string   `json:"prompt"`          // sentence with ___ (particle), English text or definition
	Hint    string   `json:"hint,omitempty"`  // Spanish meaning, to rule out other valid answers
	Options []string `json:"options"`
	Answer  string   `json:"answer"`
}

// Repetitions below which each exercise is used. From ChoiceUntil on, cards use free recall.
const (
	RecognitionUntil = 2
	ChoiceUntil      = 4
)

const gap = "___"

// fallbackParticles fills the options when a family has fewer than four particles.
var fallbackParticles = []string{"up", "out", "off", "on", "in", "down", "away", "back", "over", "into"}

// newRand is seeded with the card so the options don't change if the page is reloaded.
func newRand(seed string) *rand.Rand {
	h := fnv.New64a()
	h.Write([]byte(seed))
	return rand.New(rand.NewSource(int64(h.Sum64())))
}

// pickDistinct returns up to n values from pool that are not in exclude, in random order.
func pickDistinct(r *rand.Rand, pool []string, exclude map[string]bool, n int) []string {
	var out []string
	for _, i := range r.Perm(len(pool)) {
		if len(out) == n {
			break
		}
		if v := pool[i]; !exclude[v] {
			out = append(out, v)
			exclude[v] = true
		}
	}
	return out
}

func shuffled(r *rand.Rand, answer string, distractors []string) []string {
	opts := append([]string{answer}, distractors...)
	r.Shuffle(len(opts), func(i, j int) { opts[i], opts[j] = opts[j], opts[i] })
	return opts
}

// BlankParticle replaces the first whole-word occurrence of word (a particle, or a key word of an idiom) with ___.
func BlankParticle(example, particle string) (string, bool) {
	re := regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(particle) + `\b`)
	loc := re.FindStringIndex(example)
	if loc == nil {
		return "", false
	}
	return example[:loc[0]] + gap + example[loc[1]:], true
}

// PhrasalChoice builds the exercise for a phrasal verb card, or nil once the card is mature:
// its meaning in a sentence (0), the missing particle (1), the phrasal verb from its meaning (2–3).
func (e *Expressions) PhrasalChoice(id string, repetitions int, seed string) *Choice {
	ref, ok := e.phrasalByID[id]
	if !ok || repetitions >= ChoiceUntil {
		return nil
	}
	r := newRand(seed)
	switch repetitions {
	case 0:
		return e.phrasalContext(ref, r)
	case 1:
		if c := e.phrasalParticle(ref, r); c != nil {
			return c
		}
	}
	// Whole phrasal verb from its meaning. Distractors share the root or the particle.
	var close, rest []string
	for _, other := range e.phrasalByID {
		if other.Verb == ref.Verb || e.similarPhrasal(ref, other) {
			continue
		}
		if other.Root == ref.Root || other.Verb.Particle == ref.Verb.Particle {
			close = append(close, other.Term())
		} else {
			rest = append(rest, other.Term())
		}
	}
	sort.Strings(close) // map order is random; sorting keeps the options stable for a card
	sort.Strings(rest)
	exclude := map[string]bool{ref.Term(): true}
	d := pickDistinct(r, close, exclude, 3)
	d = append(d, pickDistinct(r, rest, exclude, 3-len(d))...)
	return &Choice{Type: "phrasal", Prompt: ref.Verb.Meaning, Hint: ref.Verb.Translation, Options: shuffled(r, ref.Term(), d), Answer: ref.Term()}
}

// phrasalContext asks what the phrasal verb means in its example. Distractors are meanings of the same verb first.
func (e *Expressions) phrasalContext(ref PhrasalRef, r *rand.Rand) *Choice {
	var same, rest []string
	for _, other := range e.phrasalByID {
		if other.Verb == ref.Verb || e.similarPhrasal(ref, other) {
			continue
		}
		if other.Root == ref.Root {
			same = append(same, other.Verb.Meaning)
		} else {
			rest = append(rest, other.Verb.Meaning)
		}
	}
	sort.Strings(same)
	sort.Strings(rest)
	exclude := map[string]bool{ref.Verb.Meaning: true}
	d := pickDistinct(r, same, exclude, 2)
	d = append(d, pickDistinct(r, rest, exclude, 2-len(d))...)
	return &Choice{Type: "context", Prompt: ref.Verb.Example, Focus: ref.Term(), Options: shuffled(r, ref.Verb.Meaning, d), Answer: ref.Verb.Meaning}
}

// phrasalParticle blanks the particle in the example. Distractors are other particles of the same verb,
// except those that would also be correct (Also) or that form a synonym.
func (e *Expressions) phrasalParticle(ref PhrasalRef, r *rand.Rand) *Choice {
	sentence, ok := BlankParticle(ref.Verb.Example, ref.Verb.Particle)
	if !ok {
		return nil
	}
	exclude := map[string]bool{ref.Verb.Particle: true}
	for _, p := range ref.Verb.Also {
		exclude[p] = true
	}
	var family []string
	for _, f := range e.PhrasalVerbs {
		if f.Root != ref.Root {
			continue
		}
		for i := range f.Items {
			if other := e.phrasalByID[f.Items[i].ID]; !e.similarPhrasal(ref, other) {
				family = append(family, f.Items[i].Particle)
			}
		}
	}
	d := pickDistinct(r, family, exclude, 3)
	d = append(d, pickDistinct(r, fallbackParticles, exclude, 3-len(d))...)
	return &Choice{Type: "particle", Prompt: sentence, Hint: ref.Verb.Translation, Options: shuffled(r, ref.Verb.Particle, d), Answer: ref.Verb.Particle}
}

// similarPhrasal reports whether either phrasal verb lists the other as a synonym.
func (e *Expressions) similarPhrasal(a, b PhrasalRef) bool {
	return slices.Contains(a.Verb.Similar, b.Verb.ID) || slices.Contains(b.Verb.Similar, a.Verb.ID)
}

// IdiomChoice builds the exercise for an idiom card, or nil once the card is mature:
// choose the meaning (0–1), which idiom fits a situation (2), complete the idiom (3).
// Idioms without a situation or gap fall back to choosing the idiom from its definition.
func (e *Expressions) IdiomChoice(id string, repetitions int, seed string) *Choice {
	it, ok := e.idiomByID[id]
	if !ok || repetitions >= ChoiceUntil {
		return nil
	}
	r := newRand(seed)
	var defs, terms []string
	for _, other := range e.Idioms {
		if other.ID != it.ID && !e.similarIdioms(it, &other) {
			defs = append(defs, other.Definition)
			terms = append(terms, other.Term)
		}
	}
	switch {
	case repetitions < RecognitionUntil:
		d := pickDistinct(r, defs, map[string]bool{it.Definition: true}, 2)
		return &Choice{Type: "meaning", Prompt: it.Term, Options: shuffled(r, it.Definition, d), Answer: it.Definition}
	case repetitions == RecognitionUntil && it.Situation != "":
		d := pickDistinct(r, terms, map[string]bool{it.Term: true}, 3)
		return &Choice{Type: "situation", Prompt: it.Situation, Options: shuffled(r, it.Term, d), Answer: it.Term}
	case it.Gap != nil:
		if prompt, ok := BlankParticle(it.Term, it.Gap.Word); ok {
			d := pickDistinct(r, it.Gap.Wrong, map[string]bool{it.Gap.Word: true}, 3)
			return &Choice{Type: "complete", Prompt: prompt, Hint: it.Definition, Options: shuffled(r, it.Gap.Word, d), Answer: it.Gap.Word}
		}
	}
	// No Spanish hint here: the equivalent often gives the idiom away.
	d := pickDistinct(r, terms, map[string]bool{it.Term: true}, 3)
	return &Choice{Type: "idiom", Prompt: it.Definition, Options: shuffled(r, it.Term, d), Answer: it.Term}
}

// similarIdioms reports whether either idiom lists the other as having nearly the same meaning.
func (e *Expressions) similarIdioms(a, b *Idiom) bool {
	return slices.Contains(a.Similar, b.ID) || slices.Contains(b.Similar, a.ID)
}
