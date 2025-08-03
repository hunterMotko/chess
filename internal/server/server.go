package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/hunterMotko/chess-game/internal/database"
	"github.com/hunterMotko/chess-game/internal/websockets"
	_ "github.com/joho/godotenv/autoload"
)

type Server struct {
	addr    string
	db      *database.Service
	manager *websockets.Manager
}

func NewServer() *http.Server {
	env := os.Getenv("APP_ENV")
	var port int

	if env == "development" {
		port, _ = strconv.Atoi(os.Getenv("DEV"))
	} else {
		port, _ = strconv.Atoi(os.Getenv("PRO"))
	}

	ctx := context.Background()
	manager := websockets.NewManager(ctx)
	NewServer := &Server{
		addr:    fmt.Sprintf(":%d", port),
		db:      database.New(),
		manager: manager,
	}

	server := &http.Server{
		Addr:         NewServer.addr,
		Handler:      NewServer.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server
}
