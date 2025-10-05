import { Chess, type Square } from "chess.js"
import type { DragEvent } from "react"
import { useEffect, useRef, useState } from "react"
import ChessBoard from "./ChessBoard"
import GameStats from "./GameStats"
import { useSocket } from "~/hooks/useSocket"
import { fenToBoard } from "~/utils/utils"
import { ChessErrorBoundary } from "~/components/ChessErrorBoundary"

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
	const [lastMoveAttempt, setLastMoveAttempt] = useState<{ from: string; to: string; isIllegal: boolean } | null>(null)

	useEffect(() => {
		if (turn === 'b') setIsFlipped(true)
		console.log(chess.current.fen())
		console.log('isConnected', isConnected)
	}, [])

	useEffect(() => {
		if (data) {
			if (data.type === 'game_state') {
				const payload = data.payload;
				chess.current.load(payload.fen);
				setFen(chess.current.fen());
				setHistory(chess.current.history())
				setTurn(chess.current.turn())
				
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
			} else if (data.type === 'ai_move') {
				const payload = data.payload;
				try {
					const move = chess.current.move({
						from: payload.from,
						to: payload.to,
						promotion: payload.promotion || 'q'
					});
					if (move) {
						setFen(chess.current.fen());
						setHistory(chess.current.history())
						setTurn(chess.current.turn())
					}
				} catch (e) {
					console.error("Failed to apply AI move:", e);
				}
			}
		}
	}, [data]);


	const handleNewGame = () => {
		chess.current.reset();
		setFen(chess.current.fen());
		setGameOutcome(null);
		const payload = { mode: 'classic' };
		sendMsg('new_game', payload);
	};

	const handleNewAIGame = (difficulty: number = 10) => {
		chess.current.reset();
		setFen(chess.current.fen());
		setGameOutcome(null);
		setHistory([]);
		const payload = { mode: 'ai', difficulty };
		sendMsg('new_ai_game', payload);
	};

	const handleFlipBoard = () => {
		setIsFlipped(!isFlipped);
	};

	const handleResign = () => {
		setGameOutcome(`${turn === 'w' ? 'Black' : 'White'} wins by resignation!`);
		sendMsg('game_over', { result: 'resignation', winner: turn === 'w' ? 'black' : 'white' });
	};

	const handleDrawOffer = () => {
		sendMsg('game_over', { result: 'draw_offer', player: turn });
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
		let wasIllegal = false;

		try {
			move = chess.current.move({
				from: sourceSquare,
				to: targetSquare,
				promotion: 'q',
			});
		} catch (e) {
			console.log("Illegal move:", e);
			wasIllegal = true;
			setLastMoveAttempt({
				from: sourceSquare,
				to: targetSquare,
				isIllegal: true
			});
			// Clear the illegal move highlight after 1 second
			setTimeout(() => setLastMoveAttempt(null), 1000);
		}

		// Clear the source square regardless of move legality
		setSourceSquare(null);

		if (move) {
			setLastMoveAttempt(null); // Clear any previous illegal move highlights
			setFen(chess.current.fen());
			setHistory(chess.current.history())
			const payload = {
				from: move.from,
				to: move.to,
				promotion: move.promotion || ''
			};
			sendMsg('move', payload);
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

	const handleGameReset = () => {
		chess.current = new Chess();
		setFen(chess.current.fen());
		setTurn(chess.current.turn());
		setHistory([]);
		setGameOutcome(null);
		setSourceSquare(null);
		setAvailableMoves([]);
		setLastMoveAttempt(null);
	};

	return (
		<ChessErrorBoundary gameId={gameId} onGameReset={handleGameReset}>
			<main className="min-h-screen bg-gray-950 text-white p-2 sm:p-4">
				<div className="max-w-7xl mx-auto">
					<header className="text-center mb-4 sm:mb-6">
						<h1 className="text-2xl sm:text-3xl font-bold text-indigo-400 mb-2">Chess Game</h1>
						{!isConnected && (
							<div className="bg-red-900 border border-red-600 rounded-lg p-2 inline-block">
								<span className="text-red-200 text-sm">⚠ Connecting to server...</span>
							</div>
						)}
					</header>
				
				<div className="grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-3 gap-4 lg:gap-6">
					<div className="lg:col-span-3 xl:col-span-2 flex justify-center">
						<div className="w-full">
							<ChessBoard
								boardArray={fenToBoard(fen, isFlipped)}
								onDragStart={onDragStart}
								onDragOver={onDragOver}
								onDrop={onDrop}
								onClick={onClick}
								availableMoves={availableMoves}
								isFlipped={isFlipped}
								selectedSquare={sourceSquare}
								lastMoveAttempt={lastMoveAttempt}
							/>
						</div>
					</div>
					<div className="lg:col-span-2 xl:col-span-1">
						<div className="h-full min-h-[500px] lg:min-h-[600px] xl:max-h-[600px]">
							<GameStats
								isConnected={isConnected}
								gameOutcome={gameOutcome}
								handleNewGame={handleNewGame}
								handleFlipBoard={handleFlipBoard}
								handleResign={handleResign}
								handleDrawOffer={handleDrawOffer}
								turn={turn}
								history={history}
								fen={fen}
								isFlipped={isFlipped}
							/>
						</div>
					</div>
				</div>
			</div>
		</main>
		</ChessErrorBoundary>
	);
};
