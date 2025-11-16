package websockets

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/corentings/chess/v2"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/hunterMotko/chess-game/internal/database"
	"github.com/hunterMotko/chess-game/internal/game"
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
	// In development, allow connections without Origin header (direct connections)
	if origin == "" {
		log.Printf("WebSocket connection accepted (no origin header - development mode)")
		return true
	}
	// Allow localhost development ports (5173, 5174, etc.)
	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:5174",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:5174",
	}
	for _, allowed := range allowedOrigins {
		if origin == allowed {
			log.Printf("WebSocket connection accepted from origin: %s", origin)
			return true
		}
	}
	log.Printf("WebSocket connection rejected: origin %s not in allowed origins", origin)
	return false
}

type Manager struct {
	clients     Clients // gameId -> Client connections
	gameService *game.GameService
	sync.RWMutex
	handlers map[string]EventHandler
}

func NewManager(ctx context.Context, db *database.Service) *Manager {
	m := &Manager{
		clients:     make(Clients),
		gameService: game.NewGameService(db),
		handlers:    make(map[string]EventHandler),
	}
	m.setupHandlers()
	return m
}

func (m *Manager) setupHandlers() {
	// Core chess game handlers only
	m.handlers[NewAIGame] = m.NewAIGameHandler
	m.handlers[Move] = m.MoveHandler
	m.handlers[AIMove] = m.AIMoveHandler
	m.handlers[GameOver] = m.GameOverHandler
}

func (m *Manager) routeEvent(e Event, c *Client) error {
	log.Printf("Routing event: %s from client %s", e.Type, c.clientId)
	if handler, ok := m.handlers[e.Type]; ok {
		if err := handler(e, c); err != nil {
			log.Printf("Handler error for %s: %v", e.Type, err)
			return err
		}
		log.Printf("Handler completed successfully for %s", e.Type)
		return nil
	}
	log.Printf("Unknown event type: %s", e.Type)
	return fmt.Errorf("Event ERROR: Event or handler unknown")
}

func NewGameHandler(e Event, c *Client) error {
	log.Printf("Starting new game for client %s", c.gameId)
	c.gameState = chess.NewGame()

	// Broadcast initial game state
	gameStatePayload := map[string]interface{}{
		"position":    c.gameState.Position().String(),
		"fen":         c.gameState.FEN(),
		"turn":        c.gameState.Position().Turn().String(),
		"isCheck":     false,
		"isCheckmate": false,
		"isStalemate": false,
		"lastMove":    nil,
	}

	payloadBytes, _ := json.Marshal(gameStatePayload)
	gameStateEvent := Event{
		Type:    "game_state",
		Payload: json.RawMessage(payloadBytes),
	}

	c.manager.broadcastToGame(c.gameId, gameStateEvent)
	return nil
}

func (m *Manager) MoveHandler(e Event, c *Client) error {
	// Parse move from payload (support both old and new format)
	var moveData struct {
		From string `json:"from"`
		To   string `json:"to"`
		Move string `json:"move"` // UCI format
	}

	if err := json.Unmarshal(e.Payload, &moveData); err != nil {
		log.Printf("Error parsing move data: %v", err)
		return fmt.Errorf("invalid move format: %v", err)
	}

	// Use UCI format if available, otherwise construct from from/to
	moveStr := moveData.Move
	if moveStr == "" {
		moveStr = moveData.From + moveData.To
	}

	log.Printf("🎯 Processing move %s for game %s from client %s", moveStr, c.gameId, c.clientId)

	// Skip game service operations in test environment
	if m.gameService == nil {
		log.Printf("Game service is nil - skipping move processing (test environment)")
		return nil
	}

	// Use game service to make the move
	// Note: We need to use the actual playerId that was used when creating the game
	// For now, let's try to find which player this client represents
	gameState, exists := m.gameService.GetGame(c.gameId)
	if !exists {
		return fmt.Errorf("game not found")
	}

	// Find the human player in this game (non-AI player)
	var humanPlayerId string
	for _, player := range gameState.Players {
		if !player.IsAI {
			humanPlayerId = player.ID
			break
		}
	}

	// If no human player found, the game may not be properly initialized
	if humanPlayerId == "" {
		return fmt.Errorf("no human player found - game may not be properly initialized")
	}

	log.Printf("🎲 Calling MakeMove with gameId=%s, playerId=%s (found from game), move=%s", c.gameId, humanPlayerId, moveStr)
	result, err := m.gameService.MakeMove(c.gameId, humanPlayerId, moveStr)
	if err != nil {
		log.Printf("❌ Error making move via game service: %v", err)
		return fmt.Errorf("failed to make move: %v", err)
	}

	// Update client's local game state to match service
	gameState2, exists2 := m.gameService.GetGame(c.gameId)
	if exists2 {
		c.gameState = gameState2.ChessGame
	}

	log.Printf("✅ Move applied via game service: %s", result.Move)

	// Broadcast updated game state
	m.broadcastGameState(c.gameId)

	// Check if this is an AI game and trigger AI response
	if !result.IsCheckmate && !result.IsStalemate {
		log.Printf("🤖 Triggering AI response check for game %s", c.gameId)
		go m.triggerAIResponseIfNeeded(c.gameId)
	} else {
		log.Printf("🏁 Game over, not triggering AI (checkmate: %v, stalemate: %v)", result.IsCheckmate, result.IsStalemate)
	}

	return nil
}

func (m *Manager) ServeWS(e echo.Context) error {
	log.Println("New WebSocket connection")
	gameId := e.Param("gameId")

	// Extract client identification
	clientId := e.QueryParam("clientId")
	userName := e.QueryParam("userName")

	// Default values
	if clientId == "" {
		clientId = uuid.New().String()
	}
	if userName == "" {
		userName = "Player"
	}

	conn, err := upgrader.Upgrade(e.Response(), e.Request(), nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return err
	}

	client := NewClient(conn, m, gameId, clientId, userName, ClientTypePlayer)
	m.addClient(client)

	log.Printf("Client %s connected to game %s", clientId, gameId)

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
		log.Printf("Client %s disconnected from game %s", c.clientId, c.gameId)
	}
}

func (m *Manager) broadcastToGame(gameId string, event Event) {
	m.RLock()
	defer m.RUnlock()

	log.Printf("📡 Broadcasting %s event to game %s", event.Type, gameId)
	clientCount := 0
	successCount := 0

	for client := range m.clients {
		if client.gameId == gameId {
			clientCount++
			log.Printf("🎯 Found client %s for game %s", client.clientId, gameId)
			select {
			case client.egress <- event:
				successCount++
				log.Printf("✅ Event queued for client %s", client.clientId)
			default:
				// Client's egress channel is full, skip this client
				log.Printf("❌ Could not send event to client %s, channel full", client.clientId)
			}
		}
	}

	log.Printf("📊 Broadcast complete: %d/%d clients in game %s received event %s", successCount, clientCount, gameId, event.Type)
}

func (m *Manager) broadcastGameState(gameId string) {
	gameState, err := m.gameService.GetGameState(gameId)
	if err != nil {
		log.Printf("Failed to get game state: %v", err)
		return
	}

	payloadBytes, _ := json.Marshal(gameState)
	event := Event{
		Type:    GameState,
		Payload: json.RawMessage(payloadBytes),
	}

	m.broadcastToGame(gameId, event)
}

func (m *Manager) NewAIGameHandler(e Event, c *Client) error {
	var aiGameData struct {
		Difficulty  int    `json:"difficulty"`
		PlayerID    string `json:"playerId"`
		PlayerName  string `json:"playerName"`
		PlayerColor string `json:"playerColor"` // "white" or "black"
	}

	if err := json.Unmarshal(e.Payload, &aiGameData); err != nil {
		return fmt.Errorf("invalid AI game data: %v", err)
	}

	// Default to white if not specified
	if aiGameData.PlayerColor == "" {
		aiGameData.PlayerColor = "white"
	}

	log.Printf("Starting new AI game for client %s (difficulty: %d, player color: %s)", c.gameId, aiGameData.Difficulty, aiGameData.PlayerColor)

	// Skip game service operations in test environment
	if m.gameService == nil {
		log.Printf("Game service is nil - skipping game creation (test environment)")
		return nil
	}

	// Create AI game in game service
	_, err := m.gameService.CreateGame(c.gameId, game.HumanVsAI, aiGameData.Difficulty)
	if err != nil {
		return fmt.Errorf("failed to create AI game: %v", err)
	}

	// Determine player color
	var humanColor chess.Color
	if aiGameData.PlayerColor == "black" {
		humanColor = chess.Black
	} else {
		humanColor = chess.White
	}

	// Join as human player with chosen color
	if err := m.gameService.JoinGame(c.gameId, aiGameData.PlayerID, aiGameData.PlayerName, humanColor); err != nil {
		return fmt.Errorf("failed to join game: %v", err)
	}

	// Sync client state with game service state
	gameState, exists := m.gameService.GetGame(c.gameId)
	if exists {
		c.gameState = gameState.ChessGame
	}

	m.broadcastGameState(c.gameId)

	// Note: AI move will be triggered by frontend after opening moves are replayed
	log.Printf("✅ AI game initialized. Frontend will trigger AI move after position sync.")

	return nil
}

func (m *Manager) AIMoveHandler(e Event, c *Client) error {
	log.Printf("🎯 AIMoveHandler called for game %s", c.gameId)

	// Skip game service operations in test environment
	if m.gameService == nil {
		log.Printf("Game service is nil - skipping AI move processing (test environment)")
		return nil
	}

	// Get AI move from game service
	log.Printf("🧠 Calling gameService.GetAIMove for game %s", c.gameId)
	result, err := m.gameService.GetAIMove(c.gameId)
	if err != nil {
		log.Printf("❌ GetAIMove failed: %v", err)
		return fmt.Errorf("failed to get AI move: %v", err)
	}
	log.Printf("🎲 AI move generated: %s", result.Move)

	// Update client game state
	gameState, exists := m.gameService.GetGame(c.gameId)
	if exists {
		c.gameState = gameState.ChessGame
	}

	// Send AI move event to frontend
	// Parse the UCI move to extract from/to for backward compatibility
	uciMove := result.Move
	var from, to, promotion string
	if len(uciMove) >= 4 {
		from = uciMove[:2]
		to = uciMove[2:4]
		if len(uciMove) > 4 {
			promotion = uciMove[4:]
		}
	}

	aiMovePayload := map[string]interface{}{
		"move":        result.Move, // UCI format (e.g., "e2e4", "e7e8q")
		"from":        from,        // For backward compatibility
		"to":          to,          // For backward compatibility
		"promotion":   promotion,   // For backward compatibility
		"fen":         result.FEN,
		"turn":        result.Turn.String(),
		"isCheck":     result.IsCheck,
		"isCheckmate": result.IsCheckmate,
		"isStalemate": result.IsStalemate,
		"gameStatus":  result.GameStatus,
	}

	payloadBytes, _ := json.Marshal(aiMovePayload)
	aiMoveEvent := Event{
		Type:    AIMove,
		Payload: json.RawMessage(payloadBytes),
	}

	log.Printf("📤 Broadcasting AI move to game %s: %s", c.gameId, result.Move)
	m.broadcastToGame(c.gameId, aiMoveEvent)

	// Also broadcast the new game state
	log.Printf("📤 Broadcasting updated game state")
	m.broadcastGameState(c.gameId)

	log.Printf("✅ AI move completed and sent: %s", result.Move)
	return nil
}

func (m *Manager) triggerAIResponseIfNeeded(gameId string) {
	log.Printf("🔍 Starting AI response check for game %s", gameId)
	// Reduced delay for better responsiveness - just enough for state sync
	time.Sleep(250 * time.Millisecond)

	// Get game from service to check if it's an AI game
	gameState, exists := m.gameService.GetGame(gameId)
	if !exists {
		log.Printf("❌ Game %s not found for AI response check", gameId)
		return
	}

	log.Printf("🎮 Game %s found, type: %s", gameId, gameState.Type)

	// Only trigger AI if it's an AI game and it's AI's turn
	if gameState.Type == game.HumanVsAI {
		currentTurn := gameState.ChessGame.Position().Turn()
		log.Printf("♟️ Current turn: %s", currentTurn.String())

		// Debug: Show all players
		for color, player := range gameState.Players {
			log.Printf("👤 Player %s: %s (IsAI: %v)", color.String(), player.Name, player.IsAI)
		}

		// Check if current turn belongs to AI player
		aiPlayer, exists := gameState.Players[currentTurn]
		if !exists {
			log.Printf("❌ No player found for current turn %s", currentTurn.String())
			return
		}
		if aiPlayer.IsAI {
			log.Printf("🤖 AI's turn confirmed! Generating AI move for game %s", gameId)

			// Find a client in this game to send the AI move request
			m.RLock()
			var targetClient *Client
			for client := range m.clients {
				if client.gameId == gameId {
					targetClient = client
					break
				}
			}
			m.RUnlock()

			if targetClient != nil {
				log.Printf("📡 Found client, calling AIMoveHandler...")
				// Create AI move event and process it
				aiMoveEvent := Event{
					Type:    AIMove,
					Payload: json.RawMessage(`{}`),
				}

				// Process AI move
				if err := m.AIMoveHandler(aiMoveEvent, targetClient); err != nil {
					log.Printf("❌ Error processing AI move for game %s: %v", gameId, err)
				} else {
					log.Printf("✅ AI move handler completed successfully")
				}
			} else {
				log.Printf("❌ No client found for AI response in game %s", gameId)
			}
		} else {
			log.Printf("👨 Human's turn, not triggering AI (player: %s)", aiPlayer.Name)
		}
	} else {
		log.Printf("🚫 Not an AI game, type is: %s", gameState.Type)
	}
}

func (m *Manager) GameOverHandler(e Event, c *Client) error {
	log.Printf("Game over event received for game %s", c.gameId)

	// Parse game over data from payload
	var gameOverData struct {
		Result string `json:"result"`
		Winner string `json:"winner,omitempty"`
		Reason string `json:"reason,omitempty"`
	}

	if err := json.Unmarshal(e.Payload, &gameOverData); err != nil {
		log.Printf("Error parsing game over data: %v", err)
		return fmt.Errorf("invalid game over data: %v", err)
	}

	log.Printf("Game %s ended with result: %s", c.gameId, gameOverData.Result)

	// Broadcast game over event to all clients in the game
	m.broadcastToGame(c.gameId, e)

	return nil
}
