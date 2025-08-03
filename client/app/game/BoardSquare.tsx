import type { Square, PieceSymbol, Color } from "chess.js";

const pieceImgs: {
	[keyof: string]: string
} = {
	'wr': '/w-rook.svg',
	'wn': '/w-knight.svg',
	'wb': '/w-bishop.svg',
	'wq': '/w-queen.svg',
	'wk': '/w-king.svg',
	'wp': '/w-pawn.svg',
	'br': '/b-rook.svg',
	'bn': '/b-knight.svg',
	'bb': '/b-bishop.svg',
	'bq': '/b-queen.svg',
	'bk': '/b-king.svg',
	'bp': '/b-pawn.svg',
}

export type SquareItem = {
	square: Square; type: PieceSymbol; color: Color
} | null

export type SquareProps = {
	sq: SquareItem
	pos: Square
	sqColor: string | null
	onClick: (sq: SquareItem, pos: Square) => void
}


export default function BoardSquare({ sq, pos, sqColor, onClick }: SquareProps) {
	let src: null | string = null
	if (sq?.color && sq.type) {
		src = pieceImgs[sq?.color + sq?.type]
	}
	return (
		<div
			key={sq?.square}
			className={`w-20 h-20 place-items-center ${sqColor ?? ''}`}
			onClick={() => onClick(sq, pos)}
		>
			{src && <img className="w-16 h-h-16" src={src} alt={src} />}
		</div>
	)
}
