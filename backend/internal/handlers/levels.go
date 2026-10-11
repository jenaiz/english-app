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
