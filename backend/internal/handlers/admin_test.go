package handlers

import (
	"testing"
	"time"

	"github.com/jenaiz/english-app/backend/internal/content"
	"github.com/jenaiz/english-app/backend/internal/store"
)

func TestAdminsAllows(t *testing.T) {
	a := ParseAdmins(" Boss@Example.com , ,other@x.com")
	if len(a) != 2 {
		t.Fatalf("parsed %v", a)
	}
	cases := []struct {
		user *store.User
		want bool
	}{
		{&store.User{Email: "boss@example.com", EmailVerified: true}, true},
		{&store.User{Email: "BOSS@example.com", EmailVerified: true}, true},
		{&store.User{Email: "boss@example.com"}, false}, // unverified: could be someone else's sign-up
		{&store.User{Email: "learner@example.com", EmailVerified: true}, false},
		{nil, false},
	}
	for _, c := range cases {
		if got := a.Allows(c.user); got != c.want {
			t.Errorf("Allows(%+v) = %v, want %v", c.user, got, c.want)
		}
	}
	if ParseAdmins("").Allows(&store.User{Email: "", EmailVerified: true}) {
		t.Error("empty ADMIN_EMAILS must allow nobody")
	}
}

func TestAdminLevels(t *testing.T) {
	c, err := content.Load("../../data/levels")
	if err != nil {
		t.Fatal(err)
	}
	levels := c.Summaries()
	first, last := levels[0], levels[len(levels)-1]
	unit := first.Themes[0].Units[0].UnitID
	if got := currentLevel(c, unit); got != first.LevelID {
		t.Errorf("currentLevel(%s) = %q, want %q", unit, got, first.LevelID)
	}
	if got := currentLevel(c, ""); got != "" {
		t.Errorf("currentLevel of no unit = %q", got)
	}
	if got := highestLevel(c, []string{last.LevelID, first.LevelID}); got != last.LevelID {
		t.Errorf("highestLevel = %q, want %q", got, last.LevelID)
	}
	if got := highestLevel(c, nil); got != "" {
		t.Errorf("highestLevel of none = %q", got)
	}
}

func TestLastSeenThrottle(t *testing.T) {
	var l LastSeen
	now := time.Now()
	if !l.due("u1", now) {
		t.Fatal("first visit must be recorded")
	}
	if l.due("u1", now.Add(time.Minute)) {
		t.Error("second visit within the window must be skipped")
	}
	if !l.due("u2", now.Add(time.Minute)) {
		t.Error("other users are independent")
	}
	if !l.due("u1", now.Add(lastSeenEvery)) {
		t.Error("visit after the window must be recorded")
	}
}
