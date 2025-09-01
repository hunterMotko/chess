import type { SetStateAction, DragEvent } from "react"
import { toChessNotation, pieceImgs, flippedNotation } from "~/utils/utils"

type ChessBoardProps = {
	boardArray: (string | null)[][]
	onDragStart: (e: DragEvent<HTMLDivElement>, square: string) => void
	onDragOver: (e: DragEvent<HTMLDivElement>) => void
	onDrop: (e: DragEvent<HTMLDivElement>, square: string) => void
	onClick: (square: string) => void
	availableMoves: string[]
	isFlipped: boolean
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
	isFlipped
}: ChessBoardProps) {
	const displayRanks = isFlipped ? ranks.reverse() : ranks;
	const displayFiles = isFlipped ? files.reverse() : files;

	return (
		<div className="grid grid-cols-8 grid-rows-8 w-full mx-auto">
			{boardArray.map((row, rowIndex) => (
				row.map((piece, colIndex) => {
					const square = (isFlipped) ? flippedNotation(rowIndex, colIndex) : toChessNotation(rowIndex, colIndex);
					const isLightSquare = (rowIndex + colIndex) % 2 === 0;
					const showRank = colIndex === 0
					const showFile = rowIndex === 7
					let possibleMoveSquare = false

					if (availableMoves.length > 0) {
						availableMoves.forEach(item => {
							if (item.includes(square)) {
								possibleMoveSquare = true
							}
						})
					}

					const fontColor = isLightSquare ? 'text-stone-700' : 'text-white'
					return (
						<div
							key={square}
							className={`relative w-full h-full ${isLightSquare ? 'light' : 'dark'}`}
							onDragOver={onDragOver}
							onDrop={(e) => onDrop(e, square)}
							onClick={() => onClick(square)}
						>
							{showFile && (
								<span className={`absolute right-0 bottom-0 text-xl font-semibold ${fontColor}`}>
									{displayFiles[colIndex]}
								</span>
							)}
							{showRank && (
								<span className={`absolute left-0 top-0 text-xl font-semibold ${fontColor}`}>
									{displayRanks[rowIndex]}
								</span>
							)}
							{possibleMoveSquare && (
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="h-full w-full bg-blue-500 opacity-40 hover:opacity-100 transition-opacity duration-200" />
								</div>
							)}
							{piece && (
								<img
									className="piece ml-1"
									src={`/${pieceImgs[piece]}`}
									alt={piece}
									draggable
									onDragStart={(e) => onDragStart(e, square)}
								/>
							)}
						</div>
					);
				})
			))}
		</div>
	)
}
