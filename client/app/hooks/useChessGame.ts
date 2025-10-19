import { useCallback, useRef, useMemo } from "react"
import type { DragEvent } from "react"
import type { Square, Move } from "chess.js"
import { ChessService } from "~/services/chessService"
import { useGameState } from "./useGameState"
import type { PlayerColor } from "~/types/chess"

interface UseChessGameProps {
	gameId: string
	pgn?: string | null
	eco?: string | null
	learningMode?: boolean
	isConnected: boolean
	sendMsg: (type: string, payload: any) => void
}

export function useChessGame({
	gameId,
	pgn = null,
	eco = null,
	learningMode = false,
	isConnected,
	sendMsg
}: UseChessGameProps) {
	// Initialize chess service
	const chessService = useRef<ChessService>(new ChessService(gameId))

	// Extract opening moves from PGN
	const openingMoves = useMemo(() => {
		if (!pgn) return []
		return ChessService.parsePgnMoves(pgn)
	}, [pgn])

	// Initialize game state
	const { state, dispatch, updateGameStateFromChess } = useGameState(
		chessService.current.instance,
		openingMoves,
		learningMode
	)

	// Track capture
	const trackCapture = useCallback((move: Move) => {
		if (move.captured) {
			const capturedPiece = move.captured
			const capturedBy = move.color === 'w' ? 'white' : 'black'
			const piece = capturedBy === 'white'
				? capturedPiece
				: capturedPiece.toUpperCase()

			dispatch({
				type: 'ADD_CAPTURED_PIECE',
				payload: { piece, capturedBy }
			})
		}
	}, [dispatch])

	// Execute move
	const executeMove = useCallback((from: string, to: string, promotionPiece?: string) => {
		const chess = chessService.current.instance
		let move = null

		try {
			move = chess.move({
				from: from as Square,
				to: to as Square,
				promotion: promotionPiece || 'q'
			})
		} catch (error) {
			console.error("Illegal move attempted:", error)

			const errorMessage = chessService.current.getIllegalMoveMessage(from, to)
			dispatch({
				type: 'SET_LAST_MOVE_ATTEMPT',
				payload: { from, to, isIllegal: true, errorMessage }
			})

			setTimeout(() => {
				dispatch({ type: 'SET_LAST_MOVE_ATTEMPT', payload: null })
			}, 1200)

			return false
		}

		if (move) {
			dispatch({ type: 'SET_LAST_MOVE_ATTEMPT', payload: null })

			trackCapture(move)
			updateGameStateFromChess()
			dispatch({ type: 'SET_LAST_MOVE', payload: { from: move.from, to: move.to } })
			dispatch({ type: 'INCREMENT_USER_MOVE_COUNTER' })

			const moveStr = move.from + move.to + (move.promotion || '')
			const payload = {
				from: move.from,
				to: move.to,
				promotion: move.promotion || '',
				move: moveStr
			}

			sendMsg('move', payload)
			return true
		}
		return false
	}, [dispatch, trackCapture, updateGameStateFromChess, sendMsg])

	// Check if player can move
	const canPlayerMove = useCallback((square: string): boolean => {
		if (state.gameType !== 'ai' || !state.playerColor) return true

		const chess = chessService.current.instance
		const piece = chess.get(square as Square)

		if (!piece) return false

		const pieceColor = piece.color === 'w' ? 'white' : 'black'
		return pieceColor === state.playerColor
	}, [state.gameType, state.playerColor])

	// Piece drop handler
	const onPieceDrop = useCallback((targetSquare: string) => {
		const allowInteraction = learningMode
			? (state.openingDemo.isComplete || state.openingDemo.moves.length === 0)
			: true

		if (!state.sourceSquare || state.game.isGameOver || !allowInteraction || state.playback.isActive) {
			return
		}

		dispatch({ type: 'SET_SOURCE_SQUARE', payload: null })
		dispatch({ type: 'SET_AVAILABLE_MOVES', payload: [] })

		if (state.sourceSquare === targetSquare) return

		if (chessService.current.isPromotionMove(state.sourceSquare, targetSquare)) {
			const chess = chessService.current.instance
			const piece = chess.get(state.sourceSquare as Square)

			if (piece) {
				const color = piece.color === 'w' ? 'white' : 'black'
				dispatch({
					type: 'SET_PENDING_PROMOTION',
					payload: {
						from: state.sourceSquare,
						to: targetSquare,
						color
					}
				})
				return
			}
		}

		executeMove(state.sourceSquare, targetSquare)
	}, [
		state.sourceSquare,
		state.game.isGameOver,
		state.openingDemo,
		state.playback.isActive,
		learningMode,
		executeMove,
		dispatch
	])

	// Drag start handler
	const onDragStart = useCallback((_e: DragEvent<HTMLDivElement>, square: string) => {
		const allowInteraction = learningMode
			? (state.openingDemo.isComplete || state.openingDemo.moves.length === 0)
			: true

		if (state.game.isGameOver || !allowInteraction || state.playback.isActive) return

		if (!canPlayerMove(square)) return

		const chess = chessService.current.instance
		const moves = chess.moves({ square: square as Square })

		dispatch({ type: 'SET_AVAILABLE_MOVES', payload: moves })
		dispatch({ type: 'SET_SOURCE_SQUARE', payload: square })
	}, [
		state.game.isGameOver,
		state.openingDemo,
		state.playback.isActive,
		learningMode,
		canPlayerMove,
		dispatch
	])

	// Click handler
	const onClick = useCallback((square: string) => {
		const allowInteraction = learningMode
			? (state.openingDemo.isComplete || state.openingDemo.moves.length === 0)
			: true

		if (state.game.isGameOver || !allowInteraction || state.playback.isActive) return

		if (!state.sourceSquare) {
			if (!canPlayerMove(square)) return

			const chess = chessService.current.instance
			const moves = chess.moves({ square: square as Square })

			if (moves.length > 0) {
				dispatch({ type: 'SET_AVAILABLE_MOVES', payload: moves })
				dispatch({ type: 'SET_SOURCE_SQUARE', payload: square })
			}
		} else if (state.sourceSquare === square) {
			dispatch({ type: 'SET_SOURCE_SQUARE', payload: null })
			dispatch({ type: 'SET_AVAILABLE_MOVES', payload: [] })
		} else {
			onPieceDrop(square)
		}
	}, [
		state.sourceSquare,
		state.game.isGameOver,
		state.openingDemo,
		state.playback.isActive,
		learningMode,
		onPieceDrop,
		canPlayerMove,
		dispatch
	])

	// Promotion handlers
	const handlePromotionSelect = useCallback((piece: string) => {
		if (!state.pendingPromotion) return

		const success = executeMove(state.pendingPromotion.from, state.pendingPromotion.to, piece)
		dispatch({ type: 'SET_PENDING_PROMOTION', payload: null })

		if (!success) {
			dispatch({ type: 'SET_SOURCE_SQUARE', payload: state.pendingPromotion.from })
			const chess = chessService.current.instance
			const moves = chess.moves({ square: state.pendingPromotion.from as Square })
			dispatch({ type: 'SET_AVAILABLE_MOVES', payload: moves })
		}
	}, [state.pendingPromotion, executeMove, dispatch])

	const handlePromotionCancel = useCallback(() => {
		if (!state.pendingPromotion) return

		dispatch({ type: 'SET_SOURCE_SQUARE', payload: state.pendingPromotion.from })
		const chess = chessService.current.instance
		const moves = chess.moves({ square: state.pendingPromotion.from as Square })
		dispatch({ type: 'SET_AVAILABLE_MOVES', payload: moves })

		dispatch({ type: 'SET_PENDING_PROMOTION', payload: null })
	}, [state.pendingPromotion, dispatch])

	// Playback navigation
	const handleNavigateToMove = useCallback((moveIndex: number) => {
		if (moveIndex < -1 || moveIndex >= state.game.history.length) return

		dispatch({
			type: 'UPDATE_PLAYBACK',
			payload: {
				isActive: true,
				currentMoveIndex: moveIndex,
				maxMoveIndex: state.game.history.length - 1
			}
		})

		if (moveIndex === -1) {
			chessService.current.resetNavigation()
		} else {
			chessService.current.reconstructPositionAtMove(moveIndex, state.game.history)
		}
	}, [state.game.history, dispatch])

	const handleFirstMove = useCallback(() => {
		dispatch({
			type: 'UPDATE_PLAYBACK',
			payload: {
				isActive: true,
				currentMoveIndex: -1,
				maxMoveIndex: state.game.history.length - 1
			}
		})
		chessService.current.resetNavigation()
	}, [state.game.history.length, dispatch])

	const handlePreviousMove = useCallback(() => {
		if (!state.playback.isActive) {
			const lastIndex = state.game.history.length - 1
			if (lastIndex >= 0) {
				handleNavigateToMove(lastIndex)
			}
			return
		}

		if (state.playback.currentMoveIndex < 0) return

		const newIndex = state.playback.currentMoveIndex - 1
		handleNavigateToMove(newIndex)
	}, [state.playback, state.game.history.length, handleNavigateToMove])

	const handleNextMove = useCallback(() => {
		if (!state.playback.isActive) {
			if (state.game.history.length > 0) {
				handleNavigateToMove(0)
			}
			return
		}

		const newIndex = Math.min(state.playback.currentMoveIndex + 1, state.game.history.length - 1)
		if (newIndex > state.playback.currentMoveIndex) {
			handleNavigateToMove(newIndex)
		}
	}, [state.playback, state.game.history.length, handleNavigateToMove])

	const handleLastMove = useCallback(() => {
		dispatch({
			type: 'UPDATE_PLAYBACK',
			payload: {
				isActive: false,
				currentMoveIndex: -1,
				maxMoveIndex: state.game.history.length - 1
			}
		})
	}, [state.game.history.length, dispatch])

	// Board flip
	const handleFlipBoard = useCallback(() => {
		dispatch({ type: 'SET_FLIPPED', payload: !state.isFlipped })
	}, [state.isFlipped, dispatch])

	// Resignation and draw
	const handleResign = useCallback(() => {
		const winner = state.game.turn === 'w' ? 'black' : 'white'
		sendMsg('game_over', { result: 'resignation', winner })
		dispatch({
			type: 'UPDATE_GAME_STATE',
			payload: {
				gameOutcome: `${state.game.turn === 'w' ? 'Black' : 'White'} wins by resignation!`,
				isGameOver: true
			}
		})
	}, [state.game.turn, sendMsg, dispatch])

	const handleDrawOffer = useCallback(() => {
		sendMsg('game_over', { result: 'draw_offer', player: state.game.turn })
	}, [state.game.turn, sendMsg])

	return {
		chessService: chessService.current,
		state,
		dispatch,
		openingMoves,
		// Handlers
		onDragStart,
		onClick,
		onPieceDrop,
		handlePromotionSelect,
		handlePromotionCancel,
		handleFlipBoard,
		handleResign,
		handleDrawOffer,
		// Playback
		handleFirstMove,
		handlePreviousMove,
		handleNextMove,
		handleLastMove,
		handleNavigateToMove,
		// Utilities
		executeMove,
		updateGameStateFromChess,
		trackCapture
	}
}
