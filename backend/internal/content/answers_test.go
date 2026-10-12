package content

import "testing"

func TestNormalizeAnswer(t *testing.T) {
	cases := map[string]string{
		"I'm from Spain.":      "i am from spain",
		"She’s   a nurse!":     "she is a nurse",
		"They aren't here":     "they are not here",
		"I can't swim":         "i can not swim",
		"I cannot swim":        "i can not swim",
		"We won't go":          "we will not go",
		"I'd like a coffee":    "i would like a coffee",
		"Sam's guitar":         "sams guitar",
		"my parents' house":    "my parents house",
		"  Where's the bank? ": "where is the bank",
	}
	for in, want := range cases {
		if got := NormalizeAnswer(in); got != want {
			t.Errorf("NormalizeAnswer(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestAnswerMatches(t *testing.T) {
	cases := []struct {
		input    string
		accepted []string
		want     bool
	}{
		{"isn't", []string{"is not"}, true},
		{"Is not", []string{"isn't"}, true},
		{"pickup", []string{"pick up"}, true},
		{"pick-up", []string{"pick up"}, true},
		{"There's", []string{"There is"}, true},
		{"are", []string{"is"}, false},
		{"", []string{""}, false},
		{"   ", []string{"at"}, false},
		{"Sam's", []string{"Sam's"}, true},
		{"Sams", []string{"Sam's"}, true},
	}
	for _, c := range cases {
		if got := AnswerMatches(c.input, c.accepted); got != c.want {
			t.Errorf("AnswerMatches(%q, %q) = %v, want %v", c.input, c.accepted, got, c.want)
		}
	}
}
