package game

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/corentings/chess/v2"
	"github.com/hunterMotko/chess-game/internal/database"
	"github.com/hunterMotko/chess-game/internal/engine"
)

type GameType string

const (
	HumanVsHuman GameType = "human_vs_human"
	HumanVsAI    GameType = "human_vs_ai"
	AIVsAI       GameType = "ai_vs_ai"
)

type GameState struct {
	ID           string
	Type         GameType
	ChessGame    *chess.Game
	Players      map[chess.Color]Player
	CurrentTurn  chess.Color
	Status       GameStatus
	CreatedAt    time.Time
	LastMoveAt   time.Time
	AIEngine     *engine.StockfishEngine
	AIDifficulty int
	MoveHistory  []string // Store move history for persistence
	mutex        sync.RWMutex
}

type Player struct {
	ID     string
	Name   string
	IsAI   bool
	Color  chess.Color
	Rating int
}

type GameStatus string

const (
	StatusWaiting    GameStatus = "waiting"
	StatusInProgress GameStatus = "in_progress"
	StatusCompleted  GameStatus = "completed"
	StatusAbandoned  GameStatus = "abandoned"
)

type GameService struct {
	games map[string]*GameState
	db    *database.Service
	mutex sync.RWMutex
}

func NewGameService(db *database.Service) *GameService {
	return &GameService{
		games: make(map[string]*GameState),
		db:    db,
	}
}

func (gs *GameService) CreateGame(gameID string, gameType GameType, difficulty int) (*GameState, error) {
	gs.mutex.Lock()
	defer gs.mutex.Unlock()
	
	// If game already exists, delete it first to allow clean restart
	if existingGame, exists := gs.games[gameID]; exists {
		log.Printf("Game %s already exists, cleaning up before creating new game", gameID)
		if existingGame.AIEngine != nil {
			existingGame.AIEngine.Close()
		}
		delete(gs.games, gameID)
	}
	
	chessGame := chess.NewGame()
	game := &GameState{
		ID:           gameID,
		Type:         gameType,
		ChessGame:    chessGame,
		Players:      make(map[chess.Color]Player),
		CurrentTurn:  chessGame.Position().Turn(), // Sync with actual chess state
		Status:       StatusWaiting,
		CreatedAt:    time.Now(),
		AIDifficulty: difficulty,
		MoveHistory:  []string{}, // Initialize empty move history
	}
	
	// Initialize AI engine for AI games
	if gameType == HumanVsAI || gameType == AIVsAI {
		stockfishEngine, err := engine.NewStockfish()
		if err != nil {
			log.Printf("Warning: Could not initialize Stockfish engine: %v", err)
			log.Printf("Game %s will continue without AI opponent", gameID)
		} else {
			game.AIEngine = stockfishEngine
			if err := stockfishEngine.SetDifficulty(difficulty); err != nil {
				log.Printf("Warning: Could not set AI difficulty: %v", err)
			}
		}
	}
	
	gs.games[gameID] = game
	
	// Save to database if available
	if gs.db != nil {
		ctx := context.Background()
		err := gs.db.CreateGame(ctx, gameID, string(gameType), string(StatusWaiting), 
			game.ChessGame.FEN(), nil, nil, nil, nil, "white", difficulty)
		if err != nil {
			log.Printf("Warning: Failed to save game to database: %v", err)
		}
	}
	
	log.Printf("Created new game: %s (type: %s, difficulty: %d)", gameID, gameType, difficulty)
	
	return game, nil
}

func (gs *GameService) GetGame(gameID string) (*GameState, bool) {
	gs.mutex.RLock()
	defer gs.mutex.RUnlock()
	
	game, exists := gs.games[gameID]
	return game, exists
}

func (gs *GameService) JoinGame(gameID, playerID, playerName string, color chess.Color) error {
	gs.mutex.Lock()
	defer gs.mutex.Unlock()
	
	game, exists := gs.games[gameID]
	if !exists {
		return fmt.Errorf("game %s not found", gameID)
	}
	
	game.mutex.Lock()
	defer game.mutex.Unlock()
	
	// Check if player slot is available
	if _, occupied := game.Players[color]; occupied {
		return fmt.Errorf("color %s already taken", color)
	}
	
	player := Player{
		ID:    playerID,
		Name:  playerName,
		IsAI:  false,
		Color: color,
	}
	
	game.Players[color] = player
	
	// For AI games, add AI player automatically
	if game.Type == HumanVsAI {
		aiColor := chess.Black
		if color == chess.Black {
			aiColor = chess.White
		}
		
		aiPlayer := Player{
			ID:    fmt.Sprintf("ai_%s", gameID),
			Name:  fmt.Sprintf("Stockfish (Level %d)", game.AIDifficulty),
			IsAI:  true,
			Color: aiColor,
		}
		game.Players[aiColor] = aiPlayer
	}
	
	// Start game if we have enough players
	if len(game.Players) >= 2 || game.Type == HumanVsAI {
		game.Status = StatusInProgress
		log.Printf("Game %s started", gameID)
	}
	
	return nil
}

func (gs *GameService) MakeMove(gameID string, playerID string, moveStr string) (*MoveResult, error) {
	game, exists := gs.GetGame(gameID)
	if !exists {
		return nil, fmt.Errorf("game %s not found", gameID)
	}
	
	game.mutex.Lock()
	defer game.mutex.Unlock()
	
	// Validate player can make this move - use actual chess game turn, not stored CurrentTurn
	actualTurn := game.ChessGame.Position().Turn()
	currentPlayer, exists := game.Players[actualTurn]
	if !exists {
		return nil, fmt.Errorf("no player assigned to current turn")
	}
	
	log.Printf("🔍 Move validation - Turn: %s, CurrentPlayer: %s (IsAI: %v), Incoming PlayerID: %s", 
		actualTurn.String(), currentPlayer.ID, currentPlayer.IsAI, playerID)
	
	if !currentPlayer.IsAI && currentPlayer.ID != playerID {
		return nil, fmt.Errorf("not your turn - expected player %s but got %s", currentPlayer.ID, playerID)
	}
	
	// Find and validate the move
	validMoves := game.ChessGame.ValidMoves()
	var selectedMove *chess.Move
	
	for _, move := range validMoves {
		if move.String() == moveStr || 
		   (len(move.String()) >= 4 && move.String()[:4] == moveStr) {
			selectedMove = &move
			break
		}
	}
	
	if selectedMove == nil {
		return nil, fmt.Errorf("invalid move: %s", moveStr)
	}
	
	// Apply move
	if err := game.ChessGame.Move(selectedMove, nil); err != nil {
		return nil, fmt.Errorf("failed to apply move: %v", err)
	}
	
	// Add move to history
	game.MoveHistory = append(game.MoveHistory, moveStr)
	game.LastMoveAt = time.Now()
	
	// Check game status
	result := &MoveResult{
		Move:         moveStr,
		FEN:          game.ChessGame.FEN(),
		Turn:         game.ChessGame.Position().Turn(),
		IsCheck:      game.ChessGame.Position().Status().String() == "in_check",
		IsCheckmate:  game.ChessGame.Method() == chess.Checkmate,
		IsStalemate:  game.ChessGame.Method() == chess.Stalemate,
		GameStatus:   game.Status,
	}
	
	// Update game status if ended
	if result.IsCheckmate || result.IsStalemate || game.ChessGame.Outcome() != chess.NoOutcome {
		game.Status = StatusCompleted
		result.GameStatus = StatusCompleted
		if game.AIEngine != nil {
			game.AIEngine.Close()
		}
	} else {
		// Switch turns
		game.CurrentTurn = game.ChessGame.Position().Turn()
	}
	
	log.Printf("Move made in game %s: %s", gameID, moveStr)
	return result, nil
}

func (gs *GameService) GetAIMove(gameID string) (*MoveResult, error) {
	game, exists := gs.GetGame(gameID)
	if !exists {
		return nil, fmt.Errorf("game %s not found", gameID)
	}
	
	game.mutex.Lock()
	defer game.mutex.Unlock()
	
	// Check if it's AI's turn - use actual chess game turn, not stored CurrentTurn
	actualTurn := game.ChessGame.Position().Turn()
	currentPlayer, exists := game.Players[actualTurn]
	if !exists || !currentPlayer.IsAI {
		log.Printf("🔍 AI Move validation - Turn: %s, CurrentPlayer exists: %v, IsAI: %v",
			actualTurn.String(), exists, exists && currentPlayer.IsAI)
		return nil, fmt.Errorf("not AI's turn - current turn: %s, isAI: %v", actualTurn.String(), exists && currentPlayer.IsAI)
	}
	
	if game.AIEngine == nil {
		return nil, fmt.Errorf("AI engine not available")
	}
	
	// Get AI move with optimized time limit based on difficulty for better UX
	// Faster response times for smoother gameplay
	timeLimit := time.Duration(500+game.AIDifficulty*150) * time.Millisecond
	depth := 1 + game.AIDifficulty/4 // Slightly reduced depth for faster responses
	
	moveResponse, err := game.AIEngine.GetBestMove(game.ChessGame.FEN(), depth, timeLimit)
	if err != nil {
		return nil, fmt.Errorf("AI engine error: %v", err)
	}
	
	// Apply AI move directly (avoid deadlock by not calling MakeMove which would reacquire locks)
	// Parse UCI move format (e.g., "e2e4", "e7e8q" for promotion)
	uciMove := moveResponse.Move
	log.Printf("Stockfish returned UCI move: %s", uciMove)
	
	if len(uciMove) < 4 {
		return nil, fmt.Errorf("invalid UCI move format: %s", uciMove)
	}
	
	promotion := ""
	if len(uciMove) > 4 {
		promotion = uciMove[4:]
	}
	
	// Find the valid move that matches the UCI format
	validMoves := game.ChessGame.ValidMoves()
	var selectedMove *chess.Move
	
	for _, move := range validMoves {
		// Check if move matches UCI format (e.g., e2e4, e7e8q)
		moveStr := move.String()
		
		// Standard move matching
		if moveStr == uciMove {
			selectedMove = &move
			break
		}
		
		// For promotions, the chess library might format differently
		if promotion != "" {
			// Try different promotion formats
			if len(moveStr) >= 4 && moveStr[:4] == uciMove[:4] {
				selectedMove = &move
				break
			}
		}
	}
	
	if selectedMove == nil {
		return nil, fmt.Errorf("invalid AI move: %s (no matching valid move found)", uciMove)
	}
	
	// Apply the move
	if err := game.ChessGame.Move(selectedMove, nil); err != nil {
		return nil, fmt.Errorf("failed to apply AI move: %v", err)
	}
	
	log.Printf("Successfully applied AI move: %s", selectedMove.String())
	
	// Add AI move to history
	game.MoveHistory = append(game.MoveHistory, uciMove)
	game.LastMoveAt = time.Now()
	
	// Check game status
	result := &MoveResult{
		Move:         uciMove, // Use the original UCI move
		FEN:          game.ChessGame.FEN(),
		Turn:         game.ChessGame.Position().Turn(),
		IsCheck:      game.ChessGame.Position().Status().String() == "in_check",
		IsCheckmate:  game.ChessGame.Method() == chess.Checkmate,
		IsStalemate:  game.ChessGame.Method() == chess.Stalemate,
		GameStatus:   game.Status,
	}
	
	// Update game status if ended
	if result.IsCheckmate || result.IsStalemate || game.ChessGame.Outcome() != chess.NoOutcome {
		game.Status = StatusCompleted
		result.GameStatus = StatusCompleted
		if game.AIEngine != nil {
			game.AIEngine.Close()
		}
	} else {
		// Switch turns
		game.CurrentTurn = game.ChessGame.Position().Turn()
	}
	
	log.Printf("AI move made in game %s: %s", gameID, moveResponse.Move)
	return result, nil
}

func (gs *GameService) GetGameState(gameID string) (*GameStateResponse, error) {
	game, exists := gs.GetGame(gameID)
	if !exists {
		return nil, fmt.Errorf("game %s not found", gameID)
	}
	
	game.mutex.RLock()
	defer game.mutex.RUnlock()
	
	return &GameStateResponse{
		ID:          game.ID,
		Type:        game.Type,
		FEN:         game.ChessGame.FEN(),
		Turn:        game.ChessGame.Position().Turn(),
		Status:      game.Status,
		Players:     game.Players,
		IsCheck:     game.ChessGame.Position().Status().String() == "in_check",
		IsCheckmate: game.ChessGame.Method() == chess.Checkmate,
		IsStalemate: game.ChessGame.Method() == chess.Stalemate,
		CreatedAt:   game.CreatedAt,
		LastMoveAt:  game.LastMoveAt,
		MoveHistory: game.MoveHistory,
	}, nil
}

func (gs *GameService) DeleteGame(gameID string) error {
	gs.mutex.Lock()
	defer gs.mutex.Unlock()
	
	if game, exists := gs.games[gameID]; exists {
		if game.AIEngine != nil {
			game.AIEngine.Close()
		}
		delete(gs.games, gameID)
		log.Printf("Deleted game: %s", gameID)
	}
	
	return nil
}

type MoveResult struct {
	Move        string      `json:"move"`
	FEN         string      `json:"fen"`
	Turn        chess.Color `json:"turn"`
	IsCheck     bool        `json:"isCheck"`
	IsCheckmate bool        `json:"isCheckmate"`
	IsStalemate bool        `json:"isStalemate"`
	GameStatus  GameStatus  `json:"gameStatus"`
}

type GameStateResponse struct {
	ID          string                 `json:"id"`
	Type        GameType               `json:"type"`
	FEN         string                 `json:"fen"`
	Turn        chess.Color            `json:"turn"`
	Status      GameStatus             `json:"status"`
	Players     map[chess.Color]Player `json:"players"`
	IsCheck     bool                   `json:"isCheck"`
	IsCheckmate bool                   `json:"isCheckmate"`
	IsStalemate bool                   `json:"isStalemate"`
	CreatedAt   time.Time              `json:"createdAt"`
	LastMoveAt  time.Time              `json:"lastMoveAt"`
	MoveHistory []string               `json:"moveHistory"`
}