import { Piece } from "./piece";

export class Pawn extends Piece {
	hasMoved = false;
	directions = [
		{ x: 1, y: 0 },
		{ x: 2, y: 0 },
		{ x: 1, y: 1 },
		{ x: 1, y: -1 }
	];

	constructor(pawnColor) {
	}
}
