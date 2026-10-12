package main

import (
	"html"
	"math"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

// Line is a timed line of a Club activity (seconds from the start of the video).
type Line struct {
	T    float64 `json:"t"`
	Text string  `json:"text"`
}

var (
	cueTime = regexp.MustCompile(`^(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s+-->`)
	tag     = regexp.MustCompile(`<[^>]*>`)
	spaces  = regexp.MustCompile(`\s+`)
)

// parseVTT reads the start time and text of every cue, without styling tags.
func parseVTT(s string) []Line {
	var out []Line
	var cur *Line
	flush := func() {
		if cur != nil && cur.Text != "" {
			out = append(out, *cur)
		}
		cur = nil
	}
	for _, raw := range strings.Split(strings.ReplaceAll(s, "\r\n", "\n"), "\n") {
		line := strings.TrimSpace(raw)
		if m := cueTime.FindStringSubmatch(line); m != nil {
			flush()
			h := 0
			if m[1] != "" {
				h, _ = strconv.Atoi(strings.TrimSuffix(m[1], ":"))
			}
			mi, _ := strconv.Atoi(m[2])
			se, _ := strconv.Atoi(m[3])
			ms, _ := strconv.Atoi(m[4])
			cur = &Line{T: float64(h*3600+mi*60+se) + float64(ms)/1000}
			continue
		}
		if line == "" {
			flush()
			continue
		}
		if cur == nil {
			continue // header, NOTE or cue id
		}
		text := strings.TrimSpace(spaces.ReplaceAllString(html.UnescapeString(tag.ReplaceAllString(line, "")), " "))
		if text == "" {
			continue
		}
		if cur.Text != "" {
			cur.Text += " "
		}
		cur.Text += text
	}
	flush()
	for i := range out {
		out[i].T = math.Round(out[i].T*10) / 10
	}
	return out
}

// dedupeRolling cleans YouTube's automatic subtitles, where each cue repeats words of the one
// before it: it drops the longest run of words that ends the previous cue and starts this one.
func dedupeRolling(cues []Line) []Line {
	var out []Line
	var prev []string
	for _, c := range cues {
		words := strings.Fields(c.Text)
		for n := min(len(prev), len(words)); n > 0; n-- {
			if strings.Join(prev[len(prev)-n:], " ") == strings.Join(words[:n], " ") {
				words = words[n:]
				break
			}
		}
		prev = strings.Fields(c.Text)
		if len(words) == 0 {
			continue
		}
		out = append(out, Line{T: c.T, Text: strings.Join(words, " ")})
	}
	return out
}

var (
	notLyric    = regexp.MustCompile(`^[\[(].*[\])]$`) // "[Music]", "(upbeat music)"
	standAloneI = regexp.MustCompile(`\bi\b`)
)

// cleanLyrics tidies song subtitles: no ♪ marks, no "[Music]"-style cues, no line repeated
// right after itself, and lines written in capitals turned into normal case.
func cleanLyrics(cues []Line) []Line {
	var out []Line
	for _, c := range cues {
		text := strings.TrimSpace(strings.ReplaceAll(c.Text, "♪", ""))
		if text == "" || notLyric.MatchString(text) {
			continue
		}
		if strings.ToUpper(text) == text && strings.ToLower(text) != text {
			text = strings.ToLower(text)
			text = standAloneI.ReplaceAllString(text, "I")
			text = strings.ToUpper(text[:1]) + text[1:]
		}
		if n := len(out); n > 0 && out[n-1].Text == text {
			continue
		}
		out = append(out, Line{T: c.T, Text: text})
	}
	return out
}

// mergeSentences joins cues until a sentence ends (or the line gets too long), so a talk
// reads as sentences instead of screen-sized fragments.
func mergeSentences(cues []Line, max int) []Line {
	var out []Line
	for _, c := range cues {
		if n := len(out); n > 0 && !endsSentence(out[n-1].Text) && len(out[n-1].Text)+len(c.Text) < max {
			out[n-1].Text += " " + c.Text
			continue
		}
		out = append(out, c)
	}
	return out
}

func endsSentence(s string) bool {
	s = strings.TrimRight(s, `"')]`)
	return strings.HasSuffix(s, ".") || strings.HasSuffix(s, "?") || strings.HasSuffix(s, "!")
}

// videoID extracts the id from a YouTube URL (watch?v=, youtu.be/, embed/), or returns s.
func videoID(s string) string {
	u, err := url.Parse(s)
	if err != nil || u.Host == "" {
		return s
	}
	if v := u.Query().Get("v"); v != "" {
		return v
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	return parts[len(parts)-1]
}
