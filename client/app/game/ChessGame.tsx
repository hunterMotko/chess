import { Chess, type Square } from "chess.js"
import type { DragEvent } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import ChessBoard from "./ChessBoard"
import GameStats from "./GameStats"
import GameStatsLearning from "./GameStatsLearning"
import GameSetup from "./GameSetup"
import MobileGameMenu from "~/components/MobileGameMenu"
import PromotionModal from "~/components/PromotionModal"
import CapturedPieces from "~/components/CapturedPieces"
import GameStatusModal from "~/components/GameStatusModal"
import { useSocket } from "~/hooks/useSocket"
import { fenToBoard } from "~/utils/utils"
import { ChessErrorBoundary } from "~/components/ChessErrorBoundary"

type ChessGameProps = {
	gameId: string
	pgn?: string | null
	eco?: string | null
	learningMode?: boolean
}

type GameState = {
	fen: string
	turn: 'w' | 'b'
	history: string[]
	isGameOver: boolean
	gameOutcome: string | null
}

type PlaybackState = {
	isActive: boolean
	currentMoveIndex: number // -1 means live game, 0+ means viewing historical position
	maxMoveIndex: number
}

type OpeningDemoState = {
	isPlaying: boolean
	moves: string[]
	currentMoveIndex: number
	isComplete: boolean
}

type PendingPromotion = {
	from: string
	to: string
	color: 'white' | 'black'
}

const INITIAL_GAME_STATE: GameState = {
	fen: '',
	turn: 'w',
	history: [],
	isGameOver: false,
	gameOutcome: null
}

// Determine which color the user should play based on both PGN analysis and ECO code cross-reference
function determinePlayerColorFromPGNAndECO(pgn: string | null, ecoCode: string | null): 'white' | 'black' {
	console.log(`🔍 COMPREHENSIVE COLOR ANALYSIS START`)
	console.log(`📥 Inputs:`)
	console.log(`  - PGN: "${pgn?.substring(0, 50)}${pgn && pgn.length > 50 ? '...' : ''}"`)
	console.log(`  - ECO: "${ecoCode}" (type: ${typeof ecoCode})`)

	let ecoResult: 'white' | 'black' | null = null
	let pgnResult: 'white' | 'black' | null = null

	// Step 1: ECO Code Analysis
	if (ecoCode) {
		const firstLetter = ecoCode.charAt(0).toUpperCase()
		console.log(`🔤 ECO Analysis - First letter: "${firstLetter}"`)

		switch (firstLetter) {
			case 'A':
				console.log(`📝 ECO ${ecoCode}: Flank opening - Usually White systems`)
				ecoResult = 'white'
				break
			case 'B':
				console.log(`📝 ECO ${ecoCode}: Semi-open games - Black defenses to 1.e4`)
				ecoResult = 'black'
				break
			case 'C':
				console.log(`📝 ECO ${ecoCode}: Open games - White attacking systems`)
				ecoResult = 'white'
				break
			case 'D':
				console.log(`📝 ECO ${ecoCode}: Closed games - White Queen's pawn systems`)
				ecoResult = 'white'
				break
			case 'E':
				console.log(`📝 ECO ${ecoCode}: Indian defenses - Black defensive systems`)
				ecoResult = 'black'
				break
			default:
				console.log(`⚠️ Unknown ECO format: ${ecoCode}`)
				ecoResult = null
				break
		}
	}

	// Step 2: PGN Move Analysis
	if (pgn) {
		try {
			const tempChess = new Chess()
			tempChess.loadPgn(pgn + "\n")
			const moves = tempChess.history()
			console.log(`♟️ PGN Analysis - Extracted ${moves.length} moves: [${moves.join(', ')}]`)

			if (moves.length >= 2) {
				const firstMove = moves[0] // White's first move
				const secondMove = moves[1] // Black's first move

				console.log(`🔍 Move Analysis:`)
				console.log(`  - White's first move: ${firstMove}`)
				console.log(`  - Black's first move: ${secondMove}`)

				// For learning purposes, determine which side is being taught
				// If this is a defense opening, user typically learns the defensive side

				// B00 examples: 1.e4 (common) followed by unusual Black moves
				if (firstMove === 'e4') {
					// Standard 1.e4 openings
					if (ecoCode?.startsWith('B')) {
						console.log(`📚 1.e4 opening with B-series ECO - Teaching Black defense`)
						pgnResult = 'black'
					} else if (ecoCode?.startsWith('C')) {
						console.log(`📚 1.e4 e5 opening with C-series ECO - Teaching White attack`)
						pgnResult = 'white'
					}
				} else if (firstMove === 'd4') {
					// Queen's pawn openings
					if (ecoCode?.startsWith('D')) {
						console.log(`📚 1.d4 opening with D-series ECO - Teaching White system`)
						pgnResult = 'white'
					} else if (ecoCode?.startsWith('E')) {
						console.log(`📚 1.d4 Indian with E-series ECO - Teaching Black defense`)
						pgnResult = 'black'
					}
				} else {
					console.log(`📚 Irregular first move ${firstMove} - Using ECO classification`)
					pgnResult = ecoResult
				}
			} else if (moves.length === 1) {
				console.log(`📚 Only one move provided - Need ECO to determine learning side`)
				pgnResult = ecoResult
			}
		} catch (error) {
			console.error(`❌ PGN parsing failed:`, error)
			pgnResult = null
		}
	}

	// Step 3: Cross-Reference and Final Decision
	console.log(`🔍 Analysis Results:`)
	console.log(`  - ECO suggests: ${ecoResult}`)
	console.log(`  - PGN suggests: ${pgnResult}`)

	let finalResult: 'white' | 'black'

	if (pgnResult && ecoResult && pgnResult === ecoResult) {
		console.log(`✅ PGN and ECO agree - High confidence result`)
		finalResult = pgnResult
	} else if (pgnResult && ecoResult && pgnResult !== ecoResult) {
		console.log(`⚠️ PGN and ECO disagree - Using PGN analysis (more specific)`)
		finalResult = pgnResult
	} else if (pgnResult) {
		console.log(`📝 Using PGN analysis (ECO unavailable)`)
		finalResult = pgnResult
	} else if (ecoResult) {
		console.log(`📝 Using ECO analysis (PGN unavailable)`)
		finalResult = ecoResult
	} else {
		console.log(`❌ No analysis possible - Defaulting to white`)
		finalResult = 'white'
	}

	console.log(`🎨 FINAL PLAYER COLOR DECISION: "${finalResult}"`)
	console.log(`🔍 COMPREHENSIVE COLOR ANALYSIS END`)

	return finalResult
}

export default function ChessGame({ gameId, pgn = null, eco = null, learningMode = false }: ChessGameProps) {
	// Comprehensive logging of component initialization
	console.log(`🎮 CHESSGAME COMPONENT INIT`)
	console.log(`📊 Props received:`)
	console.log(`  - gameId: "${gameId}"`)
	console.log(`  - pgn: ${pgn ? `"${pgn.substring(0, 50)}..."` : 'null'}`)
	console.log(`  - eco: "${eco}" (type: ${typeof eco})`)
	console.log(`  - learningMode: ${learningMode}`)

	const navigate = useNavigate()

	// Game setup state - only show setup if not in learning mode and no game started
	const [gameStarted, setGameStarted] = useState(learningMode) // Learning mode starts immediately
	const [gameType, setGameType] = useState<'human' | 'ai' | null>(null)
	const [aiDifficulty, setAiDifficulty] = useState<number | null>(null)
	const [playerColor, setPlayerColorState] = useState<'white' | 'black' | null>(null)
	const [aiGameInitialized, setAiGameInitialized] = useState(false) // Track if backend AI game has been created

	// Debug wrapper for setPlayerColor to track all calls
	const setPlayerColor = useCallback((color: 'white' | 'black' | null) => {
		const stack = new Error().stack
		console.log(`🎨 setPlayerColor called with: ${color}`)
		console.log('📍 Call stack:', stack?.split('\n').slice(1, 4).join('\n'))
		setPlayerColorState(color)
	}, [])

	// Initialize chess instance only once
	const chess = useRef<Chess | null>(null)
	const openingChess = useRef<Chess | null>(null)
	const navigationChess = useRef<Chess | null>(null)

	// Initialize chess instances 
	if (!chess.current) {
		chess.current = new Chess()
		chess.current.setHeader('gameId', gameId)
		// Don't load PGN immediately - we'll use it for demo instead
	}
	
	if (!navigationChess.current) {
		navigationChess.current = new Chess()
	}

	// Extract opening moves from PGN if provided
	const openingMoves = useMemo(() => {
		console.log(`🎯 Extracting opening moves from PGN...`)
		console.log(`  - pgn provided: ${!!pgn}`)
		console.log(`  - pgn content: "${pgn}"`)

		if (!pgn) {
			console.log(`  - No PGN provided, returning empty array`)
			return []
		}

		try {
			openingChess.current = new Chess()
			openingChess.current.loadPgn(pgn + "\n")
			const moves = openingChess.current.history()
			console.log(`  - Successfully extracted ${moves.length} moves: [${moves.join(', ')}]`)
			return moves
		} catch (error) {
			console.error('  - Failed to parse PGN:', error)
			return []
		}
	}, [pgn])

	const { data, isConnected, isReconnecting, reconnectAttempts, maxReconnectAttempts, sendMsg, reconnect } = useSocket({ gameId })

	// MOVED: Direct AI initialization will be called after all functions are defined

	// Consolidate related state into a single object to reduce re-renders
	const [gameState, setGameState] = useState<GameState>(() => {
		const chessInstance = chess.current!
		// Always start from initial position for demo
		return {
			fen: chessInstance.fen(),
			turn: chessInstance.turn(),
			history: chessInstance.history(),
			isGameOver: chessInstance.isGameOver(),
			gameOutcome: null
		}
	})
	
	// Separate move history ref to prevent history array recreation causing rerenders
	const moveHistoryRef = useRef<string[]>([])

	const [isFlipped, setIsFlipped] = useState(false) // Will be set based on playerColor, not chess turn
	const [sourceSquare, setSourceSquare] = useState<string | null>(null)
	const [availableMoves, setAvailableMoves] = useState<string[]>([])
	const [lastMoveAttempt, setLastMoveAttempt] = useState<{ from: string; to: string; isIllegal: boolean; errorMessage?: string } | null>(null)
	const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)

	// Captured pieces state
	const [capturedByWhite, setCapturedByWhite] = useState<string[]>([]) // Black pieces captured by white
	const [capturedByBlack, setCapturedByBlack] = useState<string[]>([]) // White pieces captured by black

	// User move tracking for modal dismissal
	const [userMoveCounter, setUserMoveCounter] = useState(0)

	// Promotion modal state
	const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)
	
	// Playback state - must be declared before any effects that use it
	const [playbackState, setPlaybackState] = useState<PlaybackState>({
		isActive: false,
		currentMoveIndex: -1, // -1 means live game
		maxMoveIndex: -1
	})
	
	// Update move history ref when gameState.history changes
	useEffect(() => {
		if (gameState.history !== moveHistoryRef.current) {
			moveHistoryRef.current = gameState.history
			
			// Reset playback if we're viewing history and new moves are added
			if (playbackState.isActive) {
				setPlaybackState({
					isActive: false,
					currentMoveIndex: -1,
					maxMoveIndex: gameState.history.length - 1
				})
			}
		}
	}, [gameState.history, playbackState.isActive])

	// Function to track captured pieces
	const trackCapture = useCallback((move: any) => {
		if (move.captured) {
			const capturedPiece = move.captured
			if (move.color === 'w') {
				// White captured a black piece
				setCapturedByWhite(prev => [...prev, capturedPiece])
			} else {
				// Black captured a white piece
				setCapturedByBlack(prev => [...prev, capturedPiece.toUpperCase()])
			}
		}
	}, [])

	// Opening demo state
	const [openingDemo, setOpeningDemo] = useState<OpeningDemoState>(() => {
		const initialState = {
			isPlaying: openingMoves.length > 0,
			moves: openingMoves,
			currentMoveIndex: -1,
			isComplete: openingMoves.length === 0
		};
		console.log(`🎬 Opening demo initialized:`)
		console.log(`  - openingMoves.length: ${openingMoves.length}`)
		console.log(`  - isPlaying: ${initialState.isPlaying}`)
		console.log(`  - isComplete: ${initialState.isComplete}`)
		console.log(`  - moves: [${openingMoves.join(', ')}]`)
		return initialState;
	})

	const intervalRef = useRef<NodeJS.Timeout | null>(null)

	// Memoize board array to prevent unnecessary recalculations
	// Use navigation chess instance if in playback mode, otherwise use live game state
	const displayFen = playbackState.isActive && navigationChess.current 
		? navigationChess.current.fen() 
		: gameState.fen
		
	const boardArray = useMemo(() =>
		fenToBoard(displayFen, isFlipped),
		[displayFen, isFlipped]
	)

	const handleFlipBoard = useCallback(() => {
		setIsFlipped(!isFlipped)
	}, [isFlipped])

	const handleResign = useCallback(() => {
		setGameState(prev => {
			const winner = prev.turn === 'w' ? 'black' : 'white'
			sendMsg('game_over', { result: 'resignation', winner })
			return {
				...prev,
				gameOutcome: `${prev.turn === 'w' ? 'Black' : 'White'} wins by resignation!`,
				isGameOver: true
			}
		})
	}, [sendMsg])

	const handleDrawOffer = useCallback(() => {
		setGameState(prev => {
			sendMsg('game_over', { result: 'draw_offer', player: prev.turn })
			return prev
		})
	}, [sendMsg])

	// Playback navigation functions - ordered by dependency
	const reconstructPositionAtMove = useCallback((moveIndex: number) => {
		const navChess = navigationChess.current!
		navChess.reset() // Start from initial position
		
		// Replay moves up to the specified index
		for (let i = 0; i <= moveIndex && i < gameState.history.length; i++) {
			try {
				navChess.move(gameState.history[i])
			} catch (error) {
				console.error(`Failed to replay move ${i}: ${gameState.history[i]}`, error)
				break
			}
		}
	}, [gameState.history])

	// Define handleNavigateToMove BEFORE other functions that use it
	const handleNavigateToMove = useCallback((moveIndex: number) => {
		if (moveIndex < -1 || moveIndex >= gameState.history.length) return
		
		setPlaybackState({
			isActive: true,
			currentMoveIndex: moveIndex,
			maxMoveIndex: gameState.history.length - 1
		})
		
		if (moveIndex === -1) {
			navigationChess.current!.reset()
		} else {
			reconstructPositionAtMove(moveIndex)
		}
	}, [gameState.history.length, reconstructPositionAtMove])

	const handleFirstMove = useCallback(() => {
		setPlaybackState({
			isActive: true,
			currentMoveIndex: -1, // Show starting position
			maxMoveIndex: gameState.history.length - 1
		})
		navigationChess.current!.reset()
	}, [gameState.history.length])

	const handlePreviousMove = useCallback(() => {
		if (!playbackState.isActive) {
			// Start playback mode at the last move
			const lastIndex = gameState.history.length - 1
			if (lastIndex >= 0) {
				handleNavigateToMove(lastIndex)
			}
			return
		}
		
		if (playbackState.currentMoveIndex < 0) return
		
		const newIndex = playbackState.currentMoveIndex - 1
		handleNavigateToMove(newIndex)
	}, [playbackState, gameState.history.length, handleNavigateToMove])

	const handleNextMove = useCallback(() => {
		if (!playbackState.isActive) {
			// Start playback mode at the first move
			if (gameState.history.length > 0) {
				handleNavigateToMove(0)
			}
			return
		}
		
		const newIndex = Math.min(playbackState.currentMoveIndex + 1, gameState.history.length - 1)
		if (newIndex > playbackState.currentMoveIndex) {
			handleNavigateToMove(newIndex)
		}
	}, [playbackState, gameState.history.length, handleNavigateToMove])

	const handleLastMove = useCallback(() => {
		setPlaybackState({
			isActive: false,
			currentMoveIndex: -1,
			maxMoveIndex: gameState.history.length - 1
		})
		// Return to live game position
	}, [gameState.history.length])

	// Helper function to update game state from chess instance
	const updateGameStateFromChess = useCallback(() => {
		const chessInstance = chess.current!
		const newFen = chessInstance.fen()
		const newTurn = chessInstance.turn()
		const newHistory = chessInstance.history()
		const isGameOver = chessInstance.isGameOver()
		let gameOutcome: string | null = null

		if (isGameOver) {
			if (chessInstance.isCheckmate()) {
				const winner = chessInstance.turn() === 'w' ? 'black' : 'white'
				gameOutcome = `${winner} wins by checkmate!`
			} else if (chessInstance.isDraw()) {
				gameOutcome = 'The game is a draw.'
			} else if (chessInstance.isStalemate()) {
				gameOutcome = 'Stalemate!'
			}
		}

		// Only update state if something actually changed
		setGameState(prev => {
			const hasChanges = 
				prev.fen !== newFen ||
				prev.turn !== newTurn ||
				prev.history.length !== newHistory.length ||
				prev.isGameOver !== isGameOver ||
				prev.gameOutcome !== gameOutcome ||
				!prev.history.every((move, index) => move === newHistory[index])
			
			if (!hasChanges) return prev
			
			return {
				fen: newFen,
				turn: newTurn,
				history: newHistory,
				isGameOver,
				gameOutcome
			}
		})
	}, [])

	// DEBUG: Check WebSocket connection status
	useEffect(() => {
		console.log(`🔌 WebSocket connection status check:`)
		console.log(`  - isConnected: ${isConnected}`)
		console.log(`  - data available: ${!!data}`)
		console.log(`  - sendMsg function: ${typeof sendMsg}`)
		console.log(`  - learningMode: ${learningMode}`)
		console.log(`  - eco: "${eco}"`)
		console.log(`  - pgn: "${pgn}"`)
	}, [isConnected, data, sendMsg, learningMode, eco, pgn])

	// REMOVED: Old useEffect approach replaced by direct conditional logic below

	// Set board orientation based on player color assignment
	useEffect(() => {
		console.log(`🔄 Board orientation update: playerColor = "${playerColor}"`)
		if (playerColor === 'black') {
			console.log(`🔄 Flipping board for Black player`)
			setIsFlipped(true)
		} else if (playerColor === 'white') {
			console.log(`🔄 Setting normal orientation for White player`)
			setIsFlipped(false)
		}
		// Note: Don't flip if playerColor is null (game setup phase)
	}, [playerColor]) // Respond to playerColor changes


	// Update opening demo when moves are loaded
	useEffect(() => {
		if (openingMoves.length > 0 && openingDemo.moves.length === 0) {
			setOpeningDemo({
				isPlaying: true,
				moves: openingMoves,
				currentMoveIndex: -1,
				isComplete: false
			})
		}
	}, [openingMoves, openingDemo.moves.length])


	// Handle socket data updates
	useEffect(() => {
		if (data) {
			switch (data.type) {
				case 'game_state': {
					const { payload } = data
					const chessInstance = chess.current!

					try {
						chessInstance.load(payload.fen)
						const newHistory = payload.moveHistory || []

						// Only update if data actually changed to prevent unnecessary rerenders
						setGameState(prev => {
							const historyChanged = prev.history.length !== newHistory.length ||
								!prev.history.every((move, index) => move === newHistory[index])
							const fenChanged = prev.fen !== payload.fen

							if (!historyChanged && !fenChanged && !payload.isCheckmate && !payload.isStalemate) {
								return prev
							}

							return {
								fen: payload.fen,
								turn: chessInstance.turn(),
								history: newHistory,
								isGameOver: chessInstance.isGameOver(),
								gameOutcome: payload.isCheckmate
									? `${payload.turn === 'w' ? 'Black' : 'White'} wins by checkmate!`
									: payload.isStalemate
									? 'Stalemate!'
									: prev.gameOutcome
							}
						})

						// Trigger AI move if this is initial game state, player is black, and no moves have been made
						if (newHistory.length === 0 && playerColor === 'black' && gameType === 'ai' && !learningMode) {
							console.log('🤖 Initial game state received, triggering AI first move for black player')
							setTimeout(() => {
								sendMsg('ai_move', {})
							}, 500)
						}
					} catch (error) {
						console.error('Failed to load FEN:', error)
					}
					break
				}
				
				case 'ai_move': {
					const { payload } = data
					const chessInstance = chess.current!
					
					try {
						// Handle both UCI string format (e.g., "e2e4") and object format
						let move
						if (typeof payload.move === 'string') {
							// UCI format from backend
							move = chessInstance.move(payload.move)
						} else if (payload.from && payload.to) {
							// Object format (legacy)
							move = chessInstance.move({
								from: payload.from,
								to: payload.to,
								promotion: payload.promotion || 'q'
							})
						}
						
						if (move) {
							// Track any captures before updating state
							trackCapture(move)
							updateGameStateFromChess()
							// Track AI move for highlighting
							setLastMove({ from: move.from, to: move.to })
						}
					} catch (error) {
						console.error('Failed to apply AI move:', error)
					}
					break
				}
				
				case 'game_over': {
					const { payload } = data
					setGameState(prev => ({
						...prev,
						isGameOver: true,
						gameOutcome: payload.result
					}))
					break
				}
				
				default:
					console.log('Unhandled message type:', data.type)
			}
		}
	}, [data])

	// Check for game over state when game updates
	useEffect(() => {
		if (!gameState.isGameOver) return

		// Clear available moves and source square when game ends
		setAvailableMoves([])
		setSourceSquare(null)
	}, [gameState.isGameOver])

	const handleNewGame = useCallback(() => {
		// In learning mode, navigate to openings page to choose a new opening
		if (learningMode) {
			navigate('/openings')
			return
		}

		const chessInstance = chess.current!
		chessInstance.reset()

		// Reset all game state
		setGameState({
			fen: chessInstance.fen(),
			turn: chessInstance.turn(),
			history: [],
			isGameOver: false,
			gameOutcome: null
		})

		// Clear all interaction state
		setSourceSquare(null)
		setAvailableMoves([])
		setLastMoveAttempt(null)
		setLastMove(null)
		setPendingPromotion(null) // Clear promotion modal
		setIsFlipped(false) // Reset board orientation

		// Clear captured pieces
		setCapturedByWhite([])
		setCapturedByBlack([])

		// Reset user move counter
		setUserMoveCounter(0)

		// Clear game configuration state
		setGameType(null)
		setAiDifficulty(null)
		setPlayerColor(null)

		// Return to game setup screen
		setGameStarted(false)
	}, [learningMode, navigate])

	const handleNewAIGame = useCallback((difficulty: number = 10, playerColor: 'white' | 'black' = 'white') => {
		const chessInstance = chess.current!
		chessInstance.reset()

		setGameState({
			fen: chessInstance.fen(),
			turn: chessInstance.turn(),
			history: [],
			isGameOver: false,
			gameOutcome: null
		})

		setSourceSquare(null)
		setAvailableMoves([])

		// Clear captured pieces
		setCapturedByWhite([])
		setCapturedByBlack([])

		// Reset user move counter
		setUserMoveCounter(0)

		// Set board orientation based on player color
		setIsFlipped(playerColor === 'black')
		setPlayerColor(playerColor)
		setGameType('ai')

		const payload = {
			difficulty: difficulty,
			playerId: crypto.randomUUID(),
			playerName: 'Human Player',
			playerColor: playerColor
		}
		sendMsg('new_ai_game', payload)

		// Trigger AI move if player chooses black
		if (playerColor === 'black') {
			setTimeout(() => {
				console.log('🤖 Triggering AI first move for black player in regular game')
				sendMsg('ai_move', {})
			}, 1000) // Give time for game initialization
		}
	}, [sendMsg])

	const handleGameSetup = useCallback((difficulty: number, playerColor: 'white' | 'black') => {
		setGameType('ai')
		setAiDifficulty(difficulty)
		setGameStarted(true)
		setPlayerColor(playerColor)

		// Start AI game immediately
		handleNewAIGame(difficulty, playerColor)
	}, [handleNewAIGame])

	const handlePlayAnotherOpening = useCallback(async () => {
		try {
			const response = await fetch('http://localhost:8888/api/openings/random')
			if (!response.ok) {
				console.error('Failed to fetch random opening')
				// Fallback to openings page if API fails
				navigate('/openings')
				return
			}

			const opening = await response.json()
			const searchParams = new URLSearchParams({
				pgn: opening.pgn,
				eco: opening.eco
			})

			navigate(`/play?${searchParams.toString()}`)
		} catch (error) {
			console.error('Error fetching random opening:', error)
			// Fallback to openings page if API fails
			navigate('/openings')
		}
	}, [navigate])

	// Helper function to check if a move is a promotion
	const isPromotionMove = useCallback((from: string, to: string): boolean => {
		const chessInstance = chess.current!
		const piece = chessInstance.get(from as Square)

		if (!piece || piece.type !== 'p') return false

		const fromRank = parseInt(from[1])
		const toRank = parseInt(to[1])

		// White pawn promoting (7th to 8th rank)
		if (piece.color === 'w' && fromRank === 7 && toRank === 8) return true

		// Black pawn promoting (2nd to 1st rank)
		if (piece.color === 'b' && fromRank === 2 && toRank === 1) return true

		return false
	}, [])

	// Helper function to provide specific illegal move messages
	const getIllegalMoveMessage = useCallback((from: string, to: string, chessInstance: Chess) => {
		const piece = chessInstance.get(from as Square)
		if (!piece) return "No piece on the selected square"

		const moves = chessInstance.moves({ square: from as Square, verbose: true })
		if (moves.length === 0) return "This piece cannot move from its current position"

		const isValidDestination = moves.some(move => move.to === to)
		if (!isValidDestination) {
			const pieceType = piece.type.toUpperCase()
			const pieceName = {
				'P': 'Pawn', 'R': 'Rook', 'N': 'Knight',
				'B': 'Bishop', 'Q': 'Queen', 'K': 'King'
			}[pieceType] || 'Piece'

			return `${pieceName} cannot move to ${to.toUpperCase()}`
		}

		if (chessInstance.inCheck()) {
			return "Move would leave your king in check"
		}

		return "Invalid move"
	}, [])

	// Function to execute a move with optional promotion piece
	const executeMove = useCallback((from: string, to: string, promotionPiece?: string) => {
		const chessInstance = chess.current!
		let move = null

		try {
			move = chessInstance.move({
				from: from as Square,
				to: to as Square,
				promotion: promotionPiece || 'q'
			})
		} catch (error) {
			console.warn("Illegal move attempted:", error)

			// Enhanced illegal move feedback
			setLastMoveAttempt({
				from,
				to,
				isIllegal: true,
				errorMessage: getIllegalMoveMessage(from, to, chessInstance)
			})


			// Clear the illegal move highlight after a longer time to ensure user sees it
			setTimeout(() => setLastMoveAttempt(null), 1200)
			return false
		}

		if (move) {
			setLastMoveAttempt(null) // Clear any previous illegal move highlights

			// Track any captures before updating state
			trackCapture(move)
			updateGameStateFromChess()
			// Track human move for highlighting
			setLastMove({ from: move.from, to: move.to })
			// Increment user move counter for modal dismissal
			setUserMoveCounter(prev => prev + 1)

			// Send move in UCI format (e.g., "e2e4", "e7e8q" for promotion)
			const moveStr = move.from + move.to + (move.promotion || '')

			const payload = {
				from: move.from,
				to: move.to,
				promotion: move.promotion || '',
				move: moveStr  // Add UCI format for backend compatibility
			}

			sendMsg('move', payload)
			return true
		}
		return false
	}, [sendMsg])

	const onPieceDrop = useCallback((targetSquare: string) => {
		// In learning mode, allow interaction once demo is complete or if no demo exists
		// In regular mode, always allow interaction
		const allowInteraction = learningMode ? (openingDemo.isComplete || openingDemo.moves.length === 0) : true

		if (!sourceSquare || gameState.isGameOver || !allowInteraction || playbackState.isActive) return

		// Always clear source square and available moves first
		setSourceSquare(null)
		setAvailableMoves([])

		// If piece is dropped on the same square it started from, don't attempt a move
		if (sourceSquare === targetSquare) {
			return
		}

		// Check if this is a promotion move
		if (isPromotionMove(sourceSquare, targetSquare)) {
			const chessInstance = chess.current!
			const piece = chessInstance.get(sourceSquare as Square)

			if (piece) {
				const color = piece.color === 'w' ? 'white' : 'black'
				setPendingPromotion({
					from: sourceSquare,
					to: targetSquare,
					color
				})
				return
			}
		}

		// Execute regular move
		executeMove(sourceSquare, targetSquare)
	}, [sourceSquare, gameState.isGameOver, learningMode, openingDemo.isComplete, openingDemo.moves.length, playbackState.isActive, isPromotionMove, executeMove])

	// Handle promotion piece selection
	const handlePromotionSelect = useCallback((piece: string) => {
		if (!pendingPromotion) return

		const success = executeMove(pendingPromotion.from, pendingPromotion.to, piece)
		setPendingPromotion(null)

		if (!success) {
			// If move failed, restore the source square selection for better UX
			setSourceSquare(pendingPromotion.from)
			const chessInstance = chess.current!
			const moves = chessInstance.moves({ square: pendingPromotion.from as Square })
			setAvailableMoves(moves)
		}
	}, [pendingPromotion, executeMove])

	// Handle promotion cancellation
	const handlePromotionCancel = useCallback(() => {
		if (!pendingPromotion) return

		// Restore the source square selection
		setSourceSquare(pendingPromotion.from)
		const chessInstance = chess.current!
		const moves = chessInstance.moves({ square: pendingPromotion.from as Square })
		setAvailableMoves(moves)

		setPendingPromotion(null)
	}, [pendingPromotion])

	// Helper function to check if player can move pieces of this color
	const canPlayerMove = useCallback((square: string): boolean => {
		// In human vs human games, allow all moves
		if (gameType !== 'ai' || !playerColor) return true
		
		const chessInstance = chess.current!
		const piece = chessInstance.get(square as Square)
		
		// No piece on square
		if (!piece) return false
		
		// Check if piece color matches player's assigned color
		const pieceColor = piece.color === 'w' ? 'white' : 'black'
		return pieceColor === playerColor
	}, [gameType, playerColor])

	const onDragStart = useCallback((_e: DragEvent<HTMLDivElement>, square: string) => {
		// In learning mode, allow interaction once demo is complete or if no demo exists
		// In regular mode, always allow interaction
		const allowInteraction = learningMode ? (openingDemo.isComplete || openingDemo.moves.length === 0) : true

		if (gameState.isGameOver || !allowInteraction || playbackState.isActive) return

		// Check if player can move this piece in AI games
		if (!canPlayerMove(square)) return

		const chessInstance = chess.current!
		const moves = chessInstance.moves({ square: square as Square })

		setAvailableMoves(moves)
		setSourceSquare(square)
	}, [gameState.isGameOver, learningMode, openingDemo.isComplete, openingDemo.moves.length, playbackState.isActive, canPlayerMove])

	const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
		e.preventDefault()
	}, [])

	const onDrop = useCallback((e: DragEvent<HTMLDivElement>, square: string) => {
		e.preventDefault()
		onPieceDrop(square)
	}, [onPieceDrop])

	const onClick = useCallback((square: string) => {
		// In learning mode, allow interaction once demo is complete or if no demo exists
		// In regular mode, always allow interaction
		const allowInteraction = learningMode ? (openingDemo.isComplete || openingDemo.moves.length === 0) : true

		if (gameState.isGameOver || !allowInteraction || playbackState.isActive) return

		if (!sourceSquare) {
			// Check if player can move this piece in AI games
			if (!canPlayerMove(square)) return

			const chessInstance = chess.current!
			const moves = chessInstance.moves({ square: square as Square })

			// Only set source if there are valid moves from this square
			if (moves.length > 0) {
				setAvailableMoves(moves)
				setSourceSquare(square)
			}
		} else if (sourceSquare === square) {
			// If clicking the same square again, deselect it
			setSourceSquare(null)
			setAvailableMoves([])
		} else {
			onPieceDrop(square)
		}
	}, [sourceSquare, gameState.isGameOver, learningMode, openingDemo.isComplete, openingDemo.moves.length, onPieceDrop, canPlayerMove, playbackState.isActive])

	// AI INITIALIZATION: Move to useEffect to prevent multiple executions
	useEffect(() => {
		if (isConnected && learningMode && (eco || pgn) && !aiGameInitialized && sendMsg) {
			console.log(`🚀 AI INITIALIZATION useEffect triggered`)
			console.log(`  - eco: "${eco}"`)
			console.log(`  - pgn: "${pgn}"`)
			console.log(`  - learningMode: ${learningMode}`)
			console.log(`  - isConnected: ${isConnected}`)

			const analyzedColor = determinePlayerColorFromPGNAndECO(pgn, eco)
			console.log(`🎨 Color analysis: ${analyzedColor}`)

			// Set the color state
			setPlayerColor(analyzedColor)
			setGameType('ai')
			setAiDifficulty(5)
			setAiGameInitialized(true)

			// Send AI game initialization
			const aiGamePayload = {
				difficulty: 5,
				playerId: 'learner-' + Date.now(),
				playerName: 'Learning Player',
				playerColor: analyzedColor
			}

			console.log(`📤 Sending new_ai_game message:`)
			console.log(JSON.stringify(aiGamePayload, null, 2))

			try {
				sendMsg('new_ai_game', aiGamePayload)
				console.log(`✅ AI game message sent successfully`)

				// Replay opening moves if available
				if (openingMoves.length > 0) {
					console.log(`🔄 Replaying ${openingMoves.length} moves`)

					const tempChess = new Chess()
					openingMoves.forEach((move, index) => {
						setTimeout(() => {
							const moveResult = tempChess.move(move)
							if (moveResult) {
								const moveStr = moveResult.from + moveResult.to + (moveResult.promotion || '')
								const payload = {
									from: moveResult.from,
									to: moveResult.to,
									promotion: moveResult.promotion || '',
									move: moveStr
								}
								console.log(`📤 Replay move ${index + 1}/${openingMoves.length}: ${moveStr}`)
								sendMsg('move', payload)

								// Update demo progress
								setOpeningDemo(prev => {
									const isLastMove = index >= openingMoves.length - 1
									console.log(`🎬 Demo progress: ${index + 1}/${openingMoves.length}, complete: ${isLastMove}`)
									return {
										...prev,
										currentMoveIndex: index,
										isComplete: isLastMove,
										isPlaying: !isLastMove
									}
								})
							}
						}, (index + 1) * 1500) // 1.5 seconds between moves
					})

					// Trigger AI move if user is black
					if (analyzedColor === 'black') {
						setTimeout(() => {
							console.log(`🤖 AI move trigger for black player`)
							sendMsg('ai_move', {})
						}, (openingMoves.length + 1) * 1500 + 1000)
					}
				} else if (analyzedColor === 'black') {
					setTimeout(() => {
						console.log(`🤖 AI first move (no opening moves)`)
						sendMsg('ai_move', {})
					}, 500)
				}

				console.log(`📝 Frontend chess state will sync via WebSocket messages`)

			} catch (error) {
				console.error(`❌ Failed to send AI game message:`, error)
			}
		}
	}, [isConnected, learningMode, eco, pgn, aiGameInitialized, sendMsg, openingMoves, setPlayerColor, setGameType, setAiDifficulty, setOpeningDemo])

	const handleGameReset = () => {
		chess.current = new Chess();
		setGameState(prev => ({
			...prev,
			fen: chess.current!.fen(),
			turn: chess.current!.turn(),
			history: [],
			gameOutcome: null
		}));
		setSourceSquare(null);
		setAvailableMoves([]);
		setLastMoveAttempt(null);
		setLastMove(null);
		setPendingPromotion(null);
		setCapturedByWhite([]);
		setCapturedByBlack([]);
		setUserMoveCounter(0);
		setGameStarted(false);
	};

	// Show game setup if not started and not in learning mode
	if (!gameStarted && !learningMode) {
		return (
			<ChessErrorBoundary gameId={gameId} onGameReset={handleGameReset}>
				<GameSetup onStartGame={handleGameSetup} />
			</ChessErrorBoundary>
		);
	}

	return (
		<ChessErrorBoundary gameId={gameId} onGameReset={handleGameReset}>
			<main className="min-h-screen bg-gray-950 text-white">
			{/* Mobile-First Responsive Layout */}
			<div className="h-screen flex flex-col md:min-h-screen md:h-auto">
				{/* Mobile Header - Simplified */}
				<header className="text-center py-3 px-4 md:mb-6 flex-shrink-0">
					<h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-indigo-400">
						{learningMode ? 'Chess Opening Demo' : 'Chess Game'}
					</h1>
					{(!isConnected || isReconnecting) && (
						<div className={`border rounded-lg p-2 inline-block mt-2 ${
							isReconnecting
								? 'bg-yellow-900 border-yellow-600'
								: 'bg-red-900 border-red-600'
						}`}>
							<span className={`text-xs sm:text-sm ${
								isReconnecting ? 'text-yellow-200' : 'text-red-200'
							}`}>
								{isReconnecting
									? `🔄 Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`
									: '⚠ Connecting to server...'
								}
							</span>
							{isReconnecting && reconnectAttempts >= maxReconnectAttempts && (
								<button
									onClick={reconnect}
									className="ml-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs"
								>
									Retry
								</button>
							)}
						</div>
					)}

				</header>

				{/* Mobile Layout - Game Takes Full Screen */}
				<div className="flex-1 flex flex-col md:hidden">
					<div className="flex-1 flex flex-col items-center justify-center px-3 pt-2 relative">
						{/* Captured pieces by black (above board) */}
						<div className="mb-2">
							<CapturedPieces
								capturedByWhite={capturedByWhite}
								capturedByBlack={capturedByBlack}
								showSide="black"
							/>
						</div>

						<div className="w-full">
							<ChessBoard
								boardArray={boardArray}
								onDragStart={onDragStart}
								onDragOver={onDragOver}
								onDrop={onDrop}
								onClick={onClick}
								availableMoves={availableMoves}
								isFlipped={isFlipped}
								selectedSquare={sourceSquare}
								lastMoveAttempt={lastMoveAttempt}
								lastMove={lastMove}
							/>
						</div>

						{/* Captured pieces by white (below board) */}
						<div className="mt-2">
							<CapturedPieces
								capturedByWhite={capturedByWhite}
								capturedByBlack={capturedByBlack}
								showSide="white"
							/>
						</div>

						{/* Mobile Promotion Modal */}
						<PromotionModal
							isVisible={!!pendingPromotion}
							color={pendingPromotion?.color || 'white'}
							onSelectPiece={handlePromotionSelect}
							onCancel={handlePromotionCancel}
						/>
					</div>
					
					{/* Mobile Game Controls - Same as Desktop */}
					<div className="flex-shrink-0 px-3 bg-gradient-to-t from-gray-950 to-transparent relative"
						style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom) + 0.5rem)' }}
					>
						{learningMode && !openingDemo.isComplete ? (
							<GameStatsLearning
								isConnected={isConnected}
								handleFlipBoard={handleFlipBoard}
								turn={gameState.turn}
								history={gameState.history}
								fen={gameState.fen}
								isFlipped={isFlipped}
								openingDemo={openingDemo}
								gameId={gameId}
								onPlayAnotherOpening={handlePlayAnotherOpening}
								lastMoveAttempt={lastMoveAttempt}
							/>
						) : (
							<GameStats
								isConnected={isConnected}
								gameOutcome={gameState.gameOutcome}
								handleNewGame={handleNewGame}
								handleFlipBoard={handleFlipBoard}
								handleResign={handleResign}
								handleDrawOffer={handleDrawOffer}
								turn={gameState.turn}
								history={gameState.history}
								fen={gameState.fen}
								isFlipped={isFlipped}
								openingDemo={openingDemo}
								playbackState={playbackState}
								onFirstMove={handleFirstMove}
								onPreviousMove={handlePreviousMove}
								onNextMove={handleNextMove}
								onLastMove={handleLastMove}
								onNavigateToMove={handleNavigateToMove}
								onPlayAnotherOpening={learningMode ? handlePlayAnotherOpening : undefined}
								learningMode={learningMode}
								lastMoveAttempt={lastMoveAttempt}
							/>
						)}

						{/* Status Modal positioned over mobile controls */}
						<GameStatusModal
							openingDemo={openingDemo}
							lastMoveAttempt={lastMoveAttempt}
							userMoveCounter={userMoveCounter}
						/>
					</div>
					
					{/* Mobile Game Menu - For Advanced Features */}
					<MobileGameMenu
						isConnected={isConnected}
						gameOutcome={gameState.gameOutcome}
						handleNewGame={handleNewGame}
						handleFlipBoard={handleFlipBoard}
						handleResign={handleResign}
						handleDrawOffer={handleDrawOffer}
						turn={gameState.turn}
						history={gameState.history}
						fen={gameState.fen}
						isFlipped={isFlipped}
						openingDemo={openingDemo}
						playbackState={playbackState}
						onFirstMove={handleFirstMove}
						onPreviousMove={handlePreviousMove}
						onNextMove={handleNextMove}
						onLastMove={handleLastMove}
						onNavigateToMove={handleNavigateToMove}
						onPlayAnotherOpening={learningMode ? handlePlayAnotherOpening : undefined}
						learningMode={learningMode}
						lastMoveAttempt={lastMoveAttempt}
					/>
				</div>

				{/* Desktop Layout - Side by Side */}
				<div className="hidden md:block max-w-7xl mx-auto p-4">
					<div className="grid md:grid-cols-5 xl:grid-cols-3 gap-6 min-h-[calc(100vh-12rem)]">
						<div className="md:col-span-3 xl:col-span-2 flex flex-col justify-center relative">
							{/* Captured pieces above board */}
							<div className="mb-3">
								<CapturedPieces
									capturedByWhite={capturedByWhite}
									capturedByBlack={capturedByBlack}
									showSide="black"
								/>
							</div>

							<div className="w-full">
								<ChessBoard
									boardArray={boardArray}
									onDragStart={onDragStart}
									onDragOver={onDragOver}
									onDrop={onDrop}
									onClick={onClick}
									availableMoves={availableMoves}
									isFlipped={isFlipped}
									selectedSquare={sourceSquare}
									lastMoveAttempt={lastMoveAttempt}
									lastMove={lastMove}
								/>
							</div>

							{/* Captured pieces below board */}
							<div className="mt-3">
								<CapturedPieces
									capturedByWhite={capturedByWhite}
									capturedByBlack={capturedByBlack}
									showSide="white"
								/>
							</div>

							{/* Desktop Promotion Modal */}
							<PromotionModal
								isVisible={!!pendingPromotion}
								color={pendingPromotion?.color || 'white'}
								onSelectPiece={handlePromotionSelect}
								onCancel={handlePromotionCancel}
							/>
						</div>
						<div className="md:col-span-2 xl:col-span-1">
							<div className="flex flex-col h-full min-h-[600px] max-h-[calc(100vh-12rem)] relative">
								{learningMode && !openingDemo.isComplete ? (
									<GameStatsLearning
										isConnected={isConnected}
										handleFlipBoard={handleFlipBoard}
										turn={gameState.turn}
										history={gameState.history}
										fen={gameState.fen}
										isFlipped={isFlipped}
										openingDemo={openingDemo}
										gameId={gameId}
										onPlayAnotherOpening={handlePlayAnotherOpening}
										lastMoveAttempt={lastMoveAttempt}
									/>
								) : (
									<GameStats
										isConnected={isConnected}
										gameOutcome={gameState.gameOutcome}
										handleNewGame={handleNewGame}
										handleFlipBoard={handleFlipBoard}
										handleResign={handleResign}
										handleDrawOffer={handleDrawOffer}
										turn={gameState.turn}
										history={gameState.history}
										fen={gameState.fen}
										isFlipped={isFlipped}
										openingDemo={openingDemo}
										playbackState={playbackState}
										onFirstMove={handleFirstMove}
										onPreviousMove={handlePreviousMove}
										onNextMove={handleNextMove}
										onLastMove={handleLastMove}
										onNavigateToMove={handleNavigateToMove}
										onPlayAnotherOpening={learningMode ? handlePlayAnotherOpening : undefined}
										learningMode={learningMode}
										lastMoveAttempt={lastMoveAttempt}
									/>
								)}

								{/* Status Modal positioned over GameStats */}
								<GameStatusModal
									openingDemo={openingDemo}
									lastMoveAttempt={lastMoveAttempt}
									userMoveCounter={userMoveCounter}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

		</main>
		</ChessErrorBoundary>
	)
}
