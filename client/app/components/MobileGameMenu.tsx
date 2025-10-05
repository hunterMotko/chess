import { useState, useEffect } from "react"

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

type MobileGameMenuProps = {
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

export default function MobileGameMenu({
	isConnected, gameOutcome, handleNewGame, handleFlipBoard, handleResign, handleDrawOffer,
	history, fen, turn, isFlipped, openingDemo, playbackState, onFirstMove, onPreviousMove,
	onNextMove, onLastMove, onNavigateToMove, onPlayAnotherOpening, learningMode, lastMoveAttempt
}: MobileGameMenuProps) {
	const [isOpen, setIsOpen] = useState(false)

	// Close menu when game outcome changes (game ends)
	useEffect(() => {
		if (gameOutcome) {
			setIsOpen(true) // Auto-open menu when game ends
		}
	}, [gameOutcome])

	// Prevent body scroll when menu is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}

		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [isOpen])

	return (
		<>
			{/* Hamburger Menu Button - Optimized for thumb reach */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="fixed top-4 right-3 z-50 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 p-3 rounded-full shadow-lg border border-gray-600 transition-colors duration-200 lg:hidden min-w-[48px] min-h-[48px] flex items-center justify-center"
				style={{ top: 'max(1rem, env(safe-area-inset-top) + 0.5rem)' }}
				aria-label={isOpen ? "Close menu" : "Open move history"}
			>
				{isOpen ? (
					<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				) : (
					<div className="flex items-center space-x-1">
						<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
						</svg>
						{history.length > 0 && (
							<span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
								{history.length > 99 ? '99+' : history.length}
							</span>
						)}
					</div>
				)}
			</button>

			{/* Mobile Menu Overlay */}
			{isOpen && (
				<div className="fixed inset-0 z-40 lg:hidden">
					{/* Backdrop */}
					<div 
						className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
						onClick={() => setIsOpen(false)}
					></div>
					
					{/* Menu Panel */}
					<div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-gray-900 shadow-xl transform transition-transform duration-300 ease-out overflow-hidden flex flex-col">
						{/* Header */}
						<div className="bg-gray-800 p-4 border-b border-gray-700 flex-shrink-0">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-semibold text-white">Move History & Analysis</h2>
								<button
									onClick={() => setIsOpen(false)}
									className="text-gray-400 hover:text-white p-1"
									aria-label="Close menu"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
							
							{/* Game Status Summary */}
							<div className="mt-3 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-gray-400">Moves played:</span>
									<span className="text-white font-medium">{history.length}</span>
								</div>
								{playbackState?.isActive && (
									<div className="flex items-center justify-between mt-1">
										<span className="text-gray-400">Viewing:</span>
										<span className="text-blue-400 font-medium">
											{playbackState.currentMoveIndex === -1 
												? "Starting position" 
												: `Move ${playbackState.currentMoveIndex + 1}`}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Game Status */}
						{(openingDemo && !openingDemo.isComplete) && (
							<div className="bg-gradient-to-r from-blue-900 to-indigo-900 border-b border-blue-500/30 p-3 flex-shrink-0 shadow-lg">
								<h3 className="text-blue-200 font-semibold text-sm">Opening Demo</h3>
								<p className="text-blue-300 text-xs">
									{openingDemo.currentMoveIndex === -1
										? 'Demo starting...'
										: `Move ${openingDemo.currentMoveIndex + 1}/${openingDemo.moves.length}`}
								</p>
							</div>
						)}

						{/* Status Area - Fixed height with visibility to prevent layout shift */}
						<div className="border-b border-gray-600 flex-shrink-0 min-h-[50px]">
							{/* Opening Complete Status */}
							<div
								className={`bg-gradient-to-r from-emerald-900 to-green-900 border-b border-emerald-500/30 p-3 transition-opacity duration-200 shadow-lg ${
									openingDemo && openingDemo.isComplete && openingDemo.moves.length > 0 && history.length <= openingDemo.moves.length
										? 'opacity-100 visible'
										: 'opacity-0 invisible'
								}`}
								style={{ visibility: openingDemo && openingDemo.isComplete && openingDemo.moves.length > 0 && history.length <= openingDemo.moves.length ? 'visible' : 'hidden' }}
							>
								<h3 className="text-green-200 font-semibold text-sm">Opening Complete!</h3>
								<p className="text-green-300 text-xs">You can now make moves freely</p>
							</div>

							{/* Illegal Move Status - Only show when opening is complete or not in learning mode */}
							<div
								className={`bg-gradient-to-r from-red-900 to-rose-900 border-b border-red-500/30 p-3 transition-opacity duration-200 shadow-lg ${
									lastMoveAttempt?.isIllegal && (!learningMode || (openingDemo?.isComplete || openingDemo?.moves.length === 0))
										? 'opacity-100 visible animate-pulse'
										: 'opacity-0 invisible'
								}`}
								style={{
									visibility: lastMoveAttempt?.isIllegal && (!learningMode || (openingDemo?.isComplete || openingDemo?.moves.length === 0))
										? 'visible'
										: 'hidden'
								}}
							>
								<div className="flex items-center space-x-2">
									<span className="text-red-400 text-lg">⚠️</span>
									<div>
										<p className="text-red-100 text-sm font-medium">Invalid Move</p>
										{lastMoveAttempt?.errorMessage && (
											<p className="text-red-300 text-xs mt-1">
												{lastMoveAttempt.errorMessage}
											</p>
										)}
									</div>
								</div>
							</div>
						</div>

						{gameOutcome && (
							<div className="bg-gradient-to-r from-amber-900 to-yellow-900 border-b border-amber-500/30 p-3 flex-shrink-0 shadow-lg">
								<h2 className="text-amber-200 font-bold text-sm">{gameOutcome}</h2>
							</div>
						)}

						{/* Quick Actions */}
						<div className="border-b border-gray-700 p-3 flex-shrink-0">
							<div className="space-y-2">
								{playbackState?.isActive && (
									<button
										onClick={() => { onLastMove?.(); setIsOpen(false); }}
										className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-medium py-2 px-3 rounded-lg text-sm shadow-lg"
									>
										🎯 Return to Live Game
									</button>
								)}

								{/* Learning Mode Controls */}
								{learningMode ? (
									<div className="flex gap-2">
										<button
											onClick={() => { handleNewGame(); setIsOpen(false); }}
											className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2 px-3 rounded-lg text-sm shadow-lg"
										>
											♟️ New Opening
										</button>
										{onPlayAnotherOpening && (
											<button
												onClick={() => { onPlayAnotherOpening(); setIsOpen(false); }}
												className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium py-2 px-3 rounded-lg text-sm shadow-lg"
											>
												🎲 Random
											</button>
										)}
									</div>
								) : (
									<button
										onClick={() => { handleNewGame(); setIsOpen(false); }}
										className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-medium py-2 px-3 rounded-lg text-sm shadow-lg"
									>
										♟️ New Game
									</button>
								)}
							</div>
						</div>

						{/* Move History */}
						<div className="flex-1 flex flex-col p-3 min-h-0">
							<h3 className="text-gray-300 text-sm font-semibold mb-3">Move History</h3>
							<div className="bg-gray-800 rounded-md flex-1 min-h-0 overflow-hidden">
								{history.length === 0 ? (
									<div className="h-full flex items-center justify-center">
										<p className="text-gray-500 text-sm">No moves yet</p>
									</div>
								) : (
									<div className="h-full overflow-y-auto p-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}>
										<div className="space-y-1">
											{history.map((move, i) => {
												const isCurrentMove = playbackState?.isActive && playbackState.currentMoveIndex === i
												const moveNumber = Math.floor(i / 2) + 1
												const isWhiteMove = i % 2 === 0
												
												if (isWhiteMove) {
													const blackMove = history[i + 1]
													return (
														<div key={`pair-${moveNumber}`} className="flex items-center gap-2 text-xs">
															<span className="text-gray-400 font-mono w-4 text-right flex-shrink-0">{moveNumber}.</span>
															<span
																className={`px-2 py-1 rounded cursor-pointer font-mono flex-1 min-w-0 transition-colors duration-75 ${
																	isCurrentMove ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-700'
																}`}
																onClick={() => onNavigateToMove?.(i)}
															>
																{move}
															</span>
															{blackMove && (
																<span
																	className={`px-2 py-1 rounded cursor-pointer font-mono flex-1 min-w-0 transition-colors duration-75 ${
																		playbackState?.isActive && playbackState.currentMoveIndex === i + 1
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

						{/* FEN Display (Collapsed by default on mobile) */}
						<div className="border-t border-gray-700 p-3 flex-shrink-0">
							<details>
								<summary className="text-gray-300 text-sm font-semibold cursor-pointer hover:text-white">
									Position (FEN)
								</summary>
								<div className="bg-gray-800 rounded p-2 border border-gray-600 mt-2">
									<code className="text-xs text-gray-400 break-all leading-relaxed">{fen}</code>
								</div>
							</details>
						</div>
					</div>
				</div>
			)}
		</>
	)
}