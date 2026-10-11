package srs

import (
	"testing"
	"time"
)

func TestNext(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	fresh := State{Ease: 2.5}
	cases := []struct {
		name      string
		in        State
		grade     Grade
		wantReps  int
		wantDays  float64
		wantEase  float64
		wantDueIn time.Duration
	}{
		{"new good", fresh, Good, 1, 1, 2.5, 24 * time.Hour},
		{"second good", State{Ease: 2.5, IntervalDays: 1, Repetitions: 1}, Good, 2, 3, 2.5, 72 * time.Hour},
		{"third good multiplies", State{Ease: 2.5, IntervalDays: 3, Repetitions: 2}, Good, 3, 7.5, 2.5, 180 * time.Hour},
		{"easy bonus", fresh, Easy, 1, 1.3, 2.65, time.Duration(1.3 * 24 * float64(time.Hour))},
		{"hard", State{Ease: 2.5, IntervalDays: 10, Repetitions: 3}, Hard, 4, 12, 2.35, 12 * 24 * time.Hour},
		{"again resets", State{Ease: 2.5, IntervalDays: 10, Repetitions: 3}, Again, 0, 0, 2.3, 10 * time.Minute},
		{"ease floor", State{Ease: 1.35}, Again, 0, 0, 1.3, 10 * time.Minute},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := Next(tc.in, tc.grade, now)
			if got.Repetitions != tc.wantReps || got.IntervalDays != tc.wantDays {
				t.Errorf("reps/days = %d/%v, want %d/%v", got.Repetitions, got.IntervalDays, tc.wantReps, tc.wantDays)
			}
			if diff := got.Ease - tc.wantEase; diff > 1e-9 || diff < -1e-9 {
				t.Errorf("ease = %v, want %v", got.Ease, tc.wantEase)
			}
			if d := got.DueAt.Sub(now); d != tc.wantDueIn {
				t.Errorf("due in %v, want %v", d, tc.wantDueIn)
			}
		})
	}
}

func TestParseGrade(t *testing.T) {
	if _, err := ParseGrade("good"); err != nil {
		t.Fatal(err)
	}
	if _, err := ParseGrade("perfect"); err == nil {
		t.Fatal("expected error")
	}
}
