package content

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// styledLevels have their Spanish texts written with English always marked: «…» for English
// words and sentences (bold is for stress only). A level joins once it has been reviewed.
var styledLevels = []string{"a1", "a2", "b1", "b2"}

// englishWords are common English words that never appear in Spanish text, so finding one
// outside «…» means unmarked English. Words shared with Spanish (a, he, me, no, has) are left out.
var englishWords = map[string]bool{}

func init() {
	for _, w := range strings.Fields(`the an is are am was were be been i i'm you you're we we're they they're
		it it's its my your his her our their this that these those there there's do does don't doesn't did
		can can't could will would have got some any much many in on at of to and but or with for from
		what where who when how not very`) {
		englishWords[w] = true
	}
}

var (
	marked  = regexp.MustCompile(`«[^»]*»|\*\*[^*]*\*\*|/[^/\s][^/]*/`)
	wordsRe = regexp.MustCompile(`\p{L}[\p{L}']*`)
)

// unmarkedEnglish returns the English words of a Spanish text that are outside «…».
func unmarkedEnglish(text string) []string {
	var out []string
	for _, w := range wordsRe.FindAllString(marked.ReplaceAllString(text, " "), -1) {
		// "I" counts only as the pronoun: a lowercase "i" is the Spanish letter ("la i larga").
		if w == "I" || (w != "i" && englishWords[strings.ToLower(w)]) {
			out = append(out, w)
		}
	}
	return out
}

func TestUnmarkedEnglish(t *testing.T) {
	cases := map[string]int{
		"Con «it» la forma es «is»: «It's Saturday».":     0,
		"Con it la forma es is.":                          2,
		"**Ojo**: en afirmativa suena /kən/.":             0,
		"El plural se forma con «-s» después de s o x.":   0,
		"«these» tiene la i larga; al oído se confunden.": 0,
		"Con I la forma es am.":                           2,
	}
	for text, want := range cases {
		if got := unmarkedEnglish(text); len(got) != want {
			t.Errorf("%q: got %v", text, got)
		}
	}
}

// TestEnglishIsMarked checks the Spanish texts (grammar explanations, exercise instructions,
// explanations and hints) of the styled levels, in the units and in the practice bank.
func TestEnglishIsMarked(t *testing.T) {
	for _, level := range styledLevels {
		var files []string
		for _, dir := range []string{"../../data/levels", "../../data/practice"} {
			f, _ := filepath.Glob(filepath.Join(dir, level, "*.json"))
			files = append(files, f...)
		}
		if len(files) == 0 {
			t.Fatalf("no content for %s", level)
		}
		for _, f := range files {
			raw, err := os.ReadFile(f)
			if err != nil {
				t.Fatal(err)
			}
			var doc any
			if err := json.Unmarshal(raw, &doc); err != nil {
				t.Fatal(err)
			}
			checkSpanishTexts(t, filepath.Base(f), doc)
		}
	}
}

func checkSpanishTexts(t *testing.T, where string, v any) {
	switch v := v.(type) {
	case map[string]any:
		for k, child := range v {
			switch k {
			case "explanation", "instructions", "hint":
				if s, ok := child.(string); ok {
					if w := unmarkedEnglish(s); len(w) > 0 {
						t.Errorf("%s: English outside «…» %v in %s %q", where, w, k, s)
					}
				}
			default:
				checkSpanishTexts(t, fmt.Sprintf("%s.%s", where, k), child)
			}
		}
	case []any:
		for _, child := range v {
			checkSpanishTexts(t, where, child)
		}
	}
}
