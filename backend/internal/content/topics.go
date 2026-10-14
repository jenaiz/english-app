package content

import (
	"encoding/json"
	"fmt"
	"strings"
)

// Every grammar_rule names the syllabus topic it teaches ("tag" in its content), and exercise
// steps tag their items the same way: "tag" in the step's content is the default for its items,
// and an item's own "tag" overrides it ("" leaves a comprehension item out). A mistake in an item
// is then a mistake in that topic, which is what Repaso gives practice for.

// stepTags is the part of a step's content that carries topics.
type stepTags struct {
	Tag   string `json:"tag"`
	Items []struct {
		Tag *string `json:"tag"`
	} `json:"items"`
	Pairs []json.RawMessage `json:"pairs"`
}

func (s Step) tags() stepTags {
	var t stepTags
	_ = json.Unmarshal(s.Content, &t)
	return t
}

// Tag is the topic of a grammar rule, or the default topic of an exercise step's items.
func (s Step) Tag() string { return s.tags().Tag }

// ItemTags returns the topic of each item of an exercise step ("" for an untagged item).
func (s Step) ItemTags() []string {
	t := s.tags()
	if len(t.Items) == 0 {
		out := make([]string, len(t.Pairs))
		for i := range out {
			out[i] = t.Tag
		}
		return out
	}
	out := make([]string, len(t.Items))
	for i, it := range t.Items {
		out[i] = t.Tag
		if it.Tag != nil {
			out[i] = *it.Tag
		}
	}
	return out
}

// ungradedForTopics are exercise types whose items never count towards a topic: speaking
// (speech recognition slips are not grammar mistakes) and the vocabulary speed quiz.
var ungradedForTopics = map[string]bool{"speaking": true, "speed_quiz": true}

// CheckTags checks the topics of the course content against the level exams' syllabus: every
// grammar rule has a topic, and every topic named is in the syllabus of the unit's level or an
// earlier one. In the levels listed in itemLevels (those with a practice bank), every item of a
// graded exercise must also have one, except comprehension questions in the discovery phase,
// which may opt out with "tag": "". Like CheckCoverage, it runs on the course content alone.
func (x *Exams) CheckTags(catalog *Catalog, itemLevels map[string]bool) error {
	known := map[string]map[string]bool{}
	for _, l := range catalog.levels {
		known[l.LevelID] = map[string]bool{}
		for _, e := range x.List {
			if rank(e.LevelID) <= rank(l.LevelID) {
				for _, t := range e.Syllabus {
					known[l.LevelID][t.Tag] = true
				}
			}
		}
	}
	for _, l := range catalog.levels {
		for _, th := range l.Themes {
			for _, u := range th.Units {
				for _, ls := range u.Lessons {
					for si, s := range ls.Steps {
						where := fmt.Sprintf("%s/%s step %d (%s)", u.UnitID, ls.LessonID, si, s.Type)
						if err := checkStepTags(s, known[l.LevelID], itemLevels[l.LevelID], where); err != nil {
							return err
						}
					}
				}
			}
		}
	}
	return nil
}

func checkStepTags(s Step, known map[string]bool, items bool, where string) error {
	switch s.Type {
	case "audio_context", "vocabulary_table":
		return nil
	case "grammar_rule":
		if !known[s.Tag()] {
			return fmt.Errorf("%s: grammar rule needs a syllabus tag of its level or earlier, got %q", where, s.Tag())
		}
		return nil
	}
	if t := s.Tag(); t != "" && !known[t] {
		return fmt.Errorf("%s: unknown tag %q", where, t)
	}
	for i, t := range s.ItemTags() {
		switch {
		case t != "" && !known[t]:
			return fmt.Errorf("%s item %d: unknown tag %q", where, i, t)
		case t == "" && items && !ungradedForTopics[s.Type] && !explicitlyUntagged(s, i):
			return fmt.Errorf("%s item %d: needs a tag (or \"tag\": \"\" for a comprehension question)", where, i)
		case t == "" && explicitlyUntagged(s, i) && s.Phase != "discovery":
			return fmt.Errorf("%s item %d: only discovery questions can be left without a topic", where, i)
		}
	}
	return nil
}

func explicitlyUntagged(s Step, i int) bool {
	t := s.tags()
	return i < len(t.Items) && t.Items[i].Tag != nil && strings.TrimSpace(*t.Items[i].Tag) == ""
}
