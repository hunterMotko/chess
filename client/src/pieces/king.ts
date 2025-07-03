import { Piece } from "./piece";

export class King extends Piece {
	private hasMoved: boolean = false;
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

	constructor(kingColor: Color) {
	}
}
