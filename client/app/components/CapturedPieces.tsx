import { useMemo } from "react"
import { pieceImgs, PIECE_VALUES } from "~/utils/utils"

type CapturedPiecesProps = {
	capturedByWhite: string[] // Array of captured black pieces (lowercase)
	capturedByBlack: string[] // Array of captured white pieces (uppercase)
	showSide?: 'white' | 'black' // Which side's captures to show
	className?: string
}

function expandPieces(pieces: string[]): string[] {
	// Sort pieces by value (highest to lowest) for consistent display
	return pieces.sort((a, b) => {
		const aValue = PIECE_VALUES[a] || 0
		const bValue = PIECE_VALUES[b] || 0
		return bValue - aValue
	})
}

export default function CapturedPieces(
	{
		capturedByWhite,
		capturedByBlack,
		showSide,
		className = ""
	}: CapturedPiecesProps
) {
	const whitePieces = useMemo(() => expandPieces([...capturedByWhite]), [capturedByWhite])
	const blackPieces = useMemo(() => expandPieces([...capturedByBlack]), [capturedByBlack])
	const show = showSide === 'white' ? (
		whitePieces.map((piece, index) => (
			<img
				key={`white-${piece}-${index}`}
				src={`/${pieceImgs[piece]}`}
				alt={`Black ${piece}`}
				className="w-6 h-6 drop-shadow-md"
			/>
		))
	) : (
		blackPieces.map((piece, index) => (
			<img
				key={`black-${piece}-${index}`}
				src={`/${pieceImgs[piece.toUpperCase()]}`}
				alt={`White ${piece}`}
				className="w-6 h-6 drop-shadow-md"
			/>
		))
	)

	return (
		<div className={
			`bg-gray-700 rounded w-full sm:max-w-[400px] md:max-w-[500px] lg:max-w-[550px] xl:max-w-[600px] mx-auto ${className}`
		}>
			<div className="min-h-[32px] flex items-center justify-start gap-1 px-1">
				{show}
			</div>
		</div>
	)
}
