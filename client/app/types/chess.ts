import type { Move } from "chess.js"

// Chess Game Types
export type PieceColor = 'w' | 'b'
export type PlayerColor = 'white' | 'black'
export type GameType = 'human' | 'ai'

// Re-export Move from chess.js for convenience
export type { Move }

export interface GameState {
	fen: string
	turn: PieceColor
	history: string[]
	isGameOver: boolean
	gameOutcome: string | null
}

export interface PlaybackState {
	isActive: boolean
	currentMoveIndex: number // -1 means live game, 0+ means viewing historical position
	maxMoveIndex: number
}

export interface OpeningDemoState {
	isPlaying: boolean
	moves: string[]
	currentMoveIndex: number
	isComplete: boolean
}

export interface PendingPromotion {
	from: string
	to: string
	color: PlayerColor
}

export interface LastMove {
	from: string
	to: string
}

export interface LastMoveAttempt extends LastMove {
	isIllegal: boolean
	errorMessage?: string
}

export interface GameSetupConfig {
	difficulty: number
	playerColor: PlayerColor
}

export interface CapturedPieces {
	byWhite: string[] // Black pieces captured by white
	byBlack: string[] // White pieces captured by black
}

// WebSocket Message Types
export type WebSocketMessageType =
	| 'game_state'
	| 'ai_move'
	| 'game_over'
	| 'move'
	| 'new_game'
	| 'new_ai_game'

export interface WebSocketMessage<T = unknown> {
	type: WebSocketMessageType
	payload: T
}

export interface GameStatePayload {
	fen: string
	turn?: PieceColor
	moveHistory?: string[]
	isCheckmate?: boolean
	isStalemate?: boolean
}

export interface AIMovePayload {
	move?: string // UCI format
	from?: string
	to?: string
	promotion?: string
}

export interface MovePayload {
	from: string
	to: string
	promotion: string
	move: string // UCI format
}

export interface NewAIGamePayload {
	difficulty: number
	playerId: string
	playerName: string
	playerColor: PlayerColor
}

export interface GameOverPayload {
	result: string
	winner?: string
	player?: string
}
