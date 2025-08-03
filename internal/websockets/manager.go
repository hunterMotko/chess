package websockets

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/corentings/chess/v2"
	"github.com/gorilla/websocket"
	_ "github.com/joho/godotenv/autoload"
	"github.com/labstack/echo/v4"
)

const (
	bufSize = 1024
)

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  bufSize,
		WriteBufferSize: bufSize,
		CheckOrigin:     checkOrigin,
	}
)

func checkOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	clientOrigin := os.Getenv("CLIENT_ORIGIN")
	fmt.Println(origin, clientOrigin)

	return true
}

type Manager struct {
	clients Clients
	sync.RWMutex
	handlers map[string]EventHandler
}

func NewManager(ctx context.Context) *Manager {
	m := &Manager{
		clients:  make(Clients),
		handlers: make(map[string]EventHandler),
	}
	m.setupHandlers()
	return m
}

func (m *Manager) setupHandlers() {
	m.handlers[NewGame] = NewGameHandler
	m.handlers[Move] = MoveHandler
	m.handlers[LoadPGN] = LoadPgnHandler
	m.handlers[GameOver] = GameOverHandler
}

func (m *Manager) routeEvent(e Event, c *Client) error {
	if handler, ok := m.handlers[e.Type]; ok {
		if err := handler(e, c); err != nil {
			return err
		}
		return nil
	}
	return fmt.Errorf("Event ERROR: Event or handler unknown")
}

func NewGameHandler(e Event, c *Client) error {
	log.Println("NEW GAME: \n", e, c)
	c.gameState = chess.NewGame()
	return nil
}

func MoveHandler(e Event, c *Client) error {
	log.Println("MOVE: \n", e, c)
	return nil
}

func LoadPgnHandler(e Event, c *Client) error {
	reader := bytes.NewReader(e.Payload)
	pgn, err := chess.PGN(reader)
	if err != nil {
		return err
	}
	log.Println(pgn)
	log.Println("LOAD PGN: \n", e, c)
	return nil
}

func GameOverHandler(e Event, c *Client) error {
	log.Println("GAME OVER: \n", e, c)
	return nil
}

func (m *Manager) ServeWS(e echo.Context) error {
	log.Println("new connection")
	gameId := e.Param("gameId")
	conn, err := upgrader.Upgrade(e.Response(), e.Request(), nil)
	if err != nil {
		log.Println(err)
		return err
	}

	client := NewClient(conn, m, gameId)
	m.addClient(client)
	go client.readMessages()
	go client.writeMessages()

	return nil
}

func (m *Manager) addClient(c *Client) {
	m.Lock()
	m.clients[c] = true
	m.Unlock()
}

func (m *Manager) removeClient(c *Client) {
	m.Lock()
	defer m.Unlock()
	if _, ok := m.clients[c]; ok {
		c.conn.Close()
		delete(m.clients, c)
	}
}
