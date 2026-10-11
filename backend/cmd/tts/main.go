// Command tts pre-generates one MP3 per dialogue line and passage with Azure Speech,
// using the fixed voice of each speaker (data/voices.json). Existing files are kept,
// so it only synthesises new or edited lines.
//
//	go run ./cmd/tts [-dry-run] [-prune]
//
// The key and region come from the environment or, if unset there, from the repo's .env:
// AZURE_SPEECH_KEY_1 (or AZURE_SPEECH_KEY) and AZURE_SPEECH_LOCATION (or AZURE_SPEECH_REGION).
package main

import (
	"bytes"
	"encoding/xml"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jenaiz/english-app/backend/internal/config"
	"github.com/jenaiz/english-app/backend/internal/content"
)

func main() {
	dryRun := flag.Bool("dry-run", false, "list what would be generated without calling Azure")
	prune := flag.Bool("prune", false, "delete MP3s no longer used by any line")
	flag.Parse()

	for _, f := range []string{"../.env", ".env"} {
		loadDotEnv(f)
	}
	cfg := config.Load()
	catalog, err := content.Load(cfg.ContentDir)
	if err != nil {
		log.Fatalf("load content: %v", err)
	}
	voices, err := content.LoadVoices(cfg.VoicesFile)
	if err != nil {
		log.Fatal(err)
	}
	if err := catalog.CheckSpeakers(voices); err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll(cfg.AudioDir, 0o755); err != nil {
		log.Fatal(err)
	}

	key := firstEnv("AZURE_SPEECH_KEY", "AZURE_SPEECH_KEY_1", "AZURE_SPEECH_KEY_2")
	region := firstEnv("AZURE_SPEECH_REGION", "AZURE_SPEECH_LOCATION")
	if !*dryRun && (key == "" || region == "") {
		log.Fatal("set AZURE_SPEECH_KEY_1 and AZURE_SPEECH_LOCATION in .env or the environment (or use -dry-run)")
	}

	used := map[string]bool{}
	var created, chars int
	for _, l := range catalog.Lines() {
		name, _ := voices.AudioFile(l.Speaker, l.Text)
		if used[name] {
			continue
		}
		used[name] = true
		path := filepath.Join(cfg.AudioDir, name)
		if _, err := os.Stat(path); err == nil {
			continue
		}
		created++
		chars += len(l.Text)
		if *dryRun {
			fmt.Printf("%-14s %s\n", l.Speaker, l.Text)
			continue
		}
		audio, err := synthesize(key, region, voices[l.Speaker], l.Text)
		if err != nil {
			log.Fatalf("%s %q: %v", l.Speaker, l.Text, err)
		}
		if err := os.WriteFile(path, audio, 0o644); err != nil {
			log.Fatal(err)
		}
	}
	log.Printf("%d lines, %d new (%d characters)", len(used), created, chars)

	if *prune {
		files, _ := filepath.Glob(filepath.Join(cfg.AudioDir, "*.mp3"))
		for _, f := range files {
			if !used[filepath.Base(f)] {
				log.Printf("prune %s", filepath.Base(f))
				if !*dryRun {
					os.Remove(f)
				}
			}
		}
	}
}

// loadDotEnv sets the KEY=VALUE pairs of a .env file that are not already in the environment.
// A missing file is ignored.
func loadDotEnv(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		k, v, ok := strings.Cut(line, "=")
		if !ok || line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k = strings.TrimSpace(strings.TrimPrefix(k, "export "))
		v = strings.Trim(strings.TrimSpace(v), `"'`)
		if _, set := os.LookupEnv(k); !set {
			os.Setenv(k, v)
		}
	}
}

// firstEnv returns the first non-empty variable of names.
func firstEnv(names ...string) string {
	for _, n := range names {
		if v := os.Getenv(n); v != "" {
			return v
		}
	}
	return ""
}

var client = &http.Client{Timeout: 30 * time.Second}

func synthesize(key, region string, v content.Voice, text string) ([]byte, error) {
	var esc bytes.Buffer
	xml.EscapeText(&esc, []byte(strings.TrimSpace(text)))
	ssml := fmt.Sprintf(`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="%s"><voice name="%s">%s</voice></speak>`,
		v.Lang, v.Voice, esc.String())

	for attempt := 1; ; attempt++ {
		req, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("https://%s.tts.speech.microsoft.com/cognitiveservices/v1", region), strings.NewReader(ssml))
		req.Header.Set("Ocp-Apim-Subscription-Key", key)
		req.Header.Set("Content-Type", "application/ssml+xml")
		req.Header.Set("X-Microsoft-OutputFormat", "audio-24khz-48kbitrate-mono-mp3")
		req.Header.Set("User-Agent", "fluently-tts")
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, err
		}
		switch {
		case resp.StatusCode == http.StatusOK:
			return body, nil
		case resp.StatusCode == http.StatusTooManyRequests && attempt < 5:
			time.Sleep(time.Duration(attempt) * 2 * time.Second)
		default:
			return nil, fmt.Errorf("azure: %s %s", resp.Status, body)
		}
	}
}
