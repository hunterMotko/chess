import { Piece } from "./piece";

export class Rook extends Piece {
	hasMoved = false;
	directions = [
		{ x: 1, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 0, y: -1 }
	];

	constructor(rookColor) {
	}
}
