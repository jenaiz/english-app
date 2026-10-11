package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/jenaiz/english-app/backend/internal/auth"
	"github.com/jenaiz/english-app/backend/internal/config"
	"github.com/jenaiz/english-app/backend/internal/content"
	"github.com/jenaiz/english-app/backend/internal/db"
	"github.com/jenaiz/english-app/backend/internal/handlers"
	"github.com/jenaiz/english-app/backend/internal/store"
)

// version is set at build time (-ldflags "-X main.version=...").
var version = "dev"

func main() {
	cfg := config.Load()
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	catalog, err := content.Load(cfg.ContentDir)
	if err != nil {
		log.Fatalf("load content: %v", err)
	}
	log.Printf("loaded %d levels, %d units from %s", len(catalog.Summaries()), len(catalog.Units()), cfg.ContentDir)

	pool, err := db.Connect(ctx, cfg.DatabaseURL())
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	st := store.New(pool)
	tokens := auth.NewTokenManager(cfg.JWTSecret, cfg.JWTTTL)
	authH := &handlers.AuthHandler{Store: st, Tokens: tokens, CookieSecure: cfg.CookieSecure}
	levelsH := &handlers.LevelsHandler{Catalog: catalog}
	progressH := &handlers.ProgressHandler{Store: st, Catalog: catalog}
	srsH := &handlers.SRSHandler{Store: st, Catalog: catalog}

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			http.Error(w, "db unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte("ok"))
	})

	r.Route("/api", func(r chi.Router) {
		// Public health check with the build version, used by deploy/deploy.sh.
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			if err := pool.Ping(r.Context()); err != nil {
				w.WriteHeader(http.StatusServiceUnavailable)
				fmt.Fprintf(w, `{"status":"db unavailable","version":%q}`, version)
				return
			}
			fmt.Fprintf(w, `{"status":"ok","version":%q}`, version)
		})

		r.Post("/auth/register", authH.Register)
		r.Post("/auth/login", authH.Login)
		r.Post("/auth/logout", authH.Logout)

		r.Group(func(r chi.Router) {
			r.Use(tokens.Middleware)
			r.Get("/auth/me", authH.Me)
			r.Get("/levels", levelsH.List)
			r.Get("/levels/{levelID}/units/{unitID}", levelsH.Unit)
			r.Get("/progress", progressH.Get)
			r.Post("/progress/complete", progressH.Complete)
			r.Get("/srs/summary", srsH.Summary)
			r.Get("/srs/due", srsH.Due)
			r.Post("/srs/review", srsH.Review)
		})
	})

	srv := &http.Server{Addr: ":" + cfg.Port, Handler: r, ReadHeaderTimeout: 10 * time.Second}
	go func() {
		log.Printf("listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()
	log.Println("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(shutdownCtx)
}
