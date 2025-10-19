import type { Square } from "chess.js";

export function curSquare(i: number, j: number): Square {
	return `${String.fromCharCode(97 + j)}${8 - i}` as Square
}

export function fenToBoard(fen: string, isFlipped: boolean): (string | null)[][] {
	const [boardFen] = fen.split(' ');
	const rows = boardFen.split('/');
	const board: (string | null)[][] = [];
	rows.forEach(row => {
		const newRow = [];
		for (let char of row) {
			if (isNaN(parseInt(char))) {
				newRow.push(char);
			} else {
				const emptySquares = parseInt(char);
				for (let i = 0; i < emptySquares; i++) {
					newRow.push(null);
				}
			}
		}
		board.push(newRow);
	});

	if (isFlipped) {
		// When flipped, reverse both rows and columns to maintain coordinate consistency
		board.reverse();
		board.forEach(row => row.reverse());
	}

	return board;
};

// Helper function to get the square's coordinate from its position in the array
export function toChessNotation(rowIndex: number, colIndex: number): string {
	const files = 'abcdefgh';
	const rank = 8 - rowIndex;
	const file = files[colIndex];
	return `${file}${rank}`;
};

// REMOVED: flippedNotation - chess coordinates are always consistent
// The board visual can flip, but coordinates stay the same

export const pieceImgs: {
	[keyof: string]: string
} = {
	'R': 'w-rook.svg',
	'N': 'w-knight.svg',
	'B': 'w-bishop.svg',
	'Q': 'w-queen.svg',
	'K': 'w-king.svg',
	'P': 'w-pawn.svg',
	'r': 'b-rook.svg',
	'n': 'b-knight.svg',
	'b': 'b-bishop.svg',
	'q': 'b-queen.svg',
	'k': 'b-king.svg',
	'p': 'b-pawn.svg',
}

// Piece values for material calculation
export const PIECE_VALUES: { [key: string]: number } = {
	'p': 1, 'P': 1,
	'r': 5, 'R': 5,
	'n': 3, 'N': 3,
	'b': 3, 'B': 3,
	'q': 9, 'Q': 9
}

