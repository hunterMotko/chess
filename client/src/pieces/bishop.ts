import { Piece } from "./piece";

export class Bishop extends Piece {
	protected directions = [
		{ x: 1, y: 1 },
		{ x: 1, y: -1 },
		{ x: -1, y: 1 },
		{ x: -1, y: -1 }
	];

	constructor(bishopColor: Color) {
	}
}
