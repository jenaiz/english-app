package content

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

var levelOrder = map[string]int{"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}

// Catalog is the in-memory, read-only content loaded at startup.
type Catalog struct {
	levels     []*Level
	levelByID  map[string]*Level
	unitByID   map[string]UnitRef
	lessonByID map[string]LessonRef
}

// Load parses every *.json file in dir and validates IDs.
func Load(dir string) (*Catalog, error) {
	files, err := filepath.Glob(filepath.Join(dir, "*.json"))
	if err != nil {
		return nil, err
	}
	if len(files) == 0 {
		return nil, fmt.Errorf("no level files found in %s", dir)
	}

	c := &Catalog{levelByID: map[string]*Level{}, unitByID: map[string]UnitRef{}, lessonByID: map[string]LessonRef{}}

	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			return nil, err
		}
		var lvl Level
		if err := json.Unmarshal(data, &lvl); err != nil {
			return nil, fmt.Errorf("%s: %w", filepath.Base(f), err)
		}
		if lvl.LevelID == "" {
			return nil, fmt.Errorf("%s: missing level_id", filepath.Base(f))
		}
		if _, dup := c.levelByID[lvl.LevelID]; dup {
			return nil, fmt.Errorf("%s: duplicate level_id %q", filepath.Base(f), lvl.LevelID)
		}
		l := &lvl
		c.levels = append(c.levels, l)
		c.levelByID[l.LevelID] = l

		for ti := range l.Themes {
			th := &l.Themes[ti]
			for ui := range th.Units {
				u := &th.Units[ui]
				if u.UnitID == "" {
					return nil, fmt.Errorf("%s: unit without unit_id in theme %q", filepath.Base(f), th.ThemeID)
				}
				if _, dup := c.unitByID[u.UnitID]; dup {
					return nil, fmt.Errorf("%s: duplicate unit_id %q", filepath.Base(f), u.UnitID)
				}
				c.unitByID[u.UnitID] = UnitRef{LevelID: l.LevelID, ThemeID: th.ThemeID, Unit: u}
				for li := range u.Lessons {
					ls := &u.Lessons[li]
					if ls.LessonID == "" {
						return nil, fmt.Errorf("%s: lesson without lesson_id in unit %q", filepath.Base(f), u.UnitID)
					}
					if prev, dup := c.lessonByID[ls.LessonID]; dup {
						return nil, fmt.Errorf("%s: duplicate lesson_id %q (also in unit %q)", filepath.Base(f), ls.LessonID, prev.Unit.UnitID)
					}
					if err := validateLesson(ls); err != nil {
						return nil, fmt.Errorf("%s: unit %s / lesson %s / %w", filepath.Base(f), u.UnitID, ls.LessonID, err)
					}
					c.lessonByID[ls.LessonID] = LessonRef{LevelID: l.LevelID, Unit: u, Lesson: ls}
				}
			}
		}
	}

	sort.SliceStable(c.levels, func(i, j int) bool {
		return rank(c.levels[i].LevelID) < rank(c.levels[j].LevelID)
	})
	return c, nil
}

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
		ls := LessonSummary{LessonID: l.LessonID, Title: l.Title, Grammar: []string{}}
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
