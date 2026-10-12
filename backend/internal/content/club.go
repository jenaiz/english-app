package content

import (
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"io/fs"
	"math/rand"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// clubRooms maps each Club activity type to the room it is shown in.
var clubRooms = map[string]string{
	"song":       "music",
	"reading":    "library",
	"video":      "cinema",
	"verb_cloze": "games",
}

// Milestone kinds: finishing every lesson of a unit, or passing a checkpoint (a test lesson).
const (
	MilestoneUnit       = "unit"
	MilestoneCheckpoint = "checkpoint"
)

// readingWords is the accepted length of a reading per level, in words.
var readingWords = map[string][2]int{
	"A1": {500, 800}, "A2": {700, 1200}, "B1": {1000, 1800}, "B2": {1500, 2500}, "C1": {2000, 3000},
}

// maxSongLines keeps song exercises to a fragment (a verse or the chorus): lyrics are copyrighted.
const maxSongLines = 16

// Activity is one Club activity: a song, a reading, a video or a verb cloze. It is unlocked
// by a milestone of its level; Content is kept raw and its shape depends on Type.
type Activity struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	Room  string `json:"room"`
	Level string `json:"level"`
	Title string `json:"title"`
	// Subtitle is the artist, the speaker or a one-line teaser.
	Subtitle string `json:"subtitle,omitempty"`
	Minutes  int    `json:"minutes"`
	// YouTubeID is set for songs and videos; the cover is its thumbnail.
	YouTubeID string `json:"youtube_id,omitempty"`
	// Milestone is the kind of milestone that unlocks it (MilestoneUnit or MilestoneCheckpoint).
	Milestone string `json:"milestone"`
	// AfterUnit, if set, makes finishing that unit unlock this activity first (a theme match).
	AfterUnit string          `json:"after_unit,omitempty"`
	Content   json.RawMessage `json:"content"`
	// Lab activities are dev-only showcases (LAB_CLUB_DIR): always open, never picked by a milestone.
	Lab bool `json:"lab,omitempty"`
}

// Club is the catalog of activities, sorted by level and id.
type Club struct {
	Activities []Activity
	byID       map[string]*Activity
}

// LoadClub reads one activity per *.json file under dir (recursively); a missing dir is an
// empty Club. Units named in after_unit must exist in the catalog and expressions referenced
// by an activity in exprs. Activities under labDir (if set) are marked as Lab.
func LoadClub(dir, labDir string, catalog *Catalog, exprs *Expressions) (*Club, error) {
	c := &Club{byID: map[string]*Activity{}}
	if labDir != "" {
		if err := c.load(labDir, true, catalog, exprs); err != nil {
			return nil, err
		}
	}
	if err := c.load(dir, false, catalog, exprs); err != nil {
		return nil, err
	}
	sort.SliceStable(c.Activities, func(i, j int) bool {
		a, b := c.Activities[i], c.Activities[j]
		if rank(a.Level) != rank(b.Level) {
			return rank(a.Level) < rank(b.Level)
		}
		return a.ID < b.ID
	})
	// Index after sorting, which moves the activities.
	for i := range c.Activities {
		c.byID[c.Activities[i].ID] = &c.Activities[i]
	}
	return c, nil
}

func (c *Club) load(dir string, lab bool, catalog *Catalog, exprs *Expressions) error {
	var paths []string
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err == nil && !d.IsDir() && strings.HasSuffix(path, ".json") {
			paths = append(paths, path)
		}
		return err
	})
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	sort.Strings(paths)

	for _, p := range paths {
		name, _ := filepath.Rel(dir, p)
		data, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		var a Activity
		if err := json.Unmarshal(data, &a); err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
		if err := a.validate(catalog, exprs); err != nil {
			return fmt.Errorf("%s: %s: %w", name, a.ID, err)
		}
		if _, dup := c.byID[a.ID]; dup {
			return fmt.Errorf("%s: duplicate activity id %q", name, a.ID)
		}
		a.Lab = lab
		c.Activities = append(c.Activities, a)
		c.byID[a.ID] = &c.Activities[len(c.Activities)-1]
	}
	return nil
}

// Activity returns the activity with this id.
func (c *Club) Activity(id string) (*Activity, bool) {
	a, ok := c.byID[id]
	return a, ok
}

func (a *Activity) validate(catalog *Catalog, exprs *Expressions) error {
	if a.ID == "" || a.Title == "" {
		return fmt.Errorf("needs id and title")
	}
	room, ok := clubRooms[a.Type]
	if !ok {
		return fmt.Errorf("unknown type %q", a.Type)
	}
	a.Room = room
	if _, ok := readingWords[a.Level]; !ok {
		return fmt.Errorf("unknown level %q", a.Level)
	}
	if a.Minutes <= 0 {
		return fmt.Errorf("needs minutes")
	}
	if a.Milestone != MilestoneUnit && a.Milestone != MilestoneCheckpoint {
		return fmt.Errorf("milestone must be %q or %q", MilestoneUnit, MilestoneCheckpoint)
	}
	if a.AfterUnit != "" {
		ref, ok := catalog.Unit("", a.AfterUnit)
		if !ok {
			return fmt.Errorf("after_unit %q not found", a.AfterUnit)
		}
		if ref.LevelID != a.Level {
			return fmt.Errorf("after_unit %q is a %s unit, the activity is %s", a.AfterUnit, ref.LevelID, a.Level)
		}
	}
	if (a.Type == "song" || a.Type == "video") && a.YouTubeID == "" {
		return fmt.Errorf("needs youtube_id")
	}

	var extras struct {
		Vocabulary  []VocabItem `json:"vocabulary"`
		Expressions []string    `json:"expressions"`
	}
	if err := json.Unmarshal(a.Content, &extras); err != nil {
		return err
	}
	// Activities exist to widen vocabulary: their word list only has words the units don't teach.
	taught := catalog.taughtTerms()
	for i, v := range extras.Vocabulary {
		if v.Term == "" || v.Translation == "" {
			return fmt.Errorf("vocabulary %d needs term and translation", i+1)
		}
		if unit, ok := taught[strings.ToLower(v.Term)]; ok {
			return fmt.Errorf("vocabulary %q is already taught in unit %s: use a word the course doesn't teach", v.Term, unit)
		}
	}
	if err := exprs.checkItems(extras.Expressions); err != nil {
		return fmt.Errorf("expressions: %w", err)
	}

	switch a.Type {
	case "song":
		return validateSong(a.Content)
	case "reading":
		return validateReading(a.Content, a.Level)
	case "video":
		return validateVideo(a.Content)
	case "verb_cloze":
		return validateVerbCloze(a.Content)
	}
	return nil
}

type timedLine struct {
	T    *float64 `json:"t"`
	Text string   `json:"text"`
}

// checkTimes requires every line to have text and a time, in increasing order.
func checkTimes(lines []timedLine) error {
	last := -1.0
	for i, l := range lines {
		if l.Text == "" || l.T == nil {
			return fmt.Errorf("line %d needs t and text", i+1)
		}
		if *l.T < 0 || *l.T <= last {
			return fmt.Errorf("line %d: t must be increasing", i+1)
		}
		last = *l.T
	}
	return nil
}

func validateSong(raw json.RawMessage) error {
	var c struct {
		Channel string `json:"channel"`
		Lines   []struct {
			timedLine
			Answers [][]string `json:"answers"`
		} `json:"lines"`
		End       *float64     `json:"end"`
		Questions []choiceItem `json:"questions"`
	}
	if err := json.Unmarshal(raw, &c); err != nil {
		return err
	}
	if c.Channel == "" {
		return fmt.Errorf("needs channel: the official YouTube channel (artist or label) the video comes from")
	}
	if len(c.Lines) < 2 || len(c.Lines) > maxSongLines {
		return fmt.Errorf("needs 2 to %d lines (a fragment, not the whole lyrics)", maxSongLines)
	}
	if c.End == nil {
		return fmt.Errorf("needs end (seconds where the fragment ends)")
	}
	times := make([]timedLine, len(c.Lines))
	blanks := 0
	for i, l := range c.Lines {
		times[i] = l.timedLine
		if err := checkBlanks(l.Text, l.Answers); err != nil {
			return fmt.Errorf("line %d %w", i+1, err)
		}
		blanks += len(l.Answers)
	}
	if err := checkTimes(times); err != nil {
		return err
	}
	if *c.End <= *times[len(times)-1].T {
		return fmt.Errorf("end must come after the last line")
	}
	if blanks == 0 {
		return fmt.Errorf("needs at least one %s blank", blankMarker)
	}
	// Optional questions about the lyrics, asked once the blanks are checked.
	return checkQuestions(c.Questions, 0)
}

func validateReading(raw json.RawMessage, level string) error {
	var c struct {
		Paragraphs []string          `json:"paragraphs"`
		Glossary   map[string]string `json:"glossary"`
		Questions  []choiceItem      `json:"questions"`
	}
	if err := json.Unmarshal(raw, &c); err != nil {
		return err
	}
	words := 0
	for _, p := range c.Paragraphs {
		words += len(strings.Fields(p))
	}
	if r := readingWords[level]; words < r[0] || words > r[1] {
		return fmt.Errorf("has %d words, a %s reading needs %d-%d", words, level, r[0], r[1])
	}
	text := strings.ToLower(strings.Join(c.Paragraphs, " "))
	for w := range c.Glossary {
		if !strings.Contains(text, strings.ToLower(w)) {
			return fmt.Errorf("glossary word %q is not in the text", w)
		}
	}
	return checkQuestions(c.Questions, 3)
}

// validateVideo checks a talk or video. It has no transcript: talks (TED's included) don't
// allow publishing theirs, so the activity is the video plus our own questions, asked at
// pauses along the way (checkpoints) and/or at the end.
func validateVideo(raw json.RawMessage) error {
	var c struct {
		Channel     string          `json:"channel"`
		License     string          `json:"license"`
		SourceURL   string          `json:"source_url"`
		Start       float64         `json:"start"`
		End         *float64        `json:"end"`
		Transcript  json.RawMessage `json:"transcript"`
		Checkpoints []struct {
			T         *float64     `json:"t"`
			Questions []choiceItem `json:"questions"`
		} `json:"checkpoints"`
		Questions []choiceItem `json:"questions"`
	}
	if err := json.Unmarshal(raw, &c); err != nil {
		return err
	}
	if c.Channel == "" || c.License == "" || c.SourceURL == "" {
		return fmt.Errorf("needs channel, license and source_url (attribution)")
	}
	if c.Transcript != nil {
		return fmt.Errorf("must not include a transcript: talk transcripts can't be published")
	}
	if len(c.Checkpoints) == 0 && len(c.Questions) == 0 {
		return fmt.Errorf("needs checkpoints or final questions")
	}
	// start/end pick a segment of a long lecture.
	if c.End != nil && *c.End <= c.Start {
		return fmt.Errorf("end must come after start")
	}
	last := c.Start
	for i, cp := range c.Checkpoints {
		if cp.T == nil || *cp.T <= last {
			return fmt.Errorf("checkpoint %d: t must be increasing", i+1)
		}
		last = *cp.T
		if c.End != nil && *cp.T >= *c.End {
			return fmt.Errorf("checkpoint %d is after the end of the segment", i+1)
		}
		if err := checkQuestions(cp.Questions, 1); err != nil {
			return fmt.Errorf("checkpoint %d: %w", i+1, err)
		}
	}
	if err := checkQuestions(c.Questions, 0); err != nil {
		return fmt.Errorf("final %w", err)
	}
	return nil
}

// validateVerbCloze checks a verb_cloze: paragraphs with ___ blanks, the base verb in brackets
// after each one ("She ___ (go) home"), and the accepted answers for every blank.
func validateVerbCloze(raw json.RawMessage) error {
	return eachItem(raw, func(it struct {
		Text    string     `json:"text"`
		Answers [][]string `json:"answers"`
	}) error {
		return checkBlanks(it.Text, it.Answers)
	})
}

// checkBlanks requires one non-empty list of accepted answers per ___ in text.
func checkBlanks(text string, answers [][]string) error {
	if text == "" {
		return fmt.Errorf("needs text")
	}
	if n := strings.Count(text, blankMarker); n != len(answers) {
		return fmt.Errorf("has %d blanks but %d answers", n, len(answers))
	}
	for _, a := range answers {
		if len(a) == 0 {
			return fmt.Errorf("every blank needs at least one accepted answer")
		}
	}
	return nil
}

func checkQuestions(qs []choiceItem, min int) error {
	if len(qs) < min {
		return fmt.Errorf("needs at least %d questions", min)
	}
	for i, q := range qs {
		if err := q.check(); err != nil {
			return fmt.Errorf("question %d %w", i+1, err)
		}
	}
	return nil
}

// taughtTerms maps every term of a vocabulary_table in the course (lowercase) to its unit.
func (c *Catalog) taughtTerms() map[string]string {
	c.taughtOnce.Do(func() {
		c.taught = map[string]string{}
		for id := range c.lessonByID {
			for _, v := range c.Vocabulary(id) {
				c.taught[strings.ToLower(v.Term)] = c.lessonByID[id].Unit.UnitID
			}
		}
	})
	return c.taught
}

// Milestone is a step of the course that unlocks Club activities.
type Milestone struct {
	// Key identifies it per user: "unit:<unit_id>", "checkpoint:<lesson_id>" or "exam:<exam_id>".
	Key    string
	Kind   string
	Level  string
	UnitID string
}

// Milestones lists the milestones reached with these completed lessons, in course order.
func (c *Catalog) Milestones(done map[string]bool) []Milestone {
	var out []Milestone
	for _, l := range c.levels {
		for _, th := range l.Themes {
			for _, u := range th.Units {
				all := len(u.Lessons) > 0
				for _, ls := range u.Lessons {
					if !done[ls.LessonID] {
						all = false
						continue
					}
					if ls.Kind == KindTest {
						out = append(out, Milestone{Key: "checkpoint:" + ls.LessonID, Kind: MilestoneCheckpoint, Level: l.LevelID, UnitID: u.UnitID})
					}
				}
				if all {
					out = append(out, Milestone{Key: "unit:" + u.UnitID, Kind: MilestoneUnit, Level: l.LevelID, UnitID: u.UnitID})
				}
			}
		}
	}
	return out
}

// Pick chooses the activity a milestone unlocks for a user, or "" if there is none left.
// It prefers, in order: an activity tied to the milestone's unit, one of the milestone's kind
// and level, one of the same level, and then any other (lower levels, or tied to other units). Among equals the choice is a
// shuffle seeded by user and milestone, so every learner gets their own surprises but the
// same learner always gets the same one.
func (c *Club) Pick(userID string, m Milestone, unlocked map[string]bool) string {
	best, bestTier := []string{}, 5
	for _, a := range c.Activities {
		if a.Lab || unlocked[a.ID] || rank(a.Level) > rank(m.Level) {
			continue
		}
		// Activities tied to another unit wait for it, unless nothing else is left.
		tier := 3
		switch {
		case a.AfterUnit == m.UnitID && a.AfterUnit != "":
			tier = 0
		case a.AfterUnit != "":
		case a.Level == m.Level && a.Milestone == m.Kind:
			tier = 1
		case a.Level == m.Level:
			tier = 2
		}
		switch {
		case tier < bestTier:
			best, bestTier = []string{a.ID}, tier
		case tier == bestTier:
			best = append(best, a.ID)
		}
	}
	if len(best) == 0 {
		return ""
	}
	h := fnv.New64a()
	h.Write([]byte(userID + "|" + m.Key))
	return best[rand.New(rand.NewSource(int64(h.Sum64()))).Intn(len(best))]
}

// LockedHint tells a learner what unlocks more activities like this one.
func (c *Catalog) LockedHint(a *Activity) string {
	if a.AfterUnit != "" {
		if ref, ok := c.Unit("", a.AfterUnit); ok {
			return fmt.Sprintf("Termina la unidad «%s»", ref.Unit.Title)
		}
	}
	if a.Milestone == MilestoneCheckpoint {
		return "Supera un checkpoint de " + a.Level
	}
	return "Termina una unidad de " + a.Level
}
