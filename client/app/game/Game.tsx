import { Chess } from "chess.js"
import type { Square } from "chess.js"
import { useEffect, useRef, useState } from "react"
import type { DragEvent } from "react"
import { useSocket } from "~/hooks/useSocket"

function curSquare(i: number, j: number): Square {
	return `${String.fromCharCode(97 + j)}${8 - i}` as Square
}

function fenToBoard(fen: string): (string | null)[][] {
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
	return board;
};

// Helper function to get the square's coordinate from its position in the array
function toChessNotation(rowIndex: number, colIndex: number): string {
	const files = 'abcdefgh';
	const rank = 8 - rowIndex;
	const file = files[colIndex];
	return `${file}${rank}`;
};


const pieceImgs: {
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

type ChessGameProps = {
	gameId: string
}
export default function ChessGame({ gameId }: ChessGameProps) {
	const { data, isConnected, sendMsg } = useSocket({ gameId });
	const chess = useRef(new Chess());
	chess.current.setHeader('gameId', gameId)
	const [fen, setFen] = useState(chess.current.fen());
	const [sourceSquare, setSourceSquare] = useState<string | null>(null);
	const [gameOutcome, setGameOutcome] = useState<string | null>(null);

	useEffect(() => {
		if (data && data.type === 'GAME_UPDATE') {
			const payload = data.payload;
			chess.current.load(payload.fen);
			setFen(chess.current.fen());
			if (chess.current.isGameOver()) {
				if (chess.current.isCheckmate()) {
					setGameOutcome(`${chess.current.turn() === 'w' ? 'black' : 'white'} wins by checkmate!`);
				} else if (chess.current.isDraw()) {
					setGameOutcome('The game is a draw.');
				} else if (chess.current.isStalemate()) {
					setGameOutcome('Stalemate!');
				}
			}
		}
	}, [data]);

	const handleNewGame = () => {
		chess.current.reset();
		setFen(chess.current.fen());
		setGameOutcome(null);
		const payload = { mode: 'classic' };
		sendMsg('NEW_GAME', payload);
	};

	const onPieceDrop = (targetSquare: string) => {
		if (!sourceSquare) return;

		let move = null;
		try {
			move = chess.current.move({
				from: sourceSquare,
				to: targetSquare,
				promotion: 'q',
			});
		} catch (e) {
			console.log("Illegal move:", e.message);
		}

		// Clear the source square regardless of move legality
		setSourceSquare(null);

		if (move) {
			setFen(chess.current.fen());
			const payload = {
				from: move.from,
				to: move.to,
				promotion: move.promotion || ''
			};
			sendMsg('MAKE_MOVE', payload);
		}
	};

	const onDragStart = (e: DragEvent<HTMLDivElement>, square: string) => {
		setSourceSquare(square);
	};

	const onDragOver = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
	};

	const onDrop = (e: DragEvent<HTMLDivElement>, targetSquare: string) => {
		e.preventDefault();
		onPieceDrop(targetSquare);
	};

	const boardArray = fenToBoard(fen);

	return (
		<div className="chess-game-container">
			<h1>Chess App</h1>
			<p>{isConnected ? 'Connected' : 'Disconnected'}</p>

			{gameOutcome && <h2>Game Over: {gameOutcome}</h2>}

			<div className="button-container">
				<button onClick={handleNewGame}>New Game</button>
			</div>

			<div className="chessboard">
				{boardArray.map((row, rowIndex) => (
					row.map((piece, colIndex) => {
						const square = toChessNotation(rowIndex, colIndex);
						const isLightSquare = (rowIndex + colIndex) % 2 === 0;
						return (
							<div
								key={square}
								className={`square ${isLightSquare ? 'light' : 'dark'}`}
								onDragOver={onDragOver}
								onDrop={(e) => onDrop(e, square)}
							>
								{piece && (
									<img
										className="piece"
										src={`/${pieceImgs[piece]}`}
										alt={piece}
										draggable
										onDragStart={(e) => onDragStart(e, square)}
									/>
								)}
							</div>
						);
					})
				))}
			</div>

			<h3>Current FEN:</h3>
			<pre>{fen}</pre>
		</div>
	);
};
