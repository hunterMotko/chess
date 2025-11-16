import { useCallback, useReducer, useRef } from "react"
import type { Chess } from "chess.js"
import type {
	GameState,
	PlaybackState,
	OpeningDemoState,
	Promotion,
	LastMove,
	LastMoveAttempt,
	CapturedPieces,
	PlayerColor,
	GameType
} from "~/types/chess"

// Consolidated state interface
interface ConsolidatedGameState {
	// Game state
	game: GameState

	// UI state
	isFlipped: boolean
	sourceSquare: string | null
	availableMoves: string[]

	// Move tracking
	lastMove: LastMove | null
	lastMoveAttempt: LastMoveAttempt | null
	userMoveCounter: number

	// Captured pieces
	capturedPieces: CapturedPieces

	// Promotion
	pendingPromotion: Promotion | null

	// Playback
	playback: PlaybackState

	// Opening demo
	openingDemo: OpeningDemoState

	// Game config
	gameStarted: boolean
	gameType: GameType | null
	playerColor: PlayerColor | null
	aiDifficulty: number | null
	aiGameInitialized: boolean
}

// Action types
type GameStateAction =
	| { type: 'UPDATE_GAME_STATE'; payload: Partial<GameState> }
	| { type: 'SET_FLIPPED'; payload: boolean }
	| { type: 'SET_SOURCE_SQUARE'; payload: string | null }
	| { type: 'SET_AVAILABLE_MOVES'; payload: string[] }
	| { type: 'SET_LAST_MOVE'; payload: LastMove | null }
	| { type: 'SET_LAST_MOVE_ATTEMPT'; payload: LastMoveAttempt | null }
	| { type: 'INCREMENT_USER_MOVE_COUNTER' }
	| { type: 'ADD_CAPTURED_PIECE'; payload: { piece: string; capturedBy: 'white' | 'black' } }
	| { type: 'RESET_CAPTURED_PIECES' }
	| { type: 'SET_PENDING_PROMOTION'; payload: Promotion | null }
	| { type: 'UPDATE_PLAYBACK'; payload: Partial<PlaybackState> }
	| { type: 'UPDATE_OPENING_DEMO'; payload: Partial<OpeningDemoState> }
	| { type: 'SET_GAME_STARTED'; payload: boolean }
	| { type: 'SET_GAME_TYPE'; payload: GameType | null }
	| { type: 'SET_PLAYER_COLOR'; payload: PlayerColor | null }
	| { type: 'SET_AI_DIFFICULTY'; payload: number | null }
	| { type: 'SET_AI_GAME_INITIALIZED'; payload: boolean }
	| { type: 'RESET_GAME'; payload: { chess: Chess; openingMoves?: string[] } }

function gameStateReducer(
	state: ConsolidatedGameState,
	action: GameStateAction
): ConsolidatedGameState {
	switch (action.type) {
		case 'UPDATE_GAME_STATE':
			return {
				...state,
				game: { ...state.game, ...action.payload }
			}
		case 'SET_FLIPPED':
			return { ...state, isFlipped: action.payload }
		case 'SET_SOURCE_SQUARE':
			return { ...state, sourceSquare: action.payload }
		case 'SET_AVAILABLE_MOVES':
			return { ...state, availableMoves: action.payload }
		case 'SET_LAST_MOVE':
			return { ...state, lastMove: action.payload }
		case 'SET_LAST_MOVE_ATTEMPT':
			return { ...state, lastMoveAttempt: action.payload }
		case 'INCREMENT_USER_MOVE_COUNTER':
			return { ...state, userMoveCounter: state.userMoveCounter + 1 }
		case 'ADD_CAPTURED_PIECE': {
			const { piece, capturedBy } = action.payload
			return {
				...state,
				capturedPieces: {
					byWhite: capturedBy === 'white'
						? [...state.capturedPieces.byWhite, piece]
						: state.capturedPieces.byWhite,
					byBlack: capturedBy === 'black'
						? [...state.capturedPieces.byBlack, piece]
						: state.capturedPieces.byBlack
				}
			}
		}
		case 'RESET_CAPTURED_PIECES':
			return {
				...state,
				capturedPieces: { byWhite: [], byBlack: [] }
			}
		case 'SET_PENDING_PROMOTION':
			return { ...state, pendingPromotion: action.payload }
		case 'UPDATE_PLAYBACK':
			return {
				...state,
				playback: { ...state.playback, ...action.payload }
			}
		case 'UPDATE_OPENING_DEMO':
			return {
				...state,
				openingDemo: { ...state.openingDemo, ...action.payload }
			}
		case 'SET_GAME_STARTED':
			return { ...state, gameStarted: action.payload }
		case 'SET_GAME_TYPE':
			return { ...state, gameType: action.payload }
		case 'SET_PLAYER_COLOR':
			return { ...state, playerColor: action.payload }
		case 'SET_AI_DIFFICULTY':
			return { ...state, aiDifficulty: action.payload }
		case 'SET_AI_GAME_INITIALIZED':
			return { ...state, aiGameInitialized: action.payload }
		case 'RESET_GAME': {
			const { chess, openingMoves = [] } = action.payload
			return {
				...state,
				game: {
					fen: chess.fen(),
					turn: chess.turn(),
					history: [],
					isGameOver: false,
					gameOutcome: null
				},
				sourceSquare: null,
				availableMoves: [],
				lastMove: null,
				lastMoveAttempt: null,
				pendingPromotion: null,
				capturedPieces: { byWhite: [], byBlack: [] },
				userMoveCounter: 0,
				playback: {
					isActive: false,
					currentMoveIndex: -1,
					maxMoveIndex: -1
				},
				openingDemo: {
					isPlaying: openingMoves.length > 0,
					moves: openingMoves,
					currentMoveIndex: -1,
					isComplete: openingMoves.length === 0
				}
			}
		}
		default:
			return state
	}
}

export function useGameState(chess: Chess, openingMoves: string[], learningMode: boolean) {
	const initialState: ConsolidatedGameState = {
		game: {
			fen: chess.fen(),
			turn: chess.turn(),
			history: [],
			isGameOver: false,
			gameOutcome: null
		},
		isFlipped: false,
		sourceSquare: null,
		availableMoves: [],
		lastMove: null,
		lastMoveAttempt: null,
		userMoveCounter: 0,
		capturedPieces: { byWhite: [], byBlack: [] },
		pendingPromotion: null,
		playback: {
			isActive: false,
			currentMoveIndex: -1,
			maxMoveIndex: -1
		},
		openingDemo: {
			isPlaying: openingMoves.length > 0,
			moves: openingMoves,
			currentMoveIndex: -1,
			isComplete: openingMoves.length === 0
		},
		gameStarted: learningMode,
		gameType: null,
		playerColor: null,
		aiDifficulty: null,
		aiGameInitialized: false
	}

	const [state, dispatch] = useReducer(gameStateReducer, initialState)
	const moveHistoryRef = useRef<string[]>([])
	// Update move history ref when game history changes
	if (state.game.history !== moveHistoryRef.current) {
		moveHistoryRef.current = state.game.history
	}
	// Helper function to update game state from chess instance
	const updateGameStateFromChess = useCallback(() => {
		const newFen = chess.fen()
		const newTurn = chess.turn()
		const newHistory = chess.history()
		const isGameOver = chess.isGameOver()
		let gameOutcome: string | null = null
		if (isGameOver) {
			if (chess.isCheckmate()) {
				const winner = chess.turn() === 'w' ? 'black' : 'white'
				gameOutcome = `${winner} wins by checkmate!`
			} else if (chess.isDraw()) {
				gameOutcome = 'The game is a draw.'
			} else if (chess.isStalemate()) {
				gameOutcome = 'Stalemate!'
			}
		}
		// Only update if something actually changed
		const hasChanges =
			state.game.fen !== newFen ||
			state.game.turn !== newTurn ||
			state.game.history.length !== newHistory.length ||
			state.game.isGameOver !== isGameOver ||
			state.game.gameOutcome !== gameOutcome
		if (hasChanges) {
			dispatch({
				type: 'UPDATE_GAME_STATE',
				payload: {
					fen: newFen,
					turn: newTurn,
					history: newHistory,
					isGameOver,
					gameOutcome
				}
			})
		}
	}, [chess, state.game])
	return {
		state,
		dispatch,
		moveHistoryRef,
		updateGameStateFromChess
	}
}
