import { Chess } from "chess.js"
import type { Square } from "chess.js"
import { useEffect, useState } from "react"
import BoardSquare from "./BoardSquare"
import type { SquareItem } from "./BoardSquare"
import { useSocket } from "~/hooks/useSocket"

function curSquare(i: number, j: number): Square {
	return `${String.fromCharCode(97 + j)}${8 - i}` as Square
}

export default function Game() {
	const socket = useSocket()
	const [chess, setChess] = useState<Chess | null>(null)
	const [toMove, setToMove] = useState('')
	const [posMoves, setPosMoves] = useState<string[]>([])
	const [selectPiece, setSelectedPiece] = useState<SquareItem>(null)

	useEffect(() => {
		if (!socket) return;

		socket.onmessage = event => {
			console.log(event)
			const message = JSON.parse(event.data)
			console.log("SOCKET Message", message)
		}

		socket.onerror = err => {
			console.error("SOCKET ERROR", err)
		}

		socket.send(JSON.stringify({ type: 'chess client', payload: "hello server" }))
	}, [socket])

	useEffect(() => {
		const fenCache = localStorage.getItem('fenCache')
		if (fenCache) {
			setChess(new Chess(fenCache))
		} else {
			setChess(new Chess())
		}
	}, [])

	useEffect(() => {
		let fen = chess?.fen()
		if (fen) {
			localStorage.setItem('fenCache', fen)
		}
	}, [chess, toMove, posMoves])

	function handleMove(sq: SquareItem, pos: Square) {
		if (toMove === '') {
			setPosMoves(chess?.moves({ square: pos }) ?? [])
			setToMove(pos)
			setSelectedPiece(sq)
			return
		}
		if (selectPiece && chess?.getCastlingRights(selectPiece.color)) {
			chess?.move({ from: toMove, to: pos })
		} else if (posMoves.some(val => val.includes(pos))) {
			chess?.move({ from: toMove, to: pos })
		}
		setToMove('')
	}

	return (
		<div className="game">
			{chess && (
				<Board
					chess={chess}
					handleMove={handleMove}
				/>
			)}
		</div>
	)
}

type BoardProps = {
	chess: Chess;
	handleMove: (sq: SquareItem, pos: Square) => void
}

function Board({ chess, handleMove }: BoardProps) {
	return (
		<>
			{chess.board().map((row, i) =>
				<div key={i} className="row">
					{row.map((sq, j) => (
						<BoardSquare
							key={`${i},${j}`}
							sq={sq}
							sqColor={chess.squareColor(curSquare(i, j))}
							pos={curSquare(i, j)}
							onClick={handleMove}
						/>
					))}
				</div>
			)}
		</>
	)
}
