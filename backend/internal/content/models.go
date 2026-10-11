package content

import "encoding/json"

type Level struct {
	LevelID     string  `json:"level_id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Themes      []Theme `json:"themes"`
}

type Theme struct {
	ThemeID string `json:"theme_id"`
	Title   string `json:"title"`
	Units   []Unit `json:"units"`
}

type Unit struct {
	UnitID      string   `json:"unit_id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Lessons     []Lesson `json:"lessons"`
}

type Lesson struct {
	LessonID string `json:"lesson_id"`
	Title    string `json:"title"`
	// Kind is empty for a regular 7-phase lesson or KindTest for a checkpoint test.
	Kind  string `json:"kind,omitempty"`
	Steps []Step `json:"steps"`
}

// KindTest marks a checkpoint test: graded exercises only, no phase sequence.
const KindTest = "test"

// Step content is kept raw so new step types need no backend changes.
type Step struct {
	Phase   string          `json:"phase"`
	Type    string          `json:"type"`
	Content json.RawMessage `json:"content"`
}

// VocabItem is one row of a vocabulary_table step.
type VocabItem struct {
	Term        string `json:"term"`
	Definition  string `json:"definition"`
	Translation string `json:"translation"`
	Example     string `json:"example,omitempty"`
}

// Summaries returned by GET /api/levels (no lesson steps).

type LevelSummary struct {
	LevelID     string         `json:"level_id"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Themes      []ThemeSummary `json:"themes"`
}

type ThemeSummary struct {
	ThemeID string        `json:"theme_id"`
	Title   string        `json:"title"`
	Units   []UnitSummary `json:"units"`
}

type UnitSummary struct {
	UnitID      string          `json:"unit_id"`
	Title       string          `json:"title"`
	Description string          `json:"description"`
	LessonIDs   []string        `json:"lesson_ids"`
	Lessons     []LessonSummary `json:"lessons"`
}

// LessonSummary lists a lesson with the titles of its grammar rules, for overviews.
type LessonSummary struct {
	LessonID string   `json:"lesson_id"`
	Title    string   `json:"title"`
	Kind     string   `json:"kind,omitempty"`
	Grammar  []string `json:"grammar"`
}

// UnitRef locates a unit inside the catalog.
type UnitRef struct {
	LevelID string
	ThemeID string
	Unit    *Unit
}

// LessonRef locates a lesson inside the catalog.
type LessonRef struct {
	LevelID string
	Unit    *Unit
	Lesson  *Lesson
}
