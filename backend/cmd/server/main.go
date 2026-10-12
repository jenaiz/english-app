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
	"github.com/jenaiz/english-app/backend/internal/mail"
	"github.com/jenaiz/english-app/backend/internal/store"
)

// version is set at build time (-ldflags "-X main.version=...").
var version = "dev"

func main() {
	cfg := config.Load()
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	contentDirs := []string{cfg.ContentDir}
	if cfg.LabDir != "" {
		contentDirs = []string{cfg.LabDir, cfg.ContentDir}
		log.Printf("LAB_CONTENT_DIR set: loading dev-only lab content from %s", cfg.LabDir)
	}
	catalog, err := content.Load(contentDirs...)
	if err != nil {
		log.Fatalf("load content: %v", err)
	}
	log.Printf("loaded %d levels, %d units from %s", len(catalog.Summaries()), len(catalog.Units()), cfg.ContentDir)
	expressions, err := content.LoadExpressions(cfg.ExpressionsDir)
	if err != nil {
		log.Fatalf("load expressions: %v", err)
	}
	log.Printf("loaded %d idioms, %d phrasal verb families, %d hacks from %s", len(expressions.Idioms), len(expressions.PhrasalVerbs), len(expressions.Hacks), cfg.ExpressionsDir)
	club, err := content.LoadClub(cfg.ClubDir, cfg.LabClubDir, catalog, expressions)
	if err != nil {
		log.Fatalf("load club: %v", err)
	}
	log.Printf("loaded %d club activities from %s", len(club.Activities), cfg.ClubDir)
	voices, err := content.LoadVoices(cfg.VoicesFile)
	if err != nil {
		log.Fatalf("load voices: %v", err)
	}
	if err := catalog.CheckSpeakers(voices); err != nil {
		log.Fatalf("content: %v", err)
	}

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
	tokens.CookieSecure = cfg.CookieSecure
	var mailer mail.Sender = mail.LogSender{}
	if cfg.AWSAccessKeyID != "" && cfg.AWSSecretAccessKey != "" {
		ses, err := mail.NewSESSender(ctx, cfg.MailFrom, cfg.AWSRegion, cfg.AWSAccessKeyID, cfg.AWSSecretAccessKey)
		if err != nil {
			log.Fatalf("mail: %v", err)
		}
		mailer = ses
	} else {
		log.Println("AWS credentials not set: emails are written to the log instead of sent")
	}
	authH := &handlers.AuthHandler{Store: st, Tokens: tokens, GoogleAuth: auth.NewGoogleVerifier(cfg.GoogleClientID), CookieSecure: cfg.CookieSecure, GAMeasurementID: cfg.GAMeasurementID, Mail: mailer, AppURL: cfg.AppURL}
	if cfg.GoogleClientID == "" {
		log.Println("GOOGLE_CLIENT_ID not set: Google sign-in disabled")
	}
	levelsH := &handlers.LevelsHandler{Catalog: catalog}
	progressH := &handlers.ProgressHandler{Store: st, Catalog: catalog, Club: club}
	clubH := &handlers.ClubHandler{Store: st, Catalog: catalog, Club: club}
	srsH := &handlers.SRSHandler{Store: st, Catalog: catalog, Expressions: expressions}
	expressionsH := &handlers.ExpressionsHandler{Expressions: expressions}
	audioH := &handlers.AudioHandler{Voices: voices, Dir: cfg.AudioDir}

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
		r.Get("/auth/config", authH.Config)
		r.Post("/auth/google", authH.Google)
		r.Post("/auth/verify-email", authH.VerifyEmail)
		r.Post("/auth/resend-verification", authH.ResendVerification)
		r.Post("/auth/forgot-password", authH.ForgotPassword)
		r.Post("/auth/reset-password", authH.ResetPassword)
		r.Get("/expressions", expressionsH.List)
		r.Get("/voices", audioH.VoiceMap)
		r.Get("/audio", audioH.Line)

		r.Group(func(r chi.Router) {
			r.Use(tokens.Middleware)
			r.Get("/auth/me", authH.Me)
			r.Patch("/account", authH.UpdateAccount)
			r.Post("/account/password", authH.ChangePassword)
			r.Get("/account/export", authH.ExportAccount)
			r.Delete("/account", authH.DeleteAccount)
			r.Get("/levels", levelsH.List)
			r.Get("/levels/{levelID}/units/{unitID}", levelsH.Unit)
			r.Get("/levels/{levelID}/study", levelsH.Study)
			r.Get("/progress", progressH.Get)
			r.Post("/progress/complete", progressH.Complete)
			r.Get("/progress/position/{unitID}", progressH.GetPosition)
			r.Put("/progress/position", progressH.SavePosition)
			r.Get("/club", clubH.List)
			r.Get("/club/summary", clubH.Summary)
			r.Get("/club/{activityID}", clubH.Get)
			r.Post("/club/{activityID}/complete", clubH.Complete)
			r.Get("/srs/summary", srsH.Summary)
			r.Get("/srs/due", srsH.Due)
			r.Post("/srs/review", srsH.Review)
			r.Get("/srs/expressions", srsH.SavedExpressions)
			r.Post("/srs/expressions", srsH.AddExpression)
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
