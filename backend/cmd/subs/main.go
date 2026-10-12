// Command subs turns a YouTube video's English subtitles into the timed lines of a Club
// activity: "transcript" for a video, "lines" for a song. It needs yt-dlp on the PATH.
//
//	go run ./cmd/subs [-song] [-lang en] <youtube URL or id>
//
// Subtitles written by people are preferred; if there are none it falls back to YouTube's
// automatic ones and says so, because those need a careful review. Video lines are merged into
// sentences; song lines are kept as they are. The JSON is printed to stdout: paste it into the
// activity and add the blanks and questions. If a song has no usable subtitles, time its lines
// by hand with the dev page /club/dev/timing.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	song := flag.Bool("song", false, "keep subtitle lines as they are (lyrics) instead of merging them into sentences")
	lang := flag.String("lang", "en", "subtitle language")
	flag.Parse()
	if flag.NArg() != 1 {
		fmt.Fprintln(os.Stderr, "usage: go run ./cmd/subs [-song] [-lang en] <youtube URL or id>")
		os.Exit(2)
	}
	if _, err := exec.LookPath("yt-dlp"); err != nil {
		log.Fatal("yt-dlp not found: install it first (brew install yt-dlp)")
	}
	video := flag.Arg(0)
	id := videoID(video)

	dir, err := os.MkdirTemp("", "subs")
	if err != nil {
		log.Fatal(err)
	}
	defer os.RemoveAll(dir)

	source := "manual"
	path, err := download(dir, video, *lang, "--write-subs")
	if err != nil {
		log.Fatal(err)
	}
	if path == "" {
		source = "auto"
		if path, err = download(dir, video, *lang, "--write-auto-subs"); err != nil {
			log.Fatal(err)
		}
	}
	if path == "" {
		log.Fatalf("%s has no %q subtitles: time the lines by hand at /club/dev/timing", video, *lang)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		log.Fatal(err)
	}
	cues := parseVTT(string(data))
	if source == "auto" {
		cues = dedupeRolling(cues)
		log.Println("only automatic subtitles: review every line before using them")
	}
	if *song {
		cues = cleanLyrics(cues)
	} else {
		cues = mergeSentences(cues, 160)
	}

	key := "transcript"
	if *song {
		key = "lines"
	}
	out := map[string]any{"youtube_id": id, "subtitles": source, key: cues}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	enc.SetEscapeHTML(false)
	if err := enc.Encode(out); err != nil {
		log.Fatal(err)
	}
}

// download fetches the subtitles with yt-dlp and returns the .vtt written, or "" if there was none.
func download(dir, video, lang, which string) (string, error) {
	cmd := exec.Command("yt-dlp", "--skip-download", which, "--sub-langs", lang+".*,"+lang,
		"--sub-format", "vtt", "-o", filepath.Join(dir, "%(id)s.%(ext)s"), video)
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("yt-dlp: %w", err)
	}
	files, _ := filepath.Glob(filepath.Join(dir, "*.vtt"))
	if len(files) == 0 {
		return "", nil
	}
	return files[0], nil
}
