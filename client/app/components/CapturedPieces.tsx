import { useMemo } from "react"
import { pieceImgs } from "~/utils/utils"

type CapturedPiece = {
	type: string // 'p', 'r', 'n', 'b', 'q' (no kings)
	count: number
}

type CapturedPiecesProps = {
	capturedByWhite: string[] // Array of captured black pieces (lowercase)
	capturedByBlack: string[] // Array of captured white pieces (uppercase)
	showSide?: 'white' | 'black' | 'both' // Which side's captures to show
	className?: string
}

// Piece values for material calculation
const PIECE_VALUES: { [key: string]: number } = {
	'p': 1, 'P': 1,
	'r': 5, 'R': 5,
	'n': 3, 'N': 3,
	'b': 3, 'B': 3,
	'q': 9, 'Q': 9
}


function expandPieces(pieces: string[]): string[] {
	// Sort pieces by value (highest to lowest) for consistent display
	return pieces.sort((a, b) => {
		const aValue = PIECE_VALUES[a] || 0
		const bValue = PIECE_VALUES[b] || 0
		return bValue - aValue
	})
}

function calculateMaterialAdvantage(capturedByWhite: string[], capturedByBlack: string[]): number {
	const whitePoints = capturedByWhite.reduce((sum, piece) => sum + (PIECE_VALUES[piece] || 0), 0)
	const blackPoints = capturedByBlack.reduce((sum, piece) => sum + (PIECE_VALUES[piece] || 0), 0)
	return whitePoints - blackPoints
}

export default function CapturedPieces({ capturedByWhite, capturedByBlack, showSide = 'both', className = "" }: CapturedPiecesProps) {
	const whitePieces = useMemo(() => expandPieces([...capturedByWhite]), [capturedByWhite])
	const blackPieces = useMemo(() => expandPieces([...capturedByBlack]), [capturedByBlack])
	const materialAdvantage = useMemo(() => calculateMaterialAdvantage(capturedByWhite, capturedByBlack), [capturedByWhite, capturedByBlack])

	const showWhite = showSide === 'white' || showSide === 'both'
	const showBlack = showSide === 'black' || showSide === 'both'

	return (
		<div className={`w-full sm:max-w-[400px] md:max-w-[500px] lg:max-w-[550px] xl:max-w-[600px] mx-auto ${className}`}>
			{/* White captures (captured black pieces) */}
			<div className="min-h-[28px] flex items-center justify-start gap-1 px-1">
				{showWhite && whitePieces.map((piece, index) => (
					<img
						key={`white-${piece}-${index}`}
						src={`/${pieceImgs[piece]}`}
						alt={`Black ${piece}`}
						className="w-6 h-6 drop-shadow-md"
					/>
				))}
				{showSide === 'both' && materialAdvantage > 0 && (
					<span className="text-emerald-400 text-sm font-bold ml-2">
						+{materialAdvantage}
					</span>
				)}
			</div>

			{/* Black captures (captured white pieces) */}
			<div className="min-h-[28px] flex items-center justify-start gap-1 px-1">
				{showBlack && blackPieces.map((piece, index) => (
					<img
						key={`black-${piece}-${index}`}
						src={`/${pieceImgs[piece.toUpperCase()]}`}
						alt={`White ${piece}`}
						className="w-6 h-6 drop-shadow-md"
					/>
				))}
				{showSide === 'both' && materialAdvantage < 0 && (
					<span className="text-emerald-400 text-sm font-bold ml-2">
						+{Math.abs(materialAdvantage)}
					</span>
				)}
			</div>
		</div>
	)
}