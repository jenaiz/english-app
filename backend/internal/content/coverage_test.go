package content

import (
	"encoding/json"
	"regexp"
	"strings"
	"testing"
)

// coveragePoint is a point of a level's grammar (Core Inventory for General English or TrackTest)
// that the course must teach and the level exam must check. See docs/levels/*.md.
type coveragePoint struct {
	level string // level whose exam must check it (the Core Inventory / TrackTest level)
	point string
	unit  string // unit that teaches it: of this level or an earlier one
	rule  string // regexp the unit's grammar_rule steps must match
	drill string // regexp one of the unit's fill_blanks steps must match
	tag   string // syllabus topic of the level exam that checks it
}

// levelCoverage lists the points that were missing or misplaced when the levels were aligned
// (October 2026), plus the ones taught earlier that a later exam must check again. A change to a
// unit or an exam that drops one of them fails here.
var levelCoverage = []coveragePoint{
	// A1
	{"A1", "possessive pronouns", "new_flatmates", `\bmine\b.*\byours\b`, `\bmine\b|\bhers\b`, "pronouns_possessives"},
	{"A1", "the vs a / an", "shift_work", `\bthe\b.*(concreto|ya conocemos)`, `\b[Tt]he\b`, "articles_demonstratives"},
	{"A1", "possessive 's", "numbers_colors", `(?i)possessive 's`, `'s\b`, "possessive_s"},
	{"A1", "in / on / at", "first_day", `in, on, at`, `\bat\b`, "time_prepositions"},
	{"A1", "how much / many, I'd like", "at_the_pub", `How much.*I'd like`, `much|many`, "how_much_id_like"},
	{"A1", "and / but / or / because", "my_week", `because`, `because`, "linking_words"},
	{"A1", "comparatives and superlatives", "around_town", `than.*the biggest|the biggest`, `bigger|cheaper`, "comparatives"},
	{"A1", "could, very / really", "in_the_park", `\bcould\b.*\breally\b`, `could`, "can_could"},
	{"A1", "be going to", "rainy_day", `going to`, `going`, "going_to"},
	// A2
	{"A2", "used to", "past_memories", `used to`, `use(d)? to`, "used_to"},
	{"A2", "present continuous for arrangements", "london_plans", `present continuous`, `playing|meeting`, "future_plans"},
	{"A2", "shall for suggestions", "london_plans", `\bShall\b`, `Shall`, "future_plans"},
	{"A2", "zero conditional", "feeling_ill", `(?i)zero conditional`, `boils`, "conditionals"},
	{"A2", "first conditional", "feeling_ill", `(?i)first conditional`, `calls|'ll feel|will feel`, "conditionals"},
	{"A2", "everyday phrasal verbs", "daily_routine", `phrasal verb`, `look .*for|turn`, "phrasal_verbs"},
	{"A2", "might / may, probably / perhaps", "in_london", `might.*may.*[Pp]robably.*[Pp]erhaps`, `might|probably`, "might_probably"},
	{"A2", "infinitive of purpose", "home_for_christmas", `para qué`, `\bto\b`, "purpose_infinitive"},
	{"A2", "-ed / -ing adjectives", "comparing_cities", `-ed.*-ing`, `interested|bored`, "ed_ing"},
	{"A2", "the same as, similar to, different from", "comparing_cities", `the same as.*similar to.*different from`, `from|alike`, "comparatives"},
	{"A2", "sequencers and adverbs of manner", "a_bad_day", `First.*Then.*-ly`, `quickly|carefully`, "sequencing_adverbs"},
	{"A2", "all, both, most, none", "at_the_shop", `\bboth\b.*\bnone\b|\bnone\b.*\bboth\b|\bAll\b.*\bboth\b`, `\bboth\b|None`, "quantifiers"},
	{"A2", "reflexive pronouns", "christmas_party", `reflexiv`, `yourself`, "reflexives"},
	{"A2", "something / anything / nothing", "home_for_christmas", `something.*anything.*nothing`, `anything|nothing`, "indefinite_pronouns"},
	{"A2", "question tags", "the_best_pub", `question tag`, `isn't|don't`, "question_tags"},
	{"A2", "prepositions of movement", "at_the_station", `movimiento`, `across|through`, "movement_prepositions"},
	{"A2", "A1 review: 's / s'", "numbers_colors", `(?i)possessive 's`, `'s\b`, "a1_review"},
	{"A2", "A1 review: possessive pronouns", "new_flatmates", `\bmine\b`, `mine`, "a1_review"},
	{"A2", "A1 review: in / on / at", "first_day", `in, on, at`, `\bat\b`, "a1_review"},
	{"A2", "A1 review: can / could", "in_the_park", `\bcould\b`, `could`, "a1_review"},
	{"A2", "A1 review: imperatives", "around_town", `imperativ`, `.`, "a1_review"},
	{"A2", "A1 review: adverbs of frequency", "shift_work", `frequency`, `.`, "a1_review"},
	{"A2", "A1 review: like + -ing", "free_time", `-ing`, `.`, "a1_review"},
	// B1
	{"B1", "would for past habits", "first_date", `would.*(hábito|repetid)`, `\bwould\b`, "used_to_would"},
	{"B1", "be able to, -ing as a subject", "since_january", `be able to`, `able`, "be_able_gerund"},
	{"B1", "however, therefore, on the other hand", "job_interview", `however.*[Tt]herefore`, `However|Therefore`, "linkers"},
	{"B1", "future continuous", "airport_travel", `(?i)future continuous`, `walking|waiting`, "future_continuous"},
	{"B1", "complex question tags", "galway_family", `(?i)question tags`, `won't|shall`, "question_tags"},
	{"B1", "third conditional", "big_decision", `(?i)third conditional`, `hadn't|have`, "third_conditional"},
	{"B1", "ought to", "house_rules", `ought to`, `ought`, "obligation"},
	{"B1", "deduction: must, might, can't", "new_flatmate", `(?i)deduc`, `must|can't`, "deduction"},
	{"B1", "comparative adverbs, intensifiers", "good_news", `more clearly.*much too|much too`, `better|harder`, "adverbs_intensifiers"},
	{"B1", "too / enough (taught in A2)", "at_the_shop", `\benough\b`, `enough`, "adverbs_intensifiers"},
	{"B1", "should have / might have", "farewell_gig", `should have`, `\bhave\b`, "should_have"},
	{"B1", "past perfect continuous", "farewell_gig", `had been`, `been`, "narrative_tenses"},
	{"B1", "informal discourse markers", "summer_plans", `[Aa]nyway.*by the way`, `Anyway|actually`, "discourse_markers"},
	{"B1", "A2 review: sequencers", "a_bad_day", `First.*Then`, `First|Finally`, "a2_review"},
	{"B1", "A2 review: reflexives", "christmas_party", `reflexiv`, `yourself`, "a2_review"},
	{"B1", "A2 review: something / anything", "home_for_christmas", `something.*anything`, `anything`, "a2_review"},
	{"B1", "A2 review: -ed / -ing", "comparing_cities", `-ed.*-ing`, `interested`, "a2_review"},
	// B2
	{"B2", "future perfect continuous, in case", "conference_nerves", `(?i)future perfect continuous.*in case`, `been|case`, "future_forms"},
	{"B2", "had better, would rather", "the_talk", `[Hh]ad better.*[Ww]ould rather`, `better|rather`, "had_better_rather"},
	{"B2", "needn't have, could have", "missing_laptop", `needn't have`, `needn't`, "past_modals"},
	{"B2", "formal discourse markers", "expressing_opinions", `[Ff]urthermore.*[Cc]onsequently`, `Furthermore|Consequently|conclusion`, "formal_markers"},
	{"B2", "past perfect continuous", "wrong_version", `(?i)past perfect continuous`, `been`, "past_perfect_continuous"},
	{"B2", "always + -ing, so do I / neither do I", "house_tensions", `always.*Neither`, `Neither|always`, "always_so_neither"},
	{"B2", "continuous and modal passive", "get_it_fixed", `being repaired.*should be fixed|being \+`, `being`, "passive_forms"},
	{"B2", "attitudinal adverbs", "the_reviews", `[Aa]pparently.*[Cc]learly`, `Apparently|Hopefully`, "attitudinal_adverbs"},
	{"B2", "be / get used to", "moving_in", `get used to`, `used|get`, "used_to_forms"},
	{"B2", "articles with abstract nouns", "what_if", `abstract`, `\bThe\b`, "abstract_articles"},
	{"B2", "intensifier collocations", "big_news", `absolutely.*highly`, `highly|absolutely`, "intensifier_collocations"},
	{"B2", "B1 review: would / used to", "first_date", `would.*(hábito|repetid)`, `\bwould\b`, "past_habits"},
	{"B2", "B1 review: defining relatives", "new_flatmate", `(?i)relative`, `.`, "relative_non_defining"},
	// C1
	{"C1", "business phrasal verbs, splitting", "starting_up", `turn down.*come up with|turned down.*came up with`, `down|into|with`, "phrasal_verbs"},
	{"C1", "signposting: nevertheless, that said, mind you", "pitch_prep", `[Nn]evertheless.*[Mm]ind you`, `Mind|Nevertheless|Admittedly`, "discourse_markers"},
	{"C1", "false friends", "jet_lag", `actually.*eventually`, `eventually|embarrassed`, "false_friends"},
	{"C1", "vague language", "the_engagement", `or so.*-ish`, `ish|odd`, "vague_language"},
	{"C1", "the passive in all its forms", "looking_back", `[Hh]aving been`, `been|being`, "passive_all"},
	{"C1", "B2 review: mixed conditionals", "what_if", `(?i)mixed conditionals`, `.`, "mixed_conditionals_wish"},
	{"C1", "B2 review: wish / if only", "house_tensions", `(?i)if only`, `.`, "mixed_conditionals_wish"},
	{"C1", "B2 review: modals in the past", "missing_laptop", `must have.*can't have`, `.`, "past_modals"},
	{"C1", "B1-B2 review: futures", "conference_nerves", `(?i)future perfect`, `.`, "futures_review"},
	{"C1", "B1 review: separable phrasal verbs", "hotel_checkin", `(?i)separable`, `.`, "phrasal_verbs"},
}

func TestLevelCoverage(t *testing.T) {
	c, x, _ := loadBundledExams(t)
	for _, p := range levelCoverage {
		where := p.level + " " + p.point
		ref, ok := c.Unit("", p.unit)
		if !ok {
			t.Errorf("%s: unknown unit %q", where, p.unit)
			continue
		}
		if rank(ref.LevelID) > rank(p.level) {
			t.Errorf("%s: taught in %s (%s), after its level", where, ref.LevelID, p.unit)
		}
		var rules, drills []string
		for _, l := range ref.Unit.Lessons {
			if l.Kind != "" {
				continue
			}
			for _, s := range l.Steps {
				switch s.Type {
				case "grammar_rule":
					rules = append(rules, string(s.Content))
				case "fill_blanks":
					drills = append(drills, string(s.Content))
				}
			}
		}
		if !anyMatch(p.rule, rules) {
			t.Errorf("%s: no grammar_rule in %s matches %q", where, p.unit, p.rule)
		}
		if !anyMatch(p.drill, drills) {
			t.Errorf("%s: no fill_blanks in %s matches %q", where, p.unit, p.drill)
		}
		e, ok := x.ForLevel(p.level)
		if !ok {
			t.Errorf("%s: level %s has no exam", where, p.level)
			continue
		}
		topic, ok := e.topics[p.tag]
		if !ok {
			t.Errorf("%s: exam %s has no topic %q", where, e.ExamID, p.tag)
			continue
		}
		if !strings.Contains(" "+strings.Join(topic.Units, " ")+" ", " "+p.unit+" ") {
			t.Errorf("%s: exam topic %q doesn't point to unit %s", where, p.tag, p.unit)
		}
	}
}

// anyMatch reports whether the pattern matches one of the steps, read as plain text (JSON
// unescaped, so apostrophes and accents compare as written).
func anyMatch(pattern string, steps []string) bool {
	re := regexp.MustCompile(`(?s)` + pattern)
	for _, raw := range steps {
		var v any
		if json.Unmarshal([]byte(raw), &v) != nil {
			continue
		}
		if re.MatchString(flatten(v)) {
			return true
		}
	}
	return false
}

func flatten(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case []any:
		parts := make([]string, len(t))
		for i, e := range t {
			parts[i] = flatten(e)
		}
		return strings.Join(parts, " ")
	case map[string]any:
		var parts []string
		for _, k := range []string{"title", "explanation", "table", "headers", "rows", "examples", "instructions", "items", "sentence", "answers"} {
			if e, ok := t[k]; ok {
				parts = append(parts, flatten(e))
			}
		}
		return strings.Join(parts, " ")
	}
	return ""
}
