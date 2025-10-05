import { memo } from "react"

type OpeningDemoState = {
	isPlaying: boolean
	moves: string[]
	currentMoveIndex: number
	isComplete: boolean
}

type PlaybackState = {
	isActive: boolean
	currentMoveIndex: number
	maxMoveIndex: number
}

type GameStatsProps = {
	isConnected: boolean
	gameOutcome: string | null
	handleNewGame: () => void
	handleFlipBoard: () => void
	handleResign: () => void
	handleDrawOffer: () => void
	history: string[]
	fen: string
	turn: string
	isFlipped: boolean
	openingDemo?: OpeningDemoState
	playbackState?: PlaybackState
	onFirstMove?: () => void
	onPreviousMove?: () => void
	onNextMove?: () => void
	onLastMove?: () => void
	onNavigateToMove?: (moveIndex: number) => void
	onPlayAnotherOpening?: () => void
	learningMode?: boolean
	lastMoveAttempt?: { from: string; to: string; isIllegal: boolean; errorMessage?: string } | null
}

function GameStats({
	isConnected, gameOutcome, handleNewGame, handleFlipBoard, handleResign, handleDrawOffer, history, fen, turn, isFlipped, openingDemo,
	playbackState, onFirstMove, onPreviousMove, onNextMove, onLastMove, onNavigateToMove, onPlayAnotherOpening, learningMode, lastMoveAttempt
}: GameStatsProps) {

	return (
		<div className="w-full h-full bg-gray-900 rounded-lg shadow-2xl border border-gray-700 flex flex-col">
			{/* Connection Status & Turn */}
			<div className="bg-gray-800 rounded-t-lg p-3 sm:p-4 border-b border-gray-700">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
					<div className="flex items-center space-x-2">
						<div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
						<span className="text-sm text-gray-300">{isConnected ? 'Connected' : 'Disconnected'}</span>
					</div>
					<div className="flex items-center space-x-2">
						<span className="text-sm text-gray-400">Turn:</span>
						<span className={`font-semibold px-2 py-1 rounded text-sm w-16 text-center ${turn === 'w' ? 'bg-white text-black' : 'bg-gray-800 text-white border'
							}`}>
							{turn === 'w' ? "White" : "Black"}
						</span>
					</div>
				</div>


				{gameOutcome && (
					<div className="bg-gradient-to-r from-amber-900 to-yellow-900 border border-amber-500/30 rounded-lg p-2 sm:p-3 shadow-lg">
						<h2 className="text-amber-200 font-bold text-center text-sm sm:text-base">{gameOutcome}</h2>
					</div>
				)}
			</div>

			{/* Game Controls */}
			<div className="p-3 sm:p-4 border-b border-gray-700">
				<h3 className="text-gray-300 text-sm font-semibold mb-3">Game Controls</h3>

				{/* Playback Controls */}
				{history.length > 0 && (
					<div className="">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs text-gray-400">Move Navigation</span>
							{playbackState?.isActive && (
								<span className="text-xs text-blue-400">
									{playbackState.currentMoveIndex === -1
										? "Starting position"
										: `Move ${playbackState.currentMoveIndex + 1}/${history.length}`}
								</span>
							)}
						</div>
						<div className="flex justify-evenly">
							<button
								onClick={onFirstMove}
								disabled={!onFirstMove || (openingDemo && !openingDemo.isComplete)}
								className={`p-2 transition-all duration-200 min-h-[64px] min-w-[64px] flex items-center justify-center rounded-lg ${openingDemo && !openingDemo.isComplete
									? 'text-gray-600 cursor-not-allowed'
									: 'text-amber-400 hover:text-amber-300 hover:bg-gray-800/50 hover:shadow-lg'
									}`}
								title="First move"
							>
								<span style={{ fontSize: '36px' }}>⏮</span>
							</button>
							<button
								onClick={onPreviousMove}
								disabled={!onPreviousMove || history.length === 0 || (openingDemo && !openingDemo.isComplete)}
								className={`p-2 transition-all duration-200 min-h-[64px] min-w-[64px] flex items-center justify-center rounded-lg ${!onPreviousMove || history.length === 0 || (openingDemo && !openingDemo.isComplete)
									? 'text-gray-600 cursor-not-allowed'
									: 'text-amber-400 hover:text-amber-300 hover:bg-gray-800/50 hover:shadow-lg'
									}`}
								title="Previous move"
							>
								<span style={{ fontSize: '36px' }}>⏪</span>
							</button>
							<button
								onClick={onNextMove}
								disabled={!onNextMove || history.length === 0 || (openingDemo && !openingDemo.isComplete)}
								className={`p-2 transition-all duration-200 min-h-[64px] min-w-[64px] flex items-center justify-center rounded-lg ${!onNextMove || history.length === 0 || (openingDemo && !openingDemo.isComplete)
									? 'text-gray-600 cursor-not-allowed'
									: 'text-amber-400 hover:text-amber-300 hover:bg-gray-800/50 hover:shadow-lg'
									}`}
								title="Next move"
							>
								<span style={{ fontSize: '36px' }}>⏩</span>
							</button>
							<button
								onClick={onLastMove}
								disabled={!onLastMove || (openingDemo && !openingDemo.isComplete)}
								className={`p-2 transition-all duration-200 min-h-[64px] min-w-[64px] flex items-center justify-center rounded-lg ${openingDemo && !openingDemo.isComplete
									? 'text-gray-600 cursor-not-allowed'
									: playbackState?.isActive
										? 'text-emerald-400 hover:text-emerald-300 hover:bg-gray-800/50 hover:shadow-lg'
										: 'text-amber-400 hover:text-amber-300 hover:bg-gray-800/50 hover:shadow-lg'
									}`}
								title={playbackState?.isActive ? "Return to live game" : "Latest move"}
							>
								<span style={{ fontSize: '36px' }}>⏭</span>
							</button>
						</div>
					</div>
				)}

				<div className="space-y-2">
					{/* Learning Mode: New Opening + Random on same line */}
					{learningMode && (
						<div className="flex gap-2">
							<button
								onClick={handleNewGame}
								disabled={openingDemo && !openingDemo.isComplete}
								className={`font-medium py-2 px-3 rounded-lg transition-all duration-200 text-sm flex-1 ${openingDemo && !openingDemo.isComplete
									? 'bg-gray-700 text-gray-500 cursor-not-allowed'
									: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl'
									}`}
							>
								♟️ New Opening
							</button>
							{onPlayAnotherOpening && (
								<button
									onClick={onPlayAnotherOpening}
									disabled={openingDemo && !openingDemo.isComplete}
									className={`font-medium py-2 px-3 rounded-lg transition-all duration-200 text-sm flex-1 ${openingDemo && !openingDemo.isComplete
										? 'bg-gray-700 text-gray-500 cursor-not-allowed'
										: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-xl'
										}`}
								>
									🎲 Random
								</button>
							)}
						</div>
					)}

					{/* Regular Game Mode */}
					{!learningMode && (
						<button
							onClick={handleNewGame}
							disabled={openingDemo && !openingDemo.isComplete}
							className={`font-medium py-2 px-3 rounded-lg transition-all duration-200 text-sm w-full ${openingDemo && !openingDemo.isComplete
								? 'bg-gray-700 text-gray-500 cursor-not-allowed'
								: 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg hover:shadow-xl'
								}`}
						>
							♟️ New Game
						</button>
					)}
					{/* Game Action Controls */}
					<div className="flex gap-2">
						<button
							onClick={handleFlipBoard}
							disabled={openingDemo && !openingDemo.isComplete}
							className={`font-medium py-2 px-3 rounded-lg transition-all duration-200 text-sm flex-1 ${openingDemo && !openingDemo.isComplete
								? 'bg-gray-700 text-gray-500 cursor-not-allowed'
								: 'bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-500 hover:to-gray-500 text-white shadow-lg hover:shadow-xl'
								}`}
						>
							{isFlipped ? '⬆️' : '⬇️'} Flip
						</button>
						{!gameOutcome && (
							<>
								<button
									onClick={handleDrawOffer}
									disabled={openingDemo && !openingDemo.isComplete}
									className={`font-medium py-2 px-3 rounded-lg transition-all duration-200 text-sm flex-1 ${openingDemo && !openingDemo.isComplete
										? 'bg-gray-700 text-gray-500 cursor-not-allowed'
										: 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-lg hover:shadow-xl'
										}`}
								>
									🤝 Draw
								</button>
								<button
									onClick={handleResign}
									disabled={openingDemo && !openingDemo.isComplete}
									className={`font-medium py-2 px-3 rounded-lg transition-all duration-200 text-sm flex-1 ${openingDemo && !openingDemo.isComplete
										? 'bg-gray-700 text-gray-500 cursor-not-allowed'
										: 'bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white shadow-lg hover:shadow-xl'
										}`}
								>
									🏳️ Resign
								</button>
							</>
						)}
					</div>
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
									const isCurrentMove = playbackState?.isActive && playbackState.currentMoveIndex === i
									const moveNumber = Math.floor(i / 2) + 1
									const isWhiteMove = i % 2 === 0

									if (isWhiteMove) {
										const blackMove = history[i + 1]
										return (
											<div key={`pair-${moveNumber}`} className="flex items-center gap-2 text-xs sm:text-sm">
												<span className="text-gray-400 font-mono w-6 text-right flex-shrink-0">
													{moveNumber}.
												</span>
												<span
													className={`px-2 py-1 rounded cursor-pointer font-mono flex-1 min-w-0 transition-colors duration-75 ${isCurrentMove
														? 'bg-blue-600 text-white'
														: 'text-gray-200 hover:bg-gray-700'
														}`}
													onClick={() => onNavigateToMove?.(i)}
												>
													{move}
												</span>
												{blackMove && (
													<span
														className={`px-2 py-1 rounded cursor-pointer font-mono flex-1 min-w-0 transition-colors duration-75 ${playbackState?.isActive && playbackState.currentMoveIndex === i + 1
															? 'bg-blue-600 text-white'
															: 'text-gray-200 hover:bg-gray-700'
															}`}
														onClick={() => onNavigateToMove?.(i + 1)}
													>
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

			{/* FEN Display */}
			<div className="p-3 sm:p-4 bg-gray-800 rounded-b-lg">
				<h3 className="text-gray-300 text-sm font-semibold mb-2">Position (FEN)</h3>
				<div className="bg-gray-900 rounded p-2 border border-gray-600">
					<code className="text-xs text-gray-400 break-all leading-relaxed">{fen}</code>
				</div>
			</div>
		</div>
	)
}

// Memoize the component to prevent unnecessary rerenders
export default memo(GameStats, (prevProps, nextProps) => {
	// Only rerender if essential display data changes
	const prevHistory = prevProps.history
	const nextHistory = nextProps.history

	// Check if history array content actually changed (not just reference)
	const historyChanged = prevHistory.length !== nextHistory.length ||
		prevHistory.some((move, index) => move !== nextHistory[index])

	const openingDemoChanged =
		prevProps.openingDemo?.isPlaying !== nextProps.openingDemo?.isPlaying ||
		prevProps.openingDemo?.currentMoveIndex !== nextProps.openingDemo?.currentMoveIndex ||
		prevProps.openingDemo?.isComplete !== nextProps.openingDemo?.isComplete

	const playbackStateChanged =
		prevProps.playbackState?.isActive !== nextProps.playbackState?.isActive ||
		prevProps.playbackState?.currentMoveIndex !== nextProps.playbackState?.currentMoveIndex

	// Return true if no changes (skip rerender), false if changes detected
	return !historyChanged &&
		prevProps.isConnected === nextProps.isConnected &&
		prevProps.gameOutcome === nextProps.gameOutcome &&
		prevProps.turn === nextProps.turn &&
		prevProps.isFlipped === nextProps.isFlipped &&
		!openingDemoChanged &&
		!playbackStateChanged
})
