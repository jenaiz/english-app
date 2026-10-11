package content

import (
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
)

// NarratorSpeaker reads the passages of audio_context steps.
const NarratorSpeaker = "Narrator"

// Voice is the fixed TTS voice of a story character, e.g. {"en-IE-ConnorNeural", "en-IE", "male"}.
type Voice struct {
	Voice  string `json:"voice"`
	Lang   string `json:"lang"`
	Gender string `json:"gender"`
}

// Voices maps each dialogue speaker to its voice, so a character sounds the same in every lesson.
type Voices map[string]Voice

// Line is one piece of text to be read aloud by a speaker.
type Line struct {
	Speaker string
	Text    string
}

// LoadVoices reads and validates the speaker → voice map.
func LoadVoices(path string) (Voices, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var v Voices
	if err := json.Unmarshal(data, &v); err != nil {
		return nil, fmt.Errorf("voices: %w", err)
	}
	used := map[string]string{}
	for speaker, voice := range v {
		if voice.Voice == "" || voice.Lang == "" || (voice.Gender != "male" && voice.Gender != "female") {
			return nil, fmt.Errorf("voices: %q needs voice, lang and gender male|female", speaker)
		}
		if other, dup := used[voice.Voice]; dup {
			return nil, fmt.Errorf("voices: %q and %q share voice %s", speaker, other, voice.Voice)
		}
		used[voice.Voice] = speaker
	}
	if _, ok := v[NarratorSpeaker]; !ok {
		return nil, fmt.Errorf("voices: missing %q", NarratorSpeaker)
	}
	return v, nil
}

// AudioFile is the name of the pre-generated MP3 for a line: a hash of voice and text,
// so editing a line or changing a voice produces a new file.
func (v Voices) AudioFile(speaker, text string) (string, bool) {
	voice, ok := v[speaker]
	if !ok {
		return "", false
	}
	sum := sha1.Sum([]byte(voice.Voice + "|" + strings.TrimSpace(text)))
	return hex.EncodeToString(sum[:]) + ".mp3", true
}

// Lines returns every dialogue line and passage of the catalog, passages read by the narrator.
func (c *Catalog) Lines() []Line {
	var out []Line
	for _, ref := range c.lessonByID {
		for _, s := range ref.Lesson.Steps {
			if s.Type != "audio_context" {
				continue
			}
			var ac struct {
				Dialogue []struct{ Speaker, Text string } `json:"dialogue"`
				Passage  string                           `json:"passage"`
			}
			if json.Unmarshal(s.Content, &ac) != nil {
				continue
			}
			for _, d := range ac.Dialogue {
				out = append(out, Line{Speaker: d.Speaker, Text: d.Text})
			}
			if ac.Passage != "" {
				out = append(out, Line{Speaker: NarratorSpeaker, Text: ac.Passage})
			}
		}
	}
	return out
}

// CheckSpeakers fails if a dialogue uses a speaker without an assigned voice.
func (c *Catalog) CheckSpeakers(v Voices) error {
	missing := map[string]bool{}
	for _, l := range c.Lines() {
		if _, ok := v[l.Speaker]; !ok {
			missing[l.Speaker] = true
		}
	}
	if len(missing) == 0 {
		return nil
	}
	names := make([]string, 0, len(missing))
	for n := range missing {
		names = append(names, n)
	}
	sort.Strings(names)
	return fmt.Errorf("speakers without a voice in voices.json: %s", strings.Join(names, ", "))
}
