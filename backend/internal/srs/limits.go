package srs

import (
	"time"
	_ "time/tzdata" // the runtime image has no zoneinfo
)

// Limits on new expression cards (idioms and phrasal verbs), so adding many at once doesn't
// flood Repaso days later. Lesson vocabulary isn't limited: it arrives a few words per lesson.
const (
	// NewExpressionsPerDay is how many never-reviewed expression cards can enter Repaso per day.
	NewExpressionsPerDay = 5
	// BacklogLimit: with more reviews than this pending, no new cards enter until the learner catches up.
	BacklogLimit = 30
)

// learnerZone sets where a day starts. The app is aimed at learners in Spain.
var learnerZone = mustLoad("Europe/Madrid")

func mustLoad(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		panic(err)
	}
	return loc
}

// StartOfDay returns midnight of now's day in the learners' time zone.
func StartOfDay(now time.Time) time.Time {
	t := now.In(learnerZone)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, learnerZone)
}

// NewCardAllowance is how many new expression cards can still be introduced today.
func NewCardAllowance(reviewsDue, introducedToday int) int {
	if reviewsDue > BacklogLimit {
		return 0
	}
	return max(0, NewExpressionsPerDay-introducedToday)
}
