package handlers

import (
	"net/http"

	"github.com/jenaiz/english-app/backend/internal/content"
)

type ExpressionsHandler struct {
	Expressions *content.Expressions
}

// List returns the whole Expresiones catalog. It is public so the section works before signing up.
func (h *ExpressionsHandler) List(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.Expressions)
}
