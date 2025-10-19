import { PIECE_VALUES } from "~/utils/utils"

function calculateMaterialAdvantage(capturedByWhite: string[], capturedByBlack: string[]): number {
	const whitePoints = capturedByWhite.reduce((sum, piece) => sum + (PIECE_VALUES[piece] || 0), 0)
	const blackPoints = capturedByBlack.reduce((sum, piece) => sum + (PIECE_VALUES[piece] || 0), 0)
	return whitePoints - blackPoints
}

export default function CalculatePieceValues() {
	return (
		<div></div>
	)
}

