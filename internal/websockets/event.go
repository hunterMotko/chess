package websockets

import "encoding/json"

const (
	NewAIGame = "new_ai_game"
	NewGame   = "new_game"
	Move      = "move"
	GameState = "game_state"
	AIMove    = "ai_move"
	LoadPGN   = "load_pgn"
	GameOver  = "game_over"
)

// TODO: Add enum types for each expected event type
type Event struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type EventHandler func(e Event, c *Client) error
