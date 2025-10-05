import type { SetStateAction, DragEvent } from "react"
import { toChessNotation, pieceImgs } from "~/utils/utils"

// Helper function to extract target squares from chess moves
function getTargetSquareFromMove(move: string, selectedSquare: string): string | null {
	// Handle castling moves
	if (move === 'O-O') {
		// Kingside castling
		if (selectedSquare === 'e1') return 'g1'; // White king
		if (selectedSquare === 'e8') return 'g8'; // Black king
	}
	if (move === 'O-O-O') {
		// Queenside castling
		if (selectedSquare === 'e1') return 'c1'; // White king
		if (selectedSquare === 'e8') return 'c8'; // Black king
	}
	
	// Handle regular moves - extract the target square
	// Examples: "Nf3", "exd4", "Qh5+", "Rd1#", "a4"
	const match = move.match(/[a-h][1-8]/g);
	if (match && match.length > 0) {
		// Return the last square mentioned (which is usually the target)
		return match[match.length - 1];
	}
	
	return null;
}

type ChessBoardProps = {
	boardArray: (string | null)[][]
	onDragStart: (e: DragEvent<HTMLDivElement>, square: string) => void
	onDragOver: (e: DragEvent<HTMLDivElement>) => void
	onDrop: (e: DragEvent<HTMLDivElement>, square: string) => void
	onClick: (square: string) => void
	availableMoves: string[]
	isFlipped: boolean
	selectedSquare?: string | null
	lastMoveAttempt?: { from: string; to: string; isIllegal: boolean; errorMessage?: string } | null
	lastMove?: { from: string; to: string } | null
}

const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default function ChessBoard({
	boardArray,
	onDragStart,
	onDragOver,
	onDrop,
	onClick,
	availableMoves,
	isFlipped,
	selectedSquare,
	lastMoveAttempt,
	lastMove
}: ChessBoardProps) {
	const displayRanks = isFlipped ? [...ranks].reverse() : ranks;
	const displayFiles = isFlipped ? [...files].reverse() : files;

	return (
		<div className="grid grid-cols-8 grid-rows-8 w-full sm:max-w-[400px] md:max-w-[500px] lg:max-w-[550px] xl:max-w-[600px] mx-auto aspect-square border-2 border-gray-700 shadow-2xl touch-manipulation">
			{boardArray.map((row, boardRowIndex) => (
				row.map((piece, boardColIndex) => {
					// Chess coordinates are ALWAYS calculated from standard perspective (white on bottom)
					// When board is flipped, we need to convert visual indices to logical chess indices
					const chessRowIndex = isFlipped ? (7 - boardRowIndex) : boardRowIndex;
					const chessColIndex = isFlipped ? (7 - boardColIndex) : boardColIndex;
					const square = toChessNotation(chessRowIndex, chessColIndex);
					const isLightSquare = (boardRowIndex + boardColIndex) % 2 === 0;
					// Show labels on visual board edges (always bottom and left)
					// This ensures labels appear in consistent visual positions
					const showRank = boardColIndex === 0 // Show ranks on visual left edge
					const showFile = boardRowIndex === 7 // Show files on visual bottom edge
					const chessFile = square[0] // 'a' through 'h'
					const chessRank = square[1] // '1' through '8'
					let possibleMoveSquare = false
					const isSelectedSquare = selectedSquare === square
					const isIllegalMoveTarget = lastMoveAttempt?.isIllegal && 
						(lastMoveAttempt?.from === square || lastMoveAttempt?.to === square)
					const isLastMoveSquare = lastMove && 
						(lastMove.from === square || lastMove.to === square)

					if (availableMoves.length > 0 && selectedSquare) {
						availableMoves.forEach(move => {
							const targetSquare = getTargetSquareFromMove(move, selectedSquare);
							if (targetSquare === square) {
								possibleMoveSquare = true;
							}
						})
					}

					const fontColor = isLightSquare ? 'text-stone-700' : 'text-white'
					return (
						<div
							key={square}
							className={`relative w-full h-full cursor-pointer select-none touch-manipulation ${isLightSquare ? 'light' : 'dark'} ${
								isSelectedSquare ? 'ring-4 ring-yellow-400 ring-inset animate-square-pulse' : ''
							} ${
								isIllegalMoveTarget ? 'ring-4 ring-red-500 ring-inset animate-illegal-shake bg-red-900 bg-opacity-40' : ''
							} ${
								isLastMoveSquare ? 'ring-2 ring-blue-400 bg-blue-100 bg-opacity-20 animate-piece-land' : ''
							} transition-all duration-300 ease-in-out min-h-[42px] min-w-[42px]`}
							onDragOver={onDragOver}
							onDrop={(e) => onDrop(e, square)}
							onClick={() => onClick(square)}
						>
							{showFile && (
								<span className={`absolute right-0 bottom-0 text-xl font-semibold ${fontColor}`}>
									{square[0]}
								</span>
							)}
							{showRank && (
								<span className={`absolute left-0 top-0 text-xl font-semibold ${fontColor}`}>
									{square[1]}
								</span>
							)}
							{possibleMoveSquare && !isIllegalMoveTarget && (
								<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
									{piece ? (
										// Show capture indicator for occupied squares
										<div className="w-full h-full border-4 border-green-500 rounded-lg opacity-70 animate-move-indicator-bounce capture-move-ring" />
									) : (
										// Show move indicator for empty squares
										<div className="w-1/3 h-1/3 bg-green-500 rounded-full opacity-80 shadow-lg animate-move-indicator-bounce legal-move-dot" />
									)}
								</div>
							)}
							{piece && (
								<img
									className={`piece ml-1 cursor-grab active:cursor-grabbing drop-shadow-md touch-manipulation transition-all duration-300 ease-out transform
										${isLastMoveSquare ? 'animate-piece-land' : ''}
										${isSelectedSquare ? 'scale-110 brightness-110 z-10 animate-piece-select' : 'hover:scale-105 active:scale-95'}`}
									src={`/${pieceImgs[piece]}`}
									alt={piece}
									draggable
									onDragStart={(e) => onDragStart(e, square)}
									style={{
										touchAction: 'manipulation',
										WebkitTouchCallout: 'none',
										WebkitUserSelect: 'none'
									}}
								/>
							)}
						</div>
					);
				})
			))}
		</div>
	)
}
