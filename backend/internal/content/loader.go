package content

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

var levelOrder = map[string]int{"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}

// Catalog is the in-memory, read-only content loaded at startup.
type Catalog struct {
	levels     []*Level
	levelByID  map[string]*Level
	unitByID   map[string]UnitRef
	lessonByID map[string]LessonRef
	// Vocabulary terms taught by the course, built on first use (see taughtTerms).
	taughtOnce sync.Once
	taught     map[string]string
}

// Load parses every *.json file under the given dirs (recursively, in path order, dir by dir)
// and validates IDs. Files sharing a level_id are merged, so a level can be split into one file
// per unit: themes are matched by theme_id (in order of first appearance) and their units appended.
func Load(dirs ...string) (*Catalog, error) {
	type file struct{ path, name string }
	var files []file
	for _, dir := range dirs {
		var paths []string
		err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
			if err == nil && !d.IsDir() && strings.HasSuffix(path, ".json") {
				paths = append(paths, path)
			}
			return err
		})
		if err != nil {
			return nil, err
		}
		sort.Strings(paths)
		for _, p := range paths {
			name, _ := filepath.Rel(dir, p)
			files = append(files, file{p, name})
		}
	}
	if len(files) == 0 {
		return nil, fmt.Errorf("no level files found in %s", strings.Join(dirs, ", "))
	}

	c := &Catalog{levelByID: map[string]*Level{}, unitByID: map[string]UnitRef{}, lessonByID: map[string]LessonRef{}}
	// Source file of each unit, for error messages.
	unitFile := map[string]string{}

	for _, f := range files {
		name := f.name
		data, err := os.ReadFile(f.path)
		if err != nil {
			return nil, err
		}
		var frag Level
		if err := json.Unmarshal(data, &frag); err != nil {
			return nil, fmt.Errorf("%s: %w", name, err)
		}
		if frag.LevelID == "" {
			return nil, fmt.Errorf("%s: missing level_id", name)
		}
		l, ok := c.levelByID[frag.LevelID]
		if !ok {
			l = &Level{LevelID: frag.LevelID}
			c.levels = append(c.levels, l)
			c.levelByID[l.LevelID] = l
		}
		if l.Title == "" {
			l.Title = frag.Title
		}
		if l.Description == "" {
			l.Description = frag.Description
		}
		for _, th := range frag.Themes {
			if th.ThemeID == "" {
				return nil, fmt.Errorf("%s: theme without theme_id", name)
			}
			dst := themeOf(l, th.ThemeID)
			if dst.Title == "" {
				dst.Title = th.Title
			}
			for _, u := range th.Units {
				unitFile[u.UnitID] = name
			}
			dst.Units = append(dst.Units, th.Units...)
		}
	}

	// Index only after merging: appends above may move the slices.
	for _, l := range c.levels {
		for ti := range l.Themes {
			th := &l.Themes[ti]
			for ui := range th.Units {
				u := &th.Units[ui]
				name := unitFile[u.UnitID]
				if u.UnitID == "" {
					return nil, fmt.Errorf("%s: unit without unit_id in theme %q", l.LevelID, th.ThemeID)
				}
				if _, dup := c.unitByID[u.UnitID]; dup {
					return nil, fmt.Errorf("%s: duplicate unit_id %q", name, u.UnitID)
				}
				c.unitByID[u.UnitID] = UnitRef{LevelID: l.LevelID, ThemeID: th.ThemeID, Unit: u}
				for li := range u.Lessons {
					ls := &u.Lessons[li]
					if ls.LessonID == "" {
						return nil, fmt.Errorf("%s: lesson without lesson_id in unit %q", name, u.UnitID)
					}
					if prev, dup := c.lessonByID[ls.LessonID]; dup {
						return nil, fmt.Errorf("%s: duplicate lesson_id %q (also in unit %q)", name, ls.LessonID, prev.Unit.UnitID)
					}
					if err := validateLesson(ls); err != nil {
						return nil, fmt.Errorf("%s: unit %s / lesson %s / %w", name, u.UnitID, ls.LessonID, err)
					}
					c.lessonByID[ls.LessonID] = LessonRef{LevelID: l.LevelID, Unit: u, Lesson: ls}
				}
			}
		}
	}

	sort.SliceStable(c.levels, func(i, j int) bool {
		return rank(c.levels[i].LevelID) < rank(c.levels[j].LevelID)
	})
	// Course order of the units, once the levels are sorted.
	pos := 0
	for _, l := range c.levels {
		for _, th := range l.Themes {
			for _, u := range th.Units {
				pos++
				ref := c.unitByID[u.UnitID]
				ref.Pos = pos
				c.unitByID[u.UnitID] = ref
			}
		}
	}
	return c, nil
}

// LevelEnd is the course position of the last unit of a level (see UnitRef.Pos), or 0.
func (c *Catalog) LevelEnd(levelID string) int {
	end := 0
	if l, ok := c.levelByID[levelID]; ok {
		for _, th := range l.Themes {
			for _, u := range th.Units {
				end = max(end, c.unitByID[u.UnitID].Pos)
			}
		}
	}
	return end
}

// themeOf returns the level's theme with the given id, appending an empty one if missing.
func themeOf(l *Level, id string) *Theme {
	for i := range l.Themes {
		if l.Themes[i].ThemeID == id {
			return &l.Themes[i]
		}
	}
	l.Themes = append(l.Themes, Theme{ThemeID: id})
	return &l.Themes[len(l.Themes)-1]
}

// LevelRank orders levels: A1 < A2 < … < C1; unknown levels go last.
func LevelRank(id string) int { return rank(id) }

func rank(id string) int {
	if r, ok := levelOrder[strings.ToUpper(id)]; ok {
		return r
	}
	return 100
}

func (c *Catalog) Summaries() []LevelSummary {
	out := make([]LevelSummary, 0, len(c.levels))
	for _, l := range c.levels {
		ls := LevelSummary{LevelID: l.LevelID, Title: l.Title, Description: l.Description, Themes: []ThemeSummary{}}
		for _, th := range l.Themes {
			ts := ThemeSummary{ThemeID: th.ThemeID, Title: th.Title, Units: []UnitSummary{}}
			for _, u := range th.Units {
				ts.Units = append(ts.Units, UnitSummary{
					UnitID: u.UnitID, Title: u.Title, Description: u.Description,
					LessonIDs: lessonIDsOf(u), Lessons: lessonSummaries(u),
				})
			}
			ls.Themes = append(ls.Themes, ts)
		}
		out = append(out, ls)
	}
	return out
}

// Unit returns a unit by id. If levelID is non-empty it must match.
func (c *Catalog) Unit(levelID, unitID string) (UnitRef, bool) {
	ref, ok := c.unitByID[unitID]
	if !ok {
		return UnitRef{}, false
	}
	if levelID != "" && !strings.EqualFold(ref.LevelID, levelID) {
		return UnitRef{}, false
	}
	return ref, true
}

func (c *Catalog) Units() map[string]UnitRef { return c.unitByID }

func (u *Unit) HasLesson(id string) bool {
	for _, l := range u.Lessons {
		if l.LessonID == id {
			return true
		}
	}
	return false
}

func (c *Catalog) Lesson(id string) (LessonRef, bool) {
	ref, ok := c.lessonByID[id]
	return ref, ok
}

// Vocabulary returns the items of every vocabulary_table step in a lesson.
func (c *Catalog) Vocabulary(lessonID string) []VocabItem {
	ref, ok := c.lessonByID[lessonID]
	if !ok {
		return nil
	}
	var out []VocabItem
	for _, s := range ref.Lesson.Steps {
		if s.Type != "vocabulary_table" {
			continue
		}
		var v struct {
			Items []VocabItem `json:"items"`
		}
		if json.Unmarshal(s.Content, &v) == nil {
			out = append(out, v.Items...)
		}
	}
	return out
}

func lessonSummaries(u Unit) []LessonSummary {
	out := make([]LessonSummary, 0, len(u.Lessons))
	for _, l := range u.Lessons {
		ls := LessonSummary{LessonID: l.LessonID, Title: l.Title, Kind: l.Kind, Grammar: []string{}}
		for _, s := range l.Steps {
			if s.Type != "grammar_rule" {
				continue
			}
			var g struct {
				Title string `json:"title"`
			}
			if json.Unmarshal(s.Content, &g) == nil && g.Title != "" {
				ls.Grammar = append(ls.Grammar, g.Title)
			}
		}
		out = append(out, ls)
	}
	return out
}

func lessonIDsOf(u Unit) []string {
	ids := make([]string, 0, len(u.Lessons))
	for _, l := range u.Lessons {
		ids = append(ids, l.LessonID)
	}
	return ids
}
