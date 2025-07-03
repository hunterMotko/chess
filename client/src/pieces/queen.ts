import { Piece } from "./piece";

export class Queen extends Piece {
	directions = [
		{ x: 1, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 0, y: -1 },
		{ x: 1, y: 1 },
		{ x: -1, y: 1 },
		{ x: 1, y: -1 },
		{ x: -1, y: -1 }
	];

	constructor(queenColor) {
	}
}
