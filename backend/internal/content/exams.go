package content

import (
	"encoding/json"
	"fmt"
	"hash/fnv"
	"math/rand"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// A level exam certifies a CEFR level: a timed paper, separate from the units, with grammar,
// vocabulary, reading and listening sections, graded on the server. Every part has two or more
// equivalent variants (same number of items, same topics) so a retake is never the same paper.

// Exam item types.
const (
	ExamChoice = "choice" // pick one of Options; Answer is its index
	ExamGap    = "gap"    // type the word(s) for the single ___ in Prompt; Accept lists the answers
	ExamOrder  = "order"  // put the words of Accept[0] in order; any Accept entry is right
)

// minItemsPerTopic is how many items must test each syllabus topic, so one slip never decides it.
const minItemsPerTopic = 2

type Exam struct {
	ExamID      string `json:"exam_id"`
	LevelID     string `json:"level_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	// DurationMinutes is the time limit; answers saved after it (plus a short grace) are ignored.
	DurationMinutes int `json:"duration_minutes"`
	// PassScore is the minimum total (0-100, the mean of the section scores) and SectionMinScore
	// the minimum of every section: a strong grammar never hides a weak listening.
	PassScore       int `json:"pass_score"`
	SectionMinScore int `json:"section_min_score"`
	// RetakeHours is the wait between a submitted attempt and the next one.
	RetakeHours int `json:"retake_hours"`
	// MaxPlays is how many times each listening can be played, as in an official exam.
	MaxPlays int           `json:"max_plays"`
	Syllabus []ExamTopic   `json:"syllabus"`
	Sections []ExamSection `json:"sections"`
	topics   map[string]*ExamTopic
	parts    map[string]*ExamPart
}

// ExamTopic is one point of the level syllabus (CEFR inventory) and the units that teach it.
type ExamTopic struct {
	Tag   string     `json:"tag"`
	Label string     `json:"label"`
	Units []string   `json:"units"`
	Links []UnitLink `json:"-"`
}

// UnitLink points a learner to the unit to review for a topic.
type UnitLink struct {
	UnitID  string `json:"unit_id"`
	LevelID string `json:"level_id"`
	Title   string `json:"title"`
}

type ExamSection struct {
	SectionID string     `json:"section_id"`
	Title     string     `json:"title"`
	Parts     []ExamPart `json:"parts"`
}

type ExamPart struct {
	PartID       string        `json:"part_id"`
	Instructions string        `json:"instructions"`
	Variants     []ExamVariant `json:"variants"`
}

// ExamVariant is one version of a part: an optional reading text or listening dialogue and the
// items about it.
type ExamVariant struct {
	Title    string         `json:"title,omitempty"`
	Text     string         `json:"text,omitempty"`
	Dialogue []DialogueLine `json:"dialogue,omitempty"`
	Items    []ExamItem     `json:"items"`
}

type DialogueLine struct {
	Speaker string `json:"speaker"`
	Text    string `json:"text"`
}

type ExamItem struct {
	ID      string   `json:"id"`
	Type    string   `json:"type"`
	Prompt  string   `json:"prompt"`
	Options []string `json:"options,omitempty"`
	Answer  *int     `json:"answer,omitempty"`
	Accept  []string `json:"accept,omitempty"`
	Tag     string   `json:"tag"`
}

// Exams is the catalog of level exams, by exam id.
type Exams struct {
	List []*Exam
	byID map[string]*Exam
}

// LoadExams reads one exam per *.json file in dir; a missing dir means no exams. Topics must
// point to units of the catalog (see also CheckCoverage).
func LoadExams(dir string, catalog *Catalog) (*Exams, error) {
	out := &Exams{byID: map[string]*Exam{}}
	paths, err := filepath.Glob(filepath.Join(dir, "*.json"))
	if err != nil {
		return nil, err
	}
	sort.Strings(paths)
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err != nil {
			return nil, err
		}
		var e Exam
		dec := json.NewDecoder(strings.NewReader(string(data)))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&e); err != nil {
			return nil, fmt.Errorf("%s: %w", filepath.Base(p), err)
		}
		if err := e.validate(catalog); err != nil {
			return nil, fmt.Errorf("%s: %w", filepath.Base(p), err)
		}
		if _, dup := out.byID[e.ExamID]; dup {
			return nil, fmt.Errorf("%s: duplicate exam_id %q", filepath.Base(p), e.ExamID)
		}
		out.List = append(out.List, &e)
		out.byID[e.ExamID] = &e
	}
	sort.SliceStable(out.List, func(i, j int) bool { return rank(out.List[i].LevelID) < rank(out.List[j].LevelID) })
	return out, nil
}

// CheckCoverage fails if a unit of an exam's level is not covered by any syllabus topic: the
// exam must check everything the level teaches. It runs on the course content alone (tests,
// cmd/tts), not at server start, where dev-only lab units join the levels.
func (x *Exams) CheckCoverage(catalog *Catalog) error {
	for _, e := range x.List {
		covered := map[string]bool{}
		for _, t := range e.Syllabus {
			for _, id := range t.Units {
				covered[id] = true
			}
		}
		for _, th := range catalog.levelByID[e.LevelID].Themes {
			for _, u := range th.Units {
				if !covered[u.UnitID] {
					return fmt.Errorf("exam %s: unit %q is not covered by any syllabus topic", e.ExamID, u.UnitID)
				}
			}
		}
	}
	return nil
}

func (x *Exams) Exam(id string) (*Exam, bool) {
	e, ok := x.byID[id]
	return e, ok
}

// ForLevel returns the exam of a level, if it has one.
func (x *Exams) ForLevel(levelID string) (*Exam, bool) {
	for _, e := range x.List {
		if strings.EqualFold(e.LevelID, levelID) {
			return e, true
		}
	}
	return nil, false
}

// Lines returns every listening line of the exams, for TTS generation.
func (x *Exams) Lines() []Line {
	var out []Line
	for _, e := range x.List {
		for _, s := range e.Sections {
			for _, p := range s.Parts {
				for _, v := range p.Variants {
					for _, d := range v.Dialogue {
						out = append(out, Line{Speaker: d.Speaker, Text: d.Text})
					}
				}
			}
		}
	}
	return out
}

// CheckSpeakers fails if a listening uses a speaker without an assigned voice.
func (x *Exams) CheckSpeakers(v Voices) error {
	var missing []string
	seen := map[string]bool{}
	for _, l := range x.Lines() {
		if _, ok := v[l.Speaker]; !ok && !seen[l.Speaker] {
			seen[l.Speaker] = true
			missing = append(missing, l.Speaker)
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		return fmt.Errorf("exam speakers without a voice in voices.json: %s", strings.Join(missing, ", "))
	}
	return nil
}

func (e *Exam) validate(catalog *Catalog) error {
	switch {
	case e.ExamID == "" || e.LevelID == "" || e.Title == "":
		return fmt.Errorf("needs exam_id, level_id and title")
	case e.DurationMinutes <= 0:
		return fmt.Errorf("duration_minutes must be positive")
	case e.PassScore <= 0 || e.PassScore > 100 || e.SectionMinScore < 0 || e.SectionMinScore > e.PassScore:
		return fmt.Errorf("pass_score must be 1..100 and section_min_score 0..pass_score")
	case e.RetakeHours < 0 || e.MaxPlays < 1:
		return fmt.Errorf("retake_hours must be >= 0 and max_plays >= 1")
	case len(e.Sections) == 0:
		return fmt.Errorf("needs sections")
	}
	if _, ok := catalog.levelByID[e.LevelID]; !ok {
		return fmt.Errorf("unknown level %q", e.LevelID)
	}

	// Syllabus: unique tags and units of this level or below.
	e.topics = map[string]*ExamTopic{}
	for i := range e.Syllabus {
		t := &e.Syllabus[i]
		if t.Tag == "" || t.Label == "" || len(t.Units) == 0 {
			return fmt.Errorf("syllabus topic %d needs tag, label and units", i+1)
		}
		if _, dup := e.topics[t.Tag]; dup {
			return fmt.Errorf("duplicate syllabus tag %q", t.Tag)
		}
		e.topics[t.Tag] = t
		t.Links = nil
		for _, id := range t.Units {
			ref, ok := catalog.Unit("", id)
			if !ok {
				return fmt.Errorf("topic %q: unknown unit %q", t.Tag, id)
			}
			if rank(ref.LevelID) > rank(e.LevelID) {
				return fmt.Errorf("topic %q: unit %q is above level %s", t.Tag, id, e.LevelID)
			}
			t.Links = append(t.Links, UnitLink{UnitID: id, LevelID: ref.LevelID, Title: ref.Unit.Title})
		}
	}

	// Sections and parts: unique ids, equivalent variants, valid items.
	e.parts = map[string]*ExamPart{}
	sections := map[string]bool{}
	itemIDs := map[string]bool{}
	tested := map[string]int{}
	for si := range e.Sections {
		s := &e.Sections[si]
		if s.SectionID == "" || s.Title == "" || len(s.Parts) == 0 {
			return fmt.Errorf("section %d needs section_id, title and parts", si+1)
		}
		if sections[s.SectionID] {
			return fmt.Errorf("duplicate section_id %q", s.SectionID)
		}
		sections[s.SectionID] = true
		for pi := range s.Parts {
			p := &s.Parts[pi]
			where := fmt.Sprintf("section %s / part %s", s.SectionID, p.PartID)
			if p.PartID == "" || p.Instructions == "" {
				return fmt.Errorf("%s: needs part_id and instructions", where)
			}
			if _, dup := e.parts[p.PartID]; dup {
				return fmt.Errorf("duplicate part_id %q", p.PartID)
			}
			e.parts[p.PartID] = p
			if len(p.Variants) < 2 {
				return fmt.Errorf("%s: needs at least 2 variants so retakes differ", where)
			}
			var want string
			for vi, v := range p.Variants {
				vw := fmt.Sprintf("%s / variant %d", where, vi+1)
				if len(v.Items) == 0 {
					return fmt.Errorf("%s: needs items", vw)
				}
				if (v.Text != "") != (p.Variants[0].Text != "") || (len(v.Dialogue) > 0) != (len(p.Variants[0].Dialogue) > 0) {
					return fmt.Errorf("%s: every variant of a part needs the same kind of text or dialogue", vw)
				}
				for _, d := range v.Dialogue {
					if d.Speaker == "" || strings.TrimSpace(d.Text) == "" {
						return fmt.Errorf("%s: dialogue line needs speaker and text", vw)
					}
				}
				tags := make([]string, 0, len(v.Items))
				for _, it := range v.Items {
					if itemIDs[it.ID] {
						return fmt.Errorf("%s: duplicate item id %q", vw, it.ID)
					}
					itemIDs[it.ID] = true
					if err := it.check(); err != nil {
						return fmt.Errorf("%s / item %q: %w", vw, it.ID, err)
					}
					if _, ok := e.topics[it.Tag]; !ok {
						return fmt.Errorf("%s / item %q: unknown tag %q", vw, it.ID, it.Tag)
					}
					tags = append(tags, it.Tag)
					if vi == 0 {
						tested[it.Tag]++
					}
				}
				sort.Strings(tags)
				sig := strings.Join(tags, ",")
				if vi == 0 {
					want = sig
				} else if sig != want {
					return fmt.Errorf("%s: tests other topics than variant 1 (%s vs %s)", vw, sig, want)
				}
			}
		}
	}
	for _, t := range e.Syllabus {
		if tested[t.Tag] < minItemsPerTopic {
			return fmt.Errorf("topic %q is tested by %d items, want at least %d", t.Tag, tested[t.Tag], minItemsPerTopic)
		}
	}
	return nil
}

func (it ExamItem) check() error {
	if it.ID == "" || it.Prompt == "" && it.Type != ExamOrder {
		return fmt.Errorf("needs id and prompt")
	}
	switch it.Type {
	case ExamChoice:
		if len(it.Options) < 3 {
			return fmt.Errorf("needs at least 3 options")
		}
		seen := map[string]bool{}
		for _, o := range it.Options {
			if o == "" || seen[o] {
				return fmt.Errorf("options must be non-empty and different")
			}
			seen[o] = true
		}
		if it.Answer == nil || *it.Answer < 0 || *it.Answer >= len(it.Options) {
			return fmt.Errorf("answer must be an option index 0..%d", len(it.Options)-1)
		}
	case ExamGap:
		if strings.Count(it.Prompt, blankMarker) != 1 {
			return fmt.Errorf("prompt needs exactly one %s", blankMarker)
		}
		if len(it.Accept) == 0 {
			return fmt.Errorf("needs accepted answers")
		}
	case ExamOrder:
		if len(it.Accept) == 0 || len(strings.Fields(it.Accept[0])) < 3 {
			return fmt.Errorf("needs a sentence of at least 3 words in accept")
		}
		if err := checkQuestionMark(it.Accept[0]); err != nil {
			return err
		}
		words := sortedWords(it.Accept[0])
		for _, a := range it.Accept[1:] {
			if sortedWords(a) != words {
				return fmt.Errorf("accepted order %q uses other words than %q", a, it.Accept[0])
			}
		}
	default:
		return fmt.Errorf("unknown type %q", it.Type)
	}
	return nil
}

func sortedWords(s string) string {
	w := strings.Fields(NormalizeAnswer(s))
	sort.Strings(w)
	return strings.Join(w, " ")
}

// ---- Papers: what the learner sees, without answers ----

// Form is the variant of each part chosen for an attempt.
type Form map[string]int

// NextForm picks the variants for a new attempt: the one after the previous attempt's in every
// part (so a retake never repeats it), or random for a first attempt.
func (e *Exam) NextForm(prev Form, rnd *rand.Rand) Form {
	f := Form{}
	for _, s := range e.Sections {
		for _, p := range s.Parts {
			if v, ok := prev[p.PartID]; ok {
				f[p.PartID] = (v + 1) % len(p.Variants)
			} else {
				f[p.PartID] = rnd.Intn(len(p.Variants))
			}
		}
	}
	return f
}

func (e *Exam) variant(f Form, p *ExamPart) *ExamVariant {
	v := f[p.PartID]
	if v < 0 || v >= len(p.Variants) {
		v = 0
	}
	return &p.Variants[v]
}

type Paper struct {
	ExamID          string         `json:"exam_id"`
	LevelID         string         `json:"level_id"`
	Title           string         `json:"title"`
	DurationMinutes int            `json:"duration_minutes"`
	MaxPlays        int            `json:"max_plays"`
	Sections        []PaperSection `json:"sections"`
}

type PaperSection struct {
	SectionID string      `json:"section_id"`
	Title     string      `json:"title"`
	Parts     []PaperPart `json:"parts"`
}

// PaperPart shows a listening as the MP3 file of each line, never its text.
type PaperPart struct {
	PartID       string      `json:"part_id"`
	Instructions string      `json:"instructions"`
	Title        string      `json:"title,omitempty"`
	Text         string      `json:"text,omitempty"`
	Audio        []string    `json:"audio,omitempty"`
	Items        []PaperItem `json:"items"`
}

type PaperItem struct {
	ID      string   `json:"id"`
	Type    string   `json:"type"`
	Prompt  string   `json:"prompt,omitempty"`
	Options []string `json:"options,omitempty"`
	Words   []string `json:"words,omitempty"`
	// Ending is the final ? or ! of an order item, shown fixed after the sentence.
	Ending string `json:"ending,omitempty"`
}

// Paper builds the attempt's paper. Options and words are shuffled with the attempt's seed,
// so the order is stable when the learner reloads.
func (e *Exam) Paper(f Form, seed string, voices Voices) Paper {
	out := Paper{ExamID: e.ExamID, LevelID: e.LevelID, Title: e.Title, DurationMinutes: e.DurationMinutes, MaxPlays: e.MaxPlays}
	for _, s := range e.Sections {
		ps := PaperSection{SectionID: s.SectionID, Title: s.Title}
		for pi := range s.Parts {
			p := &s.Parts[pi]
			v := e.variant(f, p)
			pp := PaperPart{PartID: p.PartID, Instructions: p.Instructions, Title: v.Title, Text: v.Text}
			for _, d := range v.Dialogue {
				name, _ := voices.AudioFile(d.Speaker, d.Text)
				pp.Audio = append(pp.Audio, name)
			}
			for _, it := range v.Items {
				pi := PaperItem{ID: it.ID, Type: it.Type, Prompt: it.Prompt}
				rnd := seeded(seed, it.ID)
				switch it.Type {
				case ExamChoice:
					pi.Options = shuffled(rnd, it.Options[0], it.Options[1:])
				case ExamOrder:
					// Punctuation is dropped so it can't hint at the order (as in the lessons'
					// word_order); answers are compared normalized anyway.
					if e := strings.TrimSpace(it.Accept[0]); strings.HasSuffix(e, "?") || strings.HasSuffix(e, "!") {
						pi.Ending = e[len(e)-1:]
					}
					words := strings.Fields(it.Accept[0])
					for i, w := range words {
						words[i] = strings.TrimRight(w, ".,!?;:")
					}
					// Reshuffle until the words are out of order (they always can be: 3+ words).
					for i := 0; i < 10; i++ {
						pi.Words = shuffled(rnd, words[0], words[1:])
						if strings.Join(pi.Words, " ") != strings.Join(words, " ") {
							break
						}
					}
				}
				pp.Items = append(pp.Items, pi)
			}
			ps.Parts = append(ps.Parts, pp)
		}
		out.Sections = append(out.Sections, ps)
	}
	return out
}

func seeded(seed, id string) *rand.Rand {
	h := fnv.New64a()
	h.Write([]byte(seed + "|" + id))
	return rand.New(rand.NewSource(int64(h.Sum64())))
}

// ---- Grading ----

type ExamResult struct {
	Score    int            `json:"score"`
	Passed   bool           `json:"passed"`
	Sections []SectionScore `json:"sections"`
	Topics   []TopicScore   `json:"topics"`
	Review   []ReviewPart   `json:"review"`
}

type SectionScore struct {
	SectionID string `json:"section_id"`
	Title     string `json:"title"`
	Correct   int    `json:"correct"`
	Total     int    `json:"total"`
	Score     int    `json:"score"`
	Passed    bool   `json:"passed"`
}

type TopicScore struct {
	Tag     string     `json:"tag"`
	Label   string     `json:"label"`
	Correct int        `json:"correct"`
	Total   int        `json:"total"`
	Units   []UnitLink `json:"units"`
}

// ReviewPart is a part after grading: the text or the listening transcript, and every item with
// the learner's answer and the right one.
type ReviewPart struct {
	SectionID    string         `json:"section_id"`
	PartID       string         `json:"part_id"`
	Instructions string         `json:"instructions"`
	Title        string         `json:"title,omitempty"`
	Text         string         `json:"text,omitempty"`
	Dialogue     []DialogueLine `json:"dialogue,omitempty"`
	Items        []ReviewItem   `json:"items"`
}

type ReviewItem struct {
	ID       string   `json:"id"`
	Type     string   `json:"type"`
	Prompt   string   `json:"prompt,omitempty"`
	Options  []string `json:"options,omitempty"`
	Answer   string   `json:"answer"`
	Expected string   `json:"expected"`
	Correct  bool     `json:"correct"`
}

// Grade scores the answers (item id → the chosen option, the typed text or the ordered sentence).
// The total is the mean of the section scores, so each skill weighs the same.
func (e *Exam) Grade(f Form, answers map[string]string) ExamResult {
	res := ExamResult{Passed: true}
	topicCorrect, topicTotal := map[string]int{}, map[string]int{}
	sum := 0
	for _, s := range e.Sections {
		sc := SectionScore{SectionID: s.SectionID, Title: s.Title}
		for pi := range s.Parts {
			p := &s.Parts[pi]
			v := e.variant(f, p)
			rp := ReviewPart{SectionID: s.SectionID, PartID: p.PartID, Instructions: p.Instructions, Title: v.Title, Text: v.Text, Dialogue: v.Dialogue}
			for _, it := range v.Items {
				ans := answers[it.ID]
				ok := it.correct(ans)
				sc.Total++
				topicTotal[it.Tag]++
				if ok {
					sc.Correct++
					topicCorrect[it.Tag]++
				}
				rp.Items = append(rp.Items, ReviewItem{
					ID: it.ID, Type: it.Type, Prompt: it.Prompt, Options: it.Options,
					Answer: ans, Expected: it.expected(), Correct: ok,
				})
			}
			res.Review = append(res.Review, rp)
		}
		sc.Score = percent(sc.Correct, sc.Total)
		sc.Passed = sc.Score >= e.SectionMinScore
		if !sc.Passed {
			res.Passed = false
		}
		sum += sc.Score
		res.Sections = append(res.Sections, sc)
	}
	res.Score = (sum + len(e.Sections)/2) / len(e.Sections)
	if res.Score < e.PassScore {
		res.Passed = false
	}
	for _, t := range e.Syllabus {
		if topicTotal[t.Tag] == 0 {
			continue
		}
		res.Topics = append(res.Topics, TopicScore{Tag: t.Tag, Label: t.Label, Correct: topicCorrect[t.Tag], Total: topicTotal[t.Tag], Units: t.Links})
	}
	return res
}

func percent(n, total int) int {
	if total == 0 {
		return 0
	}
	return (n*100 + total/2) / total
}

func (it ExamItem) correct(ans string) bool {
	switch it.Type {
	case ExamChoice:
		return ans != "" && ans == it.Options[*it.Answer]
	case ExamGap, ExamOrder:
		return AnswerMatches(ans, it.Accept)
	}
	return false
}

func (it ExamItem) expected() string {
	if it.Type == ExamChoice {
		return it.Options[*it.Answer]
	}
	return it.Accept[0]
}

// HasItem reports whether id is an item of the attempt's form, to reject answers to other items.
func (e *Exam) HasItem(f Form, id string) bool {
	for _, s := range e.Sections {
		for pi := range s.Parts {
			for _, it := range e.variant(f, &s.Parts[pi]).Items {
				if it.ID == id {
					return true
				}
			}
		}
	}
	return false
}
