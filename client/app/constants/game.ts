import { Chess } from "chess.js"
import type { GameState } from "~/types/chess"

export const INITIAL_GAME_STATE: GameState = {
	fen: new Chess().fen(),
	turn: 'w',
	history: [],
	isGameOver: false,
	gameOutcome: null
}

// Game timing constants
export const OPENING_MOVE_DELAY_MS = 2500
export const AI_MOVE_DELAY_MS = 1000
export const AI_MOVE_DELAY_SHORT_MS = 500
export const ILLEGAL_MOVE_FEEDBACK_MS = 1200

// WebSocket constants
export const MAX_RECONNECT_ATTEMPTS = 5
export const RECONNECT_DELAY_MS = 2000

// AI constants
export const DEFAULT_AI_DIFFICULTY = 5
export const MAX_AI_DIFFICULTY = 20

// Animation constants
export const MOVE_INDICATOR_ANIMATION_DURATION_MS = 200
