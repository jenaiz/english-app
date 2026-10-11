package handlers

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/jenaiz/english-app/backend/internal/content"
)

type AudioHandler struct {
	Voices content.Voices
	Dir    string
}

// VoiceMap returns the speaker → voice map, used by the browser fallback when an MP3 is missing.
func (h *AudioHandler) VoiceMap(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.Voices)
}

// Line serves the pre-generated MP3 of ?speaker=&text=, or 404 so the client falls back to browser speech.
func (h *AudioHandler) Line(w http.ResponseWriter, r *http.Request) {
	name, ok := h.Voices.AudioFile(r.URL.Query().Get("speaker"), r.URL.Query().Get("text"))
	if !ok {
		http.NotFound(w, r)
		return
	}
	path := filepath.Join(h.Dir, name)
	if _, err := os.Stat(path); err != nil {
		http.NotFound(w, r)
		return
	}
	// The file name depends on voice and text, so the response never changes for a URL.
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeFile(w, r, path)
}
