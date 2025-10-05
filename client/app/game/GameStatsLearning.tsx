import React from "react"

type OpeningDemoState = {
	isPlaying: boolean
	moves: string[]
	currentMoveIndex: number
	isComplete: boolean
}

type GameStatsLearningProps = {
	isConnected: boolean
	handleFlipBoard: () => void
	history: string[]
	fen: string
	turn: string
	isFlipped: boolean
	openingDemo?: OpeningDemoState
	gameId: string
	onPlayAnotherOpening?: () => void
	lastMoveAttempt?: { from: string; to: string; isIllegal: boolean; errorMessage?: string } | null
}

export default function GameStatsLearning({
	isConnected, handleFlipBoard, history, fen, turn, isFlipped, openingDemo, gameId, onPlayAnotherOpening, lastMoveAttempt
}: GameStatsLearningProps) {

	return (
		<div className="w-full h-full bg-gray-900 rounded-lg shadow-2xl border border-gray-700 flex flex-col">
			{/* Connection Status & Turn */}
			<div className="bg-gray-800 rounded-t-lg p-3 sm:p-4 border-b border-gray-700 flex-shrink-0">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
					<div className="flex items-center space-x-2">
						<div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
						<span className="text-sm text-gray-300">Learning Mode</span>
					</div>
					<div className="flex items-center space-x-2">
						<span className="text-sm text-gray-400">Turn:</span>
						<span className={`font-semibold px-2 py-1 rounded text-sm w-16 text-center ${
							turn === 'w' ? 'bg-white text-black' : 'bg-gray-800 text-white border'
						}`}>
							{turn === 'w' ? "White" : "Black"}
						</span>
					</div>
				</div>

			</div>

			{/* Learning Controls */}
			<div className="p-3 sm:p-4 border-b border-gray-700 flex-shrink-0">
				<h3 className="text-gray-300 text-sm font-semibold mb-3">Learning Controls</h3>

				<div className="space-y-2">
					<div className="flex gap-2">
						<button
							onClick={handleFlipBoard}
							disabled={openingDemo && !openingDemo.isComplete}
							className={`font-medium py-2 px-3 rounded-lg transition-all duration-200 text-sm flex-1 ${
								openingDemo && !openingDemo.isComplete
									? 'bg-gray-700 text-gray-500 cursor-not-allowed'
									: 'bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-500 hover:to-gray-500 text-white shadow-lg hover:shadow-xl'
							}`}
						>
							{isFlipped ? '⬆️' : '⬇️'} Flip
						</button>
						{onPlayAnotherOpening && (
							<button
								onClick={onPlayAnotherOpening}
								disabled={openingDemo && !openingDemo.isComplete}
								className={`font-medium py-2 px-3 rounded-lg transition-all duration-200 text-sm flex-1 ${
									openingDemo && !openingDemo.isComplete
										? 'bg-gray-700 text-gray-500 cursor-not-allowed'
										: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-xl'
								}`}
							>
								🎲 Random
							</button>
						)}
					</div>

					{openingDemo && openingDemo.isComplete && (
						<div className="bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-500/30 rounded-lg p-2 text-center shadow-lg">
							<p className="text-indigo-200 text-xs">🎯 Interactive Mode Enabled</p>
							<p className="text-indigo-300 text-xs mt-1">Click and drag pieces to continue playing!</p>
						</div>
					)}
				</div>
			</div>

			{/* Move History */}
			<div className="flex-1 flex flex-col p-3 sm:p-4 border-b border-gray-700 min-h-0">
				<h3 className="text-gray-300 text-sm font-semibold mb-3 flex-shrink-0">Move History</h3>
				<div className="bg-gray-800 rounded-md flex-1 min-h-0 overflow-hidden">
					{history.length === 0 ? (
						<div className="h-full flex items-center justify-center">
							<p className="text-gray-500 text-sm">No moves yet</p>
						</div>
					) : (
						<div 
							className="h-full overflow-y-auto p-2 sm:p-3"
							style={{
								scrollbarWidth: 'thin',
								scrollbarColor: '#4B5563 #1F2937'
							}}
						>
							<div className="space-y-1">
								{history.map((move, i) => {
									const moveNumber = Math.floor(i / 2) + 1
									const isWhiteMove = i % 2 === 0
									
									if (isWhiteMove) {
										const blackMove = history[i + 1]
										return (
											<div key={`pair-${moveNumber}`} className="flex items-center gap-2 text-xs sm:text-sm">
												<span className="text-gray-400 font-mono w-6 text-right flex-shrink-0">
													{moveNumber}.
												</span>
												<span className="px-2 py-1 rounded hover:bg-gray-700 transition-colors duration-75 font-mono flex-1 min-w-0 text-gray-200">
													{move}
												</span>
												{blackMove && (
													<span className="px-2 py-1 rounded hover:bg-gray-700 transition-colors duration-75 font-mono flex-1 min-w-0 text-gray-200">
														{blackMove}
													</span>
												)}
												{!blackMove && <div className="flex-1"></div>}
											</div>
										)
									}
									return null
								})}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Learning Info */}
			<div className="p-3 sm:p-4 bg-gray-800 rounded-b-lg flex-shrink-0">
				<h3 className="text-gray-300 text-sm font-semibold mb-2">Learning Notes</h3>
				<div className="bg-gray-900 rounded p-2 border border-gray-600">
					{openingDemo && openingDemo.moves.length > 0 ? (
						<div className="text-xs text-gray-400">
							<p>📚 This opening has {openingDemo.moves.length} key moves to learn</p>
							<p className="mt-1">💡 Watch how pieces develop and control the center</p>
						</div>
					) : (
						<p className="text-xs text-gray-400">Select an opening to begin learning</p>
					)}
				</div>
			</div>
		</div>
	)
}