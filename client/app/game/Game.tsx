import { Chess, type Square } from "chess.js"
import type { DragEvent } from "react"
import { useEffect, useRef, useState } from "react"
import ChessBoard from "./ChessBoard"
import GameStats from "./GameStats"
import { useSocket } from "~/hooks/useSocket"
import { fenToBoard } from "~/utils/utils"

type ChessGameProps = {
	gameId: string
	pgn: string | null
}

export default function ChessGame({ gameId, pgn }: ChessGameProps) {
	const chess = useRef(new Chess());
	const { data, isConnected, sendMsg } = useSocket({ gameId });
	if (pgn) {
		chess.current.loadPgn(pgn + "\n")
	}
	chess.current.setHeader('gameId', gameId)
	const [fen, setFen] = useState(chess.current.fen());
	const [turn, setTurn] = useState(chess.current.turn())
	const [history, setHistory] = useState<string[]>([])
	const [isFlipped, setIsFlipped] = useState(false)
	const [sourceSquare, setSourceSquare] = useState<string | null>(null);
	const [gameOutcome, setGameOutcome] = useState<string | null>(null);
	const [availableMoves, setAvailableMoves] = useState<string[]>([])

	useEffect(() => {
		if (turn === 'b') setIsFlipped(true)
		console.log(chess.current.fen())
		console.log('isConnected', isConnected)
	}, [])

	useEffect(() => {
		if (data && data?.type === 'GAME_UPDATE') {
			const payload = data?.payload;
			chess.current.load(payload.fen);
			setFen(chess.current.fen());
			setHistory(chess.current.history())
			if (chess.current.isGameOver()) {
				console.log('game is over')
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

	useEffect(() => {
		if (chess.current.isGameOver()) {
			if (chess.current.isCheckmate()) {
				let player = chess.current.turn() === 'w' ? 'black' : 'white'
				setGameOutcome(`${player} wins by checkmate!`);
			} else if (chess.current.isDraw()) {
				setGameOutcome('The game is a draw.');
			} else if (chess.current.isStalemate()) {
				setGameOutcome('Stalemate!');
			}
		}
	}, [sourceSquare])

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
			console.log("Illegal move:", e);
		}
		// Clear the source 
		// square regardless of move legality
		setSourceSquare(null);

		if (move) {
			setFen(chess.current.fen());
			setHistory(chess.current.history())
			const payload = {
				from: move.from,
				to: move.to,
				promotion: move.promotion || ''
			};
			sendMsg('MAKE_MOVE', payload);
			setTurn(chess.current.turn())
			setAvailableMoves([])
		}
	};


	const onDragStart = (e: DragEvent<HTMLDivElement>, square: string) => {
		setAvailableMoves(chess.current.moves({ square: square as Square }))
		setSourceSquare(square);
	};

	const onDragOver = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
	};

	const onDrop = (e: DragEvent<HTMLDivElement>, square: string) => {
		e.preventDefault();
		onPieceDrop(square);
	};

	const onClick = (square: string) => {
		if (!sourceSquare) {
			setAvailableMoves(chess.current.moves({ square: square as Square }))
			setSourceSquare(square)
		} else {
			onPieceDrop(square)
		}
	}

	return (
		<main className="mt-8 w-full h-full grid grid-cols-1 lg:grid-cols-2 px-5">
			<section className="p-2">
				<ChessBoard
					boardArray={fenToBoard(fen, isFlipped)}
					onDragStart={onDragStart}
					onDragOver={onDragOver}
					onDrop={onDrop}
					onClick={onClick}
					availableMoves={availableMoves}
					isFlipped={isFlipped}
				/>
			</section>
			<section className="p-2">
				<GameStats
					isConnected={isConnected}
					gameOutcome={gameOutcome}
					handleNewGame={handleNewGame}
					turn={turn}
					history={history}
					fen={fen}
				/>
			</section>
		</main>
	);
};
