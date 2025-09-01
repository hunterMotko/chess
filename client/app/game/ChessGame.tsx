import { Chess, type Square } from "chess.js"
import type { DragEvent } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ChessBoard from "./ChessBoard"
import GameStats from "./GameStats"
import { useSocket } from "~/hooks/useSocket"
import { fenToBoard } from "~/utils/utils"

type ChessGameProps = {
	gameId: string
	pgn: string | null
}

type GameState = {
	fen: string
	turn: 'w' | 'b'
	history: string[]
	isGameOver: boolean
	gameOutcome: string | null
}

const INITIAL_GAME_STATE: GameState = {
	fen: '',
	turn: 'w',
	history: [],
	isGameOver: false,
	gameOutcome: null
}

export default function ChessGame({ gameId, pgn }: ChessGameProps) {
	// Initialize chess instance only once
	const chess = useRef<Chess | null>(null)

	// Initialize chess instance with useMemo to prevent recreation
	if (!chess.current) {
		chess.current = new Chess()
		if (pgn) {
			chess.current.loadPgn(pgn + "\n")
		}
		chess.current.setHeader('gameId', gameId)
	}

	const { data, isConnected, sendMsg } = useSocket({ gameId })

	// Consolidate related state into a single object to reduce re-renders
	const [gameState, setGameState] = useState<GameState>(() => {
		const chessInstance = chess.current!
		return {
			fen: chessInstance.fen(),
			turn: chessInstance.turn(),
			history: chessInstance.history(),
			isGameOver: chessInstance.isGameOver(),
			gameOutcome: null
		}
	})

	const [isFlipped, setIsFlipped] = useState(() => gameState.turn === 'b')
	const [sourceSquare, setSourceSquare] = useState<string | null>(null)
	const [availableMoves, setAvailableMoves] = useState<string[]>([])

	// Memoize board array to prevent unnecessary recalculations
	const boardArray = useMemo(() =>
		fenToBoard(gameState.fen, isFlipped),
		[gameState.fen, isFlipped]
	)

	// Helper function to update game state from chess instance
	const updateGameStateFromChess = useCallback(() => {
		const chessInstance = chess.current!
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

		setGameState({
			fen: chessInstance.fen(),
			turn: chessInstance.turn(),
			history: chessInstance.history(),
			isGameOver,
			gameOutcome
		})
	}, [])

	// Initialize flip state on mount
	useEffect(() => {
		if (gameState.turn === 'b') {
			setIsFlipped(true)
		}
	}, []) // Empty dependency - only run on mount

	// Handle socket data updates
	useEffect(() => {
		if (data?.type === 'GAME_UPDATE') {
			const { payload } = data
			const chessInstance = chess.current!

			try {
				chessInstance.load(payload.fen)
				updateGameStateFromChess()
			} catch (error) {
				console.error('Failed to load FEN:', error)
			}
		}
	}, [data, updateGameStateFromChess])

	// Check for game over state when game updates
	useEffect(() => {
		if (!gameState.isGameOver) return

		// Clear available moves and source square when game ends
		setAvailableMoves([])
		setSourceSquare(null)
	}, [gameState.isGameOver])

	const handleNewGame = useCallback(() => {
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

		const payload = { mode: 'classic' }
		sendMsg('NEW_GAME', payload)
	}, [sendMsg])

	const onPieceDrop = useCallback((targetSquare: string) => {
		if (!sourceSquare || gameState.isGameOver) return

		const chessInstance = chess.current!
		let move = null

		try {
			move = chessInstance.move({
				from: sourceSquare,
				to: targetSquare,
				promotion: 'q', // Consider making this configurable
			})
		} catch (error) {
			console.warn("Illegal move attempted:", error)
		}

		// Always clear source square and available moves
		setSourceSquare(null)
		setAvailableMoves([])

		if (move) {
			updateGameStateFromChess()

			const payload = {
				from: move.from,
				to: move.to,
				promotion: move.promotion || ''
			}

			sendMsg('MAKE_MOVE', payload)
		}
	}, [sourceSquare, gameState.isGameOver, updateGameStateFromChess, sendMsg])

	const onDragStart = useCallback((e: DragEvent<HTMLDivElement>, square: string) => {
		if (gameState.isGameOver) return

		const chessInstance = chess.current!
		const moves = chessInstance.moves({ square: square as Square })

		setAvailableMoves(moves)
		setSourceSquare(square)
	}, [gameState.isGameOver])

	const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
		e.preventDefault()
	}, [])

	const onDrop = useCallback((e: DragEvent<HTMLDivElement>, square: string) => {
		e.preventDefault()
		onPieceDrop(square)
	}, [onPieceDrop])

	const onClick = useCallback((square: string) => {
		if (gameState.isGameOver) return

		if (!sourceSquare) {
			const chessInstance = chess.current!
			const moves = chessInstance.moves({ square: square as Square })

			// Only set source if there are valid moves from this square
			if (moves.length > 0) {
				setAvailableMoves(moves)
				setSourceSquare(square)
			}
		} else {
			onPieceDrop(square)
		}
	}, [sourceSquare, gameState.isGameOver, onPieceDrop])

	return (
		<main className="mt-8 w-full h-full grid grid-cols-1 lg:grid-cols-2 px-5">
			<section className="p-2">
				<ChessBoard
					boardArray={boardArray}
					onDragStart={onDragStart}
					onDragOver={onDragOver}
					onDrop={onDrop}
					onClick={onClick}
					availableMoves={availableMoves}
					isFlipped={isFlipped}
				/>
			</section>
			<section className="p-2">
				<GameStats
					isConnected={isConnected}
					gameOutcome={gameState.gameOutcome}
					handleNewGame={handleNewGame}
					turn={gameState.turn}
					history={gameState.history}
					fen={gameState.fen}
				/>
			</section>
		</main>
	)
}
