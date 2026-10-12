package content

import (
	"regexp"
	"strings"
)

// Answer checking, ported from frontend/src/lib/answers.ts so the server grades level exams
// exactly as the lessons grade exercises in the browser. Keep both in sync.

// Contractions are expanded so "I'm" and "I am" compare equal.
var contractions = []struct {
	re  *regexp.Regexp
	rep string
}{
	{regexp.MustCompile(`\bcan't\b`), "can not"},
	{regexp.MustCompile(`\bcannot\b`), "can not"},
	{regexp.MustCompile(`\bwon't\b`), "will not"},
	{regexp.MustCompile(`\bshan't\b`), "shall not"},
	{regexp.MustCompile(`\bain't\b`), "am not"},
	{regexp.MustCompile(`n't\b`), " not"},
	{regexp.MustCompile(`\bi'm\b`), "i am"},
	{regexp.MustCompile(`'re\b`), " are"},
	{regexp.MustCompile(`'ve\b`), " have"},
	{regexp.MustCompile(`'ll\b`), " will"},
	{regexp.MustCompile(`'d\b`), " would"},
	{regexp.MustCompile(`\b(he|she|it|that|there|what|where|who|how)'s\b`), "${1} is"},
}

var (
	quotes      = strings.NewReplacer("’", "'", "‘", "'", "`", "'", "´", "'")
	punctuation = regexp.MustCompile(`[^\p{L}\p{N}\s']`)
	spaces      = regexp.MustCompile(`\s+`)
)

// NormalizeAnswer lowercases, unifies quotes, expands contractions, drops punctuation and
// collapses spaces.
func NormalizeAnswer(text string) string {
	s := strings.TrimSpace(quotes.Replace(strings.ToLower(text)))
	for _, c := range contractions {
		s = c.re.ReplaceAllString(s, c.rep)
	}
	s = punctuation.ReplaceAllString(s, " ")
	s = strings.ReplaceAll(s, "'", "")
	return strings.TrimSpace(spaces.ReplaceAllString(s, " "))
}

// AnswerMatches reports whether input equals one of the accepted answers once normalized.
// "pick up", "pickup" and "pick-up" are the same answer.
func AnswerMatches(input string, accepted []string) bool {
	n := NormalizeAnswer(input)
	if n == "" {
		return false
	}
	compact := func(s string) string { return strings.ReplaceAll(s, " ", "") }
	for _, a := range accepted {
		na := NormalizeAnswer(a)
		if na == n || compact(na) == compact(n) {
			return true
		}
	}
	return false
}
