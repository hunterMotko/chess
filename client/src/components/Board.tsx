import './board.css'
import type { SquareValue } from './Square';
import Square from './Square';

interface BoardProps {
	squares: SquareValue[];
	onClick: (i: number) => void;
}

const Board: React.FC<BoardProps> = ({ squares, onClick }) => {
	const renderSquare = (i: number) => {
		const row = Math.floor(i / 8);
		const col = i % 8;
		const isLightSquare = (row + col) % 2 === 0;

		return (
			<Square
				key={i}
				value={squares[i]}
				onClick={() => onClick(i)}
				isLightSquare={isLightSquare}
			/>
		);
	};

	const boardRows = [];
	for (let row = 0; row < 8; row++) {
		const rowSquares = [];
		for (let col = 0; col < 8; col++) {
			rowSquares.push(renderSquare(row * 8 + col));
		}
		boardRows.push(<div key={row} className="board-row">{rowSquares}</div>);
	}

	return (
		<div className="board">
			{boardRows}
		</div>
	);
};

export default Board

