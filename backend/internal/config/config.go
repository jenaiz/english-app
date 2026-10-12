package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port         string
	DBHost       string
	DBPort       string
	DBUser       string
	DBPassword   string
	DBName       string
	DBSSLMode    string
	JWTSecret    string
	JWTTTL       time.Duration
	CookieSecure bool
	ContentDir   string
	// LabDir holds dev-only showcase content (every exercise type), loaded before ContentDir
	// so it comes first. Empty in production.
	LabDir string
	// ExpressionsDir holds the Expresiones content; defaults to a sibling of ContentDir.
	ExpressionsDir string
	// ClubDir holds the Club activities (songs, readings, videos…); defaults to a sibling of ContentDir.
	// LabClubDir holds dev-only showcase activities, always open. Empty in production.
	ClubDir    string
	LabClubDir string
	// VoicesFile maps dialogue speakers to TTS voices; AudioDir holds the pre-generated MP3s.
	// Both default to siblings of ContentDir.
	VoicesFile string
	AudioDir   string
	// GoogleClientID enables "Sign in with Google" when set (OAuth web client ID).
	GoogleClientID string
	// GAMeasurementID enables Google Analytics (loaded only after cookie consent).
	GAMeasurementID string
	// AppURL is the public URL of the frontend, used for links in emails.
	AppURL string
	// Email is sent through Amazon SES (same account as bukios). Without AWS
	// credentials emails are only written to the log.
	MailFrom           string
	AWSRegion          string
	AWSAccessKeyID     string
	AWSSecretAccessKey string
}

func Load() Config {
	cfg := Config{
		Port:               getEnv("PORT", "8080"),
		DBHost:             getEnv("DB_HOST", "localhost"),
		DBPort:             getEnv("DB_PORT", "5432"),
		DBUser:             getEnv("DB_USER", "english"),
		DBPassword:         getEnv("DB_PASSWORD", "english"),
		DBName:             getEnv("DB_NAME", "english_app"),
		DBSSLMode:          getEnv("DB_SSLMODE", "disable"),
		JWTSecret:          getEnv("JWT_SECRET", ""),
		JWTTTL:             30 * 24 * time.Hour, // renewed while the user keeps visiting (see auth.RefreshAfter)
		ContentDir:         getEnv("CONTENT_DIR", "./data/levels"),
		LabDir:             getEnv("LAB_CONTENT_DIR", ""),
		LabClubDir:         getEnv("LAB_CLUB_DIR", ""),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GAMeasurementID:    getEnv("GA_MEASUREMENT_ID", ""),
		AppURL:             strings.TrimRight(getEnv("APP_URL", "http://localhost:3000"), "/"),
		MailFrom:           getEnv("MAIL_FROM", "Fluently <no-reply@bukios.com>"),
		AWSRegion:          getEnv("AWS_REGION", "eu-west-1"),
		AWSAccessKeyID:     getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY", ""),
	}
	cfg.ExpressionsDir = getEnv("EXPRESSIONS_DIR", filepath.Join(filepath.Dir(cfg.ContentDir), "expressions"))
	cfg.ClubDir = getEnv("CLUB_DIR", filepath.Join(filepath.Dir(cfg.ContentDir), "club"))
	cfg.VoicesFile = getEnv("VOICES_FILE", filepath.Join(filepath.Dir(cfg.ContentDir), "voices.json"))
	cfg.AudioDir = getEnv("AUDIO_DIR", filepath.Join(filepath.Dir(cfg.ContentDir), "audio"))
	cfg.CookieSecure, _ = strconv.ParseBool(getEnv("COOKIE_SECURE", "false"))
	if cfg.JWTSecret == "" {
		log.Println("WARNING: JWT_SECRET not set, using an insecure development secret")
		cfg.JWTSecret = "dev-insecure-secret-change-me"
	}
	return cfg
}

func (c Config) DatabaseURL() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode)
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
