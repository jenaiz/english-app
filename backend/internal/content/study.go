package content

import (
	"encoding/json"
	"strings"
)

// Study sheet of a whole level (GET /api/levels/{id}/study): the grammar rules and vocabulary of every
// unit, grouped by theme, without the exercises.

type LevelStudy struct {
	LevelID     string       `json:"level_id"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Themes      []ThemeStudy `json:"themes"`
}

type ThemeStudy struct {
	ThemeID string      `json:"theme_id"`
	Title   string      `json:"title"`
	Units   []UnitStudy `json:"units"`
}

type UnitStudy struct {
	UnitID string `json:"unit_id"`
	Title  string `json:"title"`
	// Grammar holds the raw content of each grammar_rule step, in lesson order.
	Grammar    []json.RawMessage `json:"grammar"`
	Vocabulary []VocabItem       `json:"vocabulary"`
}

// Study returns the study sheet of a level, matched case-insensitively.
func (c *Catalog) Study(levelID string) (LevelStudy, bool) {
	l, ok := c.levelByID[strings.ToUpper(levelID)]
	if !ok {
		return LevelStudy{}, false
	}
	out := LevelStudy{LevelID: l.LevelID, Title: l.Title, Description: l.Description, Themes: []ThemeStudy{}}
	for _, th := range l.Themes {
		ts := ThemeStudy{ThemeID: th.ThemeID, Title: th.Title, Units: []UnitStudy{}}
		for _, u := range th.Units {
			us := UnitStudy{UnitID: u.UnitID, Title: u.Title, Grammar: []json.RawMessage{}, Vocabulary: []VocabItem{}}
			for _, lesson := range u.Lessons {
				for _, s := range lesson.Steps {
					if s.Type == "grammar_rule" {
						us.Grammar = append(us.Grammar, s.Content)
					}
				}
				us.Vocabulary = append(us.Vocabulary, c.Vocabulary(lesson.LessonID)...)
			}
			ts.Units = append(ts.Units, us)
		}
		out.Themes = append(out.Themes, ts)
	}
	return out, true
}
