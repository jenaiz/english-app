package handlers

import (
	"fmt"
	"math/rand"
	"testing"
	"time"

	"github.com/jenaiz/english-app/backend/internal/content"
	"github.com/jenaiz/english-app/backend/internal/srs"
	"github.com/jenaiz/english-app/backend/internal/store"
)

// bankOf makes items "t.<set>.<n>" spread over sets of the given sizes.
func bankOf(sizes ...int) []content.PracticeItem {
	var out []content.PracticeItem
	for set, n := range sizes {
		for i := 0; i < n; i++ {
			out = append(out, content.PracticeItem{ID: fmt.Sprintf("t.%d.%d", set, i), Set: set})
		}
	}
	return out
}

func TestPickItemsMixesFormats(t *testing.T) {
	got := pickItems(bankOf(20, 10, 9, 8, 6), nil, 12, rand.New(rand.NewSource(1)))
	if len(got) != 12 {
		t.Fatalf("picked %d", len(got))
	}
	perSet := map[int]int{}
	for i, it := range got {
		perSet[it.Set]++
		if i > 0 && got[i-1].Set > it.Set {
			t.Fatal("items must come in set order")
		}
	}
	if len(perSet) < 4 {
		t.Errorf("round uses only %d formats: %v", len(perSet), perSet)
	}
	for set, n := range perSet {
		if n > 4 {
			t.Errorf("set %d takes %d items", set, n)
		}
	}
}

func TestPickItemsMissedFirstThenUnseen(t *testing.T) {
	items := bankOf(6, 6)
	now := time.Now()
	stats := map[string]store.ItemStat{}
	for _, it := range items {
		stats[it.ID] = store.ItemStat{LastOK: true, LastSeenAt: now}
	}
	stats["t.0.3"] = store.ItemStat{LastOK: false, LastSeenAt: now}
	stats["t.1.4"] = store.ItemStat{LastOK: false, LastSeenAt: now.Add(-time.Hour)}
	delete(stats, "t.1.0") // unseen
	got := pickItems(items, stats, 3, rand.New(rand.NewSource(2)))
	ids := map[string]bool{}
	for _, it := range got {
		ids[it.ID] = true
	}
	for _, want := range []string{"t.0.3", "t.1.4", "t.1.0"} {
		if !ids[want] {
			t.Errorf("round %v misses %s", ids, want)
		}
	}
}

func TestPickItemsSmallBank(t *testing.T) {
	if got := pickItems(bankOf(3, 2), nil, 12, rand.New(rand.NewSource(3))); len(got) != 5 {
		t.Fatalf("picked %d of 5", len(got))
	}
}

func TestRoundGrade(t *testing.T) {
	for score, want := range map[int]srs.Grade{100: srs.Easy, 90: srs.Easy, 75: srs.Good, 50: srs.Hard, 49: srs.Again, 0: srs.Again} {
		if got := roundGrade(score); got != want {
			t.Errorf("score %d: got %s, want %s", score, got, want)
		}
	}
}

func TestValidPracticeResults(t *testing.T) {
	_, _, p := loadPracticeForTest(t)
	real, _ := p.Topic("a1_in_on_at")
	items := real.Items()
	if validPracticeResults(real, nil) {
		t.Error("an empty round is not valid")
	}
	ok := []store.PracticeResult{{ID: items[0].ID, OK: true}, {ID: items[1].ID, Answer: "on"}}
	if !validPracticeResults(real, ok) {
		t.Error("valid round rejected")
	}
	if validPracticeResults(real, []store.PracticeResult{{ID: items[0].ID}, {ID: items[0].ID}}) {
		t.Error("repeated item accepted")
	}
	if validPracticeResults(real, []store.PracticeResult{{ID: "a1_a_some_any.001"}}) {
		t.Error("item of another topic accepted")
	}
}

func loadPracticeForTest(t *testing.T) (*content.Catalog, *content.Exams, *content.Practice) {
	t.Helper()
	c, err := content.Load("../../data/levels")
	if err != nil {
		t.Fatal(err)
	}
	x, err := content.LoadExams("../../data/exams", c)
	if err != nil {
		t.Fatal(err)
	}
	p, err := content.LoadPractice("../../data/practice", c, x)
	if err != nil {
		t.Fatal(err)
	}
	return c, x, p
}
