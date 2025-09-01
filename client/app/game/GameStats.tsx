import { Fragment } from "react"

type GameStatsProps = {
	isConnected: boolean
	gameOutcome: string | null
	handleNewGame: () => void
	history: string[]
	fen: string
	turn: string
}

export default function GameStats({
	isConnected, gameOutcome, handleNewGame, history, fen, turn
}: GameStatsProps) {
	return (
		<div className="w-full h-full border rounded flex flex-col justify-center items-center">
			<div className="w-full h-1/4 p-3">
				<div>
					<p>{isConnected ? 'Connected' : 'Disconnected'}</p>
					{gameOutcome && (
						<>
							<h2>Game Over: {gameOutcome}</h2>
							<button
								className="border rounded p-2 bg-green-800"
								onClick={handleNewGame}
							>
								New Game
							</button>
						</>
					)}
				</div>
				<div className="flex justify-around">
					<h3>To Move: </h3>
					<h3>
						{turn === 'w' ? "White" : "Black"}
					</h3>
				</div>
			</div>
			<div className="border w-full h-1/2 p-2 overflow-y-scroll">
				<h3>Move History:</h3>
				<div className="grid grid-cols-7">
					{history.map((item, i) => (
						(i % 2 === 0 ?
							<Fragment key={item + i}>
								<span className="col-span-1">{i / 2 + 1}{' ).'}</span>
								<span className="col-span-3">{item}</span>
							</Fragment>
							: <span key={item + i} className="col-span-3">{item}</span>
						)
					))}
				</div>
			</div >
			<div className="w-full p-2 h-1/4 text-center">
				<h3>Current FEN:</h3>
				<pre className="text-wrap">{fen}</pre>
			</div>
		</div>
	)
}
