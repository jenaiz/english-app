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

// readingMin is what a reading asks per level: comprehension questions and, from B1 on, exam
// practice parts (open cloze, word formation, transformations) with their blanks in total.
var readingMin = map[string]struct{ questions, parts, blanks int }{
	"A1": {3, 0, 0}, "A2": {3, 0, 0}, "B1": {6, 2, 12}, "B2": {7, 3, 15}, "C1": {8, 3, 18},
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
	// AfterUnit, if set, makes finishing that unit unlock this activity first (a theme match),
	// and the activity never unlocks before it. afterPos is that unit's course position.
	AfterUnit string `json:"after_unit,omitempty"`
	afterPos  int
	Content   json.RawMessage `json:"content"`
	// Topics are the level exam topics a game practises (see validateGame), for "what to review".
	Topics []ActivityTopic `json:"topics,omitempty"`
	// Lab activities are dev-only showcases (LAB_CLUB_DIR): always open, never picked by a milestone.
	Lab bool `json:"lab,omitempty"`
}

// Club is the catalog of activities, sorted by level and id.
type Club struct {
	Activities []Activity
	byID       map[string]*Activity
}

// LoadClub reads one activity per *.json file under dir (recursively); a missing dir is an
// empty Club. Units named in after_unit must exist in the catalog, expressions referenced
// by an activity in exprs, and the topics of a game in its level exam. Activities under labDir
// (if set) are marked as Lab.
func LoadClub(dir, labDir string, catalog *Catalog, exprs *Expressions, exams *Exams) (*Club, error) {
	c := &Club{byID: map[string]*Activity{}}
	if labDir != "" {
		if err := c.load(labDir, true, catalog, exprs, exams); err != nil {
			return nil, err
		}
	}
	if err := c.load(dir, false, catalog, exprs, exams); err != nil {
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

func (c *Club) load(dir string, lab bool, catalog *Catalog, exprs *Expressions, exams *Exams) error {
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
		if err := a.validate(catalog, exprs, exams); err != nil {
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

func (a *Activity) validate(catalog *Catalog, exprs *Expressions, exams *Exams) error {
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
		a.afterPos = ref.Pos
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
		return a.validateReading(catalog, exams)
	case "video":
		return validateVideo(a.Content)
	case "verb_cloze":
		return a.validateGame(catalog, exams)
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

func (a *Activity) validateReading(catalog *Catalog, exams *Exams) error {
	var c struct {
		Paragraphs   []string          `json:"paragraphs"`
		Glossary     map[string]string `json:"glossary"`
		Questions    []choiceItem      `json:"questions"`
		ExamPractice []struct {
			Title        string       `json:"title"`
			Instructions string       `json:"instructions"`
			Items        []taggedItem `json:"items"`
		} `json:"exam_practice"`
	}
	if err := json.Unmarshal(a.Content, &c); err != nil {
		return err
	}
	words := 0
	for _, p := range c.Paragraphs {
		words += len(strings.Fields(p))
	}
	if r := readingWords[a.Level]; words < r[0] || words > r[1] {
		return fmt.Errorf("has %d words, a %s reading needs %d-%d", words, a.Level, r[0], r[1])
	}
	text := strings.ToLower(strings.Join(c.Paragraphs, " "))
	for w := range c.Glossary {
		if !strings.Contains(text, strings.ToLower(w)) {
			return fmt.Errorf("glossary word %q is not in the text", w)
		}
	}
	min := readingMin[a.Level]
	if err := checkQuestions(c.Questions, min.questions); err != nil {
		return err
	}
	// From B1 on, a reading is also exam practice, in the official tests' formats.
	if min.parts == 0 && len(c.ExamPractice) == 0 {
		return nil
	}
	if len(c.ExamPractice) < min.parts {
		return fmt.Errorf("a %s reading needs at least %d exam_practice parts, has %d", a.Level, min.parts, len(c.ExamPractice))
	}
	blanks := 0
	for i, p := range c.ExamPractice {
		if p.Title == "" || p.Instructions == "" || len(p.Items) == 0 {
			return fmt.Errorf("exam_practice part %d needs title, instructions and items", i+1)
		}
		n, err := a.checkTagged(p.Items, catalog, exams)
		if err != nil {
			return fmt.Errorf("exam_practice part %d: %w", i+1, err)
		}
		blanks += n
	}
	if blanks < min.blanks {
		return fmt.Errorf("a %s reading needs at least %d exam_practice blanks, has %d", a.Level, min.blanks, blanks)
	}
	return nil
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

// gameMin is how much practice a Club game gives per level: paragraphs and blanks in total.
var gameMin = map[string]struct{ items, blanks int }{
	"A1": {5, 24}, "A2": {6, 30}, "B1": {6, 32}, "B2": {6, 32}, "C1": {6, 32},
}

// ActivityTopic is a level exam topic a game practises, with the units that teach it.
type ActivityTopic struct {
	Tag   string     `json:"tag"`
	Label string     `json:"label"`
	Units []UnitLink `json:"units"`
}

// taggedItem is a paragraph with ___ blanks, each tagged with a topic of the level exam.
type taggedItem struct {
	Text    string     `json:"text"`
	Answers [][]string `json:"answers"`
	Tags    []string   `json:"tags"`
}

// validateGame checks a Club game (a verb_cloze) as practice for the level exam: long enough
// to reinforce, and every blank tagged (see checkTagged).
func (a *Activity) validateGame(catalog *Catalog, exams *Exams) error {
	var c struct {
		Items []taggedItem `json:"items"`
	}
	if err := json.Unmarshal(a.Content, &c); err != nil {
		return err
	}
	min := gameMin[a.Level]
	if len(c.Items) < min.items {
		return fmt.Errorf("a %s game needs at least %d paragraphs, has %d", a.Level, min.items, len(c.Items))
	}
	blanks, err := a.checkTagged(c.Items, catalog, exams)
	if err != nil {
		return err
	}
	if blanks < min.blanks {
		return fmt.Errorf("a %s game needs at least %d blanks, has %d", a.Level, min.blanks, blanks)
	}
	return nil
}

// checkTagged checks blanks that practise the level exam: every one tagged with a topic of the
// exam syllabus, and the activity tied to a unit (after_unit) by which all of those topics have
// been taught. It adds the topics to a.Topics and returns how many blanks there are.
func (a *Activity) checkTagged(items []taggedItem, catalog *Catalog, exams *Exams) (int, error) {
	if a.AfterUnit == "" {
		return 0, fmt.Errorf("needs after_unit: the unit by which everything it practises has been taught")
	}
	var exam *Exam
	if exams != nil {
		exam, _ = exams.ForLevel(a.Level)
	}
	if exam == nil {
		return 0, fmt.Errorf("no %s exam to take the topics from", a.Level)
	}
	blanks := 0
	seen := map[string]bool{}
	for _, t := range a.Topics {
		seen[t.Tag] = true
	}
	for i, it := range items {
		if err := checkBlanks(it.Text, it.Answers); err != nil {
			return 0, fmt.Errorf("item %d %w", i+1, err)
		}
		if len(it.Tags) != len(it.Answers) {
			return 0, fmt.Errorf("item %d has %d blanks but %d tags", i+1, len(it.Answers), len(it.Tags))
		}
		blanks += len(it.Answers)
		for _, tag := range it.Tags {
			t, ok := exam.topics[tag]
			if !ok {
				return 0, fmt.Errorf("item %d: tag %q is not in the %s exam syllabus", i+1, tag, a.Level)
			}
			if seen[tag] {
				continue
			}
			seen[tag] = true
			taught := false
			for _, u := range t.Links {
				taught = taught || catalog.unitByID[u.UnitID].Pos <= a.afterPos
			}
			if !taught {
				return 0, fmt.Errorf("item %d: topic %q is taught after unit %s (in %s)", i+1, tag, a.AfterUnit, strings.Join(t.Units, ", "))
			}
			a.Topics = append(a.Topics, ActivityTopic{Tag: t.Tag, Label: t.Label, Units: t.Links})
		}
	}
	return blanks, nil
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
	// Pos is the course position of the unit reached (see UnitRef.Pos); a level exam has the
	// position of the level's last unit.
	Pos int
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
						out = append(out, Milestone{Key: "checkpoint:" + ls.LessonID, Kind: MilestoneCheckpoint, Level: l.LevelID, UnitID: u.UnitID, Pos: c.unitByID[u.UnitID].Pos})
					}
				}
				if all {
					out = append(out, Milestone{Key: "unit:" + u.UnitID, Kind: MilestoneUnit, Level: l.LevelID, UnitID: u.UnitID, Pos: c.unitByID[u.UnitID].Pos})
				}
			}
		}
	}
	return out
}

// Pick chooses the activity a milestone unlocks for a user, or "" if there is none left.
// It prefers, in order: an activity tied to the milestone's unit, one of the milestone's kind
// and level, one of the same level, and then any other (lower levels, or tied to earlier units).
// An activity tied to a unit never comes before that unit. Among equals the choice is a
// shuffle seeded by user and milestone, so every learner gets their own surprises but the
// same learner always gets the same one.
func (c *Club) Pick(userID string, m Milestone, unlocked map[string]bool) string {
	best, bestTier := []string{}, 5
	for _, a := range c.Activities {
		if a.Lab || unlocked[a.ID] || rank(a.Level) > rank(m.Level) || a.afterPos > m.Pos {
			continue
		}
		// Activities tied to an earlier unit missed it: they only come when nothing else is left.
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
		return "Supera un test de " + a.Level
	}
	return "Termina una unidad de " + a.Level
}
