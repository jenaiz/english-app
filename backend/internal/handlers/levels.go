package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jenaiz/english-app/backend/internal/content"
)

type LevelsHandler struct {
	Catalog *content.Catalog
}

func (h *LevelsHandler) List(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.Catalog.Summaries())
}

func (h *LevelsHandler) Unit(w http.ResponseWriter, r *http.Request) {
	levelID := chi.URLParam(r, "levelID")
	// "-" lets clients fetch a unit without knowing its level.
	if levelID == "-" {
		levelID = ""
	}
	ref, ok := h.Catalog.Unit(levelID, chi.URLParam(r, "unitID"))
	if !ok {
		writeError(w, http.StatusNotFound, "unit not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"level_id": ref.LevelID,
		"theme_id": ref.ThemeID,
		"unit":     ref.Unit,
	})
}

// Study returns the grammar and vocabulary of every unit in a level.
func (h *LevelsHandler) Study(w http.ResponseWriter, r *http.Request) {
	study, ok := h.Catalog.Study(chi.URLParam(r, "levelID"))
	if !ok {
		writeError(w, http.StatusNotFound, "level not found")
		return
	}
	writeJSON(w, http.StatusOK, study)
}
