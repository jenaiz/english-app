package main

import (
	"reflect"
	"testing"
)

const sample = `WEBVTT
Kind: captions
Language: en

1
00:00:01.000 --> 00:00:03.500
So I want to <c.yellow>start</c> with a

2
00:00:03.500 --> 00:00:05.000
question.

01:02.250 --> 01:04.000
Isn&#39;t it strange?
`

func TestParseAndMerge(t *testing.T) {
	cues := parseVTT(sample)
	want := []Line{{1, "So I want to start with a"}, {3.5, "question."}, {62.3, "Isn't it strange?"}}
	if !reflect.DeepEqual(cues, want) {
		t.Fatalf("parse: %+v", cues)
	}
	merged := mergeSentences(cues, 160)
	if len(merged) != 2 || merged[0].Text != "So I want to start with a question." || merged[0].T != 1 {
		t.Fatalf("merge: %+v", merged)
	}
}

func TestDedupeRolling(t *testing.T) {
	cues := []Line{{0, "hello everyone"}, {2, "hello everyone and welcome"}, {4, "to the show"}}
	got := dedupeRolling(cues)
	want := []Line{{0, "hello everyone"}, {2, "and welcome"}, {4, "to the show"}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %+v", got)
	}
}

func TestVideoID(t *testing.T) {
	for in, want := range map[string]string{
		"https://www.youtube.com/watch?v=abc123&t=4": "abc123",
		"https://youtu.be/abc123":                    "abc123",
		"https://www.youtube.com/embed/abc123":       "abc123",
		"abc123":                                     "abc123",
	} {
		if got := videoID(in); got != want {
			t.Errorf("%s: got %s", in, got)
		}
	}
}

func TestCleanLyrics(t *testing.T) {
	cues := []Line{{1, "(upbeat music)"}, {2, "♪ DON'T WORRY ABOUT A THING ♪"}, {3, "[Music]"}, {4, "if i fall"}, {5, "if i fall"}, {6, "♪ Because I'm happy ♪"}}
	got := cleanLyrics(cues)
	want := []Line{{2, "Don't worry about a thing"}, {4, "if i fall"}, {6, "Because I'm happy"}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %+v", got)
	}
}
