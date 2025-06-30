import { useState, useEffect } from 'react';
import Board from './Board';
import type { SquareValue } from './Square';
import './game.css'; // We'll create this CSS file next

const Game: React.FC = () => {
	const [squares, setSquares] = useState<SquareValue[]>(Array(64).fill(null));

	useEffect(() => {
		const initialSquares: SquareValue[] = Array(64).fill(null);
		for (let i = 8; i < 16; i++) {
			initialSquares[i] = 'P';
		}
		for (let i = 48; i < 56; i++) {
			initialSquares[i] = 'P';
		}
		initialSquares[0] = 'R';
		initialSquares[7] = 'R';
		initialSquares[56] = 'R';
		initialSquares[63] = 'R';
		initialSquares[1] = 'N';
		initialSquares[6] = 'N';
		initialSquares[57] = 'N';
		initialSquares[62] = 'N';
		initialSquares[2] = 'B';
		initialSquares[5] = 'B';
		initialSquares[58] = 'B';
		initialSquares[61] = 'B';
		initialSquares[3] = 'Q';
		initialSquares[59] = 'Q';
		initialSquares[4] = 'K';
		initialSquares[60] = 'K';

		setSquares(initialSquares);
	}, []);

	const handleClick = (i: number) => {
		console.log(`Clicked square ${i} with value ${squares[i]}`);
	};

	return (
		<div className="game">
			<div className="game-board">
				<Board squares={squares} onClick={handleClick} />
			</div>
			<div className="game-info">
				<div>{/* Game status: e.g., "Next player: White" */}</div>
				<ol>{/* Game moves history */}</ol>
			</div>
		</div>
	);
};

export default Game;
