// Package srs implements a simplified SM-2 spaced repetition schedule.
package srs

import (
	"fmt"
	"math"
	"time"
)

type Grade string

const (
	Again Grade = "again"
	Hard  Grade = "hard"
	Good  Grade = "good"
	Easy  Grade = "easy"
)

const (
	minEase    = 1.3
	againDelay = 10 * time.Minute
	firstGood  = 1.0 // days
	secondGood = 3.0 // days
	easyBonus  = 1.3
	hardFactor = 1.2
)

// State is the scheduling state of one card.
type State struct {
	Ease         float64
	IntervalDays float64
	Repetitions  int
	DueAt        time.Time
}

func ParseGrade(s string) (Grade, error) {
	switch g := Grade(s); g {
	case Again, Hard, Good, Easy:
		return g, nil
	}
	return "", fmt.Errorf("invalid grade %q (want again, hard, good or easy)", s)
}

// Next returns the state after reviewing a card with grade g at time now.
func Next(s State, g Grade, now time.Time) State {
	n := s
	switch g {
	case Again:
		n.Repetitions = 0
		n.IntervalDays = 0
		n.Ease = s.Ease - 0.2
		n.DueAt = now.Add(againDelay)
	case Hard:
		n.Repetitions = s.Repetitions + 1
		n.IntervalDays = math.Max(firstGood, s.IntervalDays*hardFactor)
		n.Ease = s.Ease - 0.15
	case Good:
		n.Repetitions = s.Repetitions + 1
		n.IntervalDays = goodInterval(s)
	case Easy:
		n.Repetitions = s.Repetitions + 1
		n.IntervalDays = goodInterval(s) * easyBonus
		n.Ease = s.Ease + 0.15
	}
	n.Ease = math.Max(minEase, n.Ease)
	if g != Again {
		n.IntervalDays = math.Round(n.IntervalDays*10) / 10
		n.DueAt = now.Add(time.Duration(n.IntervalDays * 24 * float64(time.Hour)))
	}
	return n
}

func goodInterval(s State) float64 {
	switch s.Repetitions {
	case 0:
		return firstGood
	case 1:
		return secondGood
	default:
		return s.IntervalDays * s.Ease
	}
}
