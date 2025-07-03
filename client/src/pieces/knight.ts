import { Piece } from "./piece";

export class Knight extends Piece {
	directions = [
		{ x: 1, y: 2 },
		{ x: 1, y: -2 },
		{ x: -1, y: 2 },
		{ x: -1, y: -2 },
		{ x: 2, y: 1 },
		{ x: 2, y: -1 },
		{ x: -2, y: 1 },
		{ x: -2, y: -1 }
	];

	constructor(knightColor) {
	}
}
