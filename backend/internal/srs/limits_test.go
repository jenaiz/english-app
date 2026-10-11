package srs

import (
	"testing"
	"time"
)

func TestNewCardAllowance(t *testing.T) {
	cases := []struct{ reviewsDue, introduced, want int }{
		{0, 0, NewExpressionsPerDay},
		{10, 2, NewExpressionsPerDay - 2},
		{0, NewExpressionsPerDay, 0},
		{0, NewExpressionsPerDay + 3, 0},
		{BacklogLimit, 0, NewExpressionsPerDay},
		{BacklogLimit + 1, 0, 0},
	}
	for _, c := range cases {
		if got := NewCardAllowance(c.reviewsDue, c.introduced); got != c.want {
			t.Errorf("NewCardAllowance(%d, %d) = %d, want %d", c.reviewsDue, c.introduced, got, c.want)
		}
	}
}

func TestStartOfDayUsesSpanishTime(t *testing.T) {
	// 23:30 UTC on 10 October is already 11 October in Madrid (UTC+2 in summer time).
	now := time.Date(2026, 10, 10, 23, 30, 0, 0, time.UTC)
	got := StartOfDay(now)
	want := time.Date(2026, 10, 10, 22, 0, 0, 0, time.UTC)
	if !got.Equal(want) {
		t.Errorf("StartOfDay(%v) = %v, want %v", now, got.UTC(), want)
	}
}
