import { Chess, type Square } from "chess.js"
import type { PlayerColor, PieceColor } from "~/types/chess"

export class ChessService {
	private chess: Chess
	private navigationChess: Chess
	constructor(gameId?: string) {
		this.chess = new Chess()
		this.navigationChess = new Chess()
		if (gameId) {
			this.chess.setHeader('gameId', gameId)
		}
	}
	// Basic chess operations
	get instance() {
		return this.chess
	}
	get navigationInstance() {
		return this.navigationChess
	}
	fen(): string {
		return this.chess.fen()
	}
	turn(): PieceColor {
		return this.chess.turn()
	}
	history(): string[] {
		return this.chess.history()
	}
	isGameOver(): boolean {
		return this.chess.isGameOver()
	}
	isCheckmate(): boolean {
		return this.chess.isCheckmate()
	}
	isDraw(): boolean {
		return this.chess.isDraw()
	}
	isStalemate(): boolean {
		return this.chess.isStalemate()
	}

	inCheck(): boolean {
		return this.chess.inCheck()
	}

	reset(): void {
		this.chess.reset()
		this.navigationChess.reset()
	}

	load(fen: string): void {
		this.chess.load(fen)
	}
	loadPgn(pgn: string): void {
		this.chess.loadPgn(pgn)
	}
	// Move operations
	move(move: string | { from: Square; to: Square; promotion?: string }) {
		return this.chess.move(move)
	}

	moves(options?: { square?: Square }): string[]
	moves(options: { square?: Square; verbose: true }): any[]
	moves(options?: { square?: Square; verbose?: boolean }): any[] {
		return this.chess.moves(options as any)
	}
	get(square: Square) {
		return this.chess.get(square)
	}
	// Navigation operations for playback
	reconstructPositionAtMove(moveIndex: number, history: string[]): void {
		this.navigationChess.reset()

		for (let i = 0; i <= moveIndex && i < history.length; i++) {
			try {
				this.navigationChess.move(history[i])
			} catch (error) {
				console.error(`Failed to replay move ${i}: ${history[i]}`, error)
				break
			}
		}
	}

	getNavigationFen(): string {
		return this.navigationChess.fen()
	}

	resetNavigation(): void {
		this.navigationChess.reset()
	}

	// Promotion check
	isPromotionMove(from: string, to: string): boolean {
		const piece = this.chess.get(from as Square)

		if (!piece || piece.type !== 'p') return false

		const fromRank = parseInt(from[1])
		const toRank = parseInt(to[1])

		// White pawn promoting (7th to 8th rank)
		if (piece.color === 'w' && fromRank === 7 && toRank === 8) return true

		// Black pawn promoting (2nd to 1st rank)
		if (piece.color === 'b' && fromRank === 2 && toRank === 1) return true

		return false
	}

	// Illegal move messaging
	getIllegalMoveMessage(from: string, to: string): string {
		const piece = this.chess.get(from as Square)
		if (!piece) return "No piece on the selected square"

		const moves = this.chess.moves({ square: from as Square, verbose: true })
		if (moves.length === 0) return "This piece cannot move from its current position"

		const isValidDestination = moves.some(move => move.to === to)
		if (!isValidDestination) {
			const pieceType = piece.type.toUpperCase()
			const pieceName: Record<string, string> = {
				'P': 'Pawn',
				'R': 'Rook',
				'N': 'Knight',
				'B': 'Bishop',
				'Q': 'Queen',
				'K': 'King'
			}
			return `${pieceName[pieceType] || 'Piece'} cannot move to ${to.toUpperCase()}`
		}
		if (this.chess.inCheck()) {
			return "Move would leave your king in check"
		}
		return "Invalid move"
	}

	// Game outcome
	getGameOutcome(): string | null {
		if (!this.chess.isGameOver()) return null

		if (this.chess.isCheckmate()) {
			const winner = this.chess.turn() === 'w' ? 'black' : 'white'
			return `${winner} wins by checkmate!`
		}

		if (this.chess.isDraw()) {
			return 'The game is a draw.'
		}

		if (this.chess.isStalemate()) {
			return 'Stalemate!'
		}

		return null
	}

	// Parse PGN and extract moves
	static parsePgnMoves(pgn: string): string[] {
		try {
			const tempChess = new Chess()
			tempChess.loadPgn(pgn + "\n")
			return tempChess.history()
		} catch (error) {
			console.error('Failed to parse PGN:', error)
			return []
		}
	}

	// Player color determination from PGN/ECO
	static determinePlayerColor(pgn: string | null, eco: string | null): PlayerColor {
		const ecoResult = ChessService.analyzeECOCode(eco)
		const pgnResult = ChessService.analyzePGNMoves(pgn, eco, ecoResult)
		return pgnResult ?? ecoResult ?? 'white'
	}

	private static analyzeECOCode(ecoCode: string | null): PlayerColor | null {
		if (!ecoCode) return null
		const firstChar = ecoCode[0].toUpperCase()

		// ECO codes: A, C, D typically indicate white's perspective; B, E indicate black's
		if (firstChar === 'A' || firstChar === 'C' || firstChar === 'D') {
			return 'white'
		}
		if (firstChar === 'B' || firstChar === 'E') {
			return 'black'
		}
		return null
	}

	private static analyzePGNMoves(
		pgn: string | null,
		ecoCode: string | null,
		ecoResult: PlayerColor | null
	): PlayerColor | null {
		if (!pgn) return null

		try {
			const tempChess = new Chess()
			tempChess.loadPgn(pgn + "\n")
			const moves = tempChess.history()

			if (moves.length < 1) return null
			if (moves.length === 1) return ecoResult

			const firstMove = moves[0]
			const ecoPrefix = ecoCode?.[0]

			// Determine learning side based on first move and ECO code
			if (firstMove === 'e4' && ecoPrefix === 'B') return 'black'
			if (firstMove === 'e4' && ecoPrefix === 'C') return 'white'
			if (firstMove === 'd4' && ecoPrefix === 'D') return 'white'
			if (firstMove === 'd4' && ecoPrefix === 'E') return 'black'

			return ecoResult
		} catch (error) {
			console.error('PGN parsing failed:', error)
			return null
		}
	}
}
