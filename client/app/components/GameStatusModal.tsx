import { useEffect, useState } from "react"

type OpeningDemoState = {
	isPlaying: boolean
	moves: string[]
	currentMoveIndex: number
	isComplete: boolean
}

type GameStatusModalProps = {
	openingDemo?: OpeningDemoState
	lastMoveAttempt?: { from: string; to: string; isIllegal: boolean; errorMessage?: string } | null
	userMoveCounter: number
}

export default function GameStatusModal({ openingDemo, lastMoveAttempt, userMoveCounter }: GameStatusModalProps) {
	const [showGameAvailable, setShowGameAvailable] = useState(false)
	const [dismissTimer, setDismissTimer] = useState<NodeJS.Timeout | null>(null)

	// Show "game available" message when demo completes
	useEffect(() => {
		if (openingDemo?.isComplete && !openingDemo.isPlaying && openingDemo.moves.length > 0) {
			setShowGameAvailable(true)

			// Auto-dismiss after 3 seconds
			const timer = setTimeout(() => {
				setShowGameAvailable(false)
			}, 3000)

			setDismissTimer(timer)
		}
	}, [openingDemo?.isComplete, openingDemo?.isPlaying, openingDemo?.moves.length])

	// Dismiss on user move
	useEffect(() => {
		if (userMoveCounter > 0 && showGameAvailable) {
			setShowGameAvailable(false)
			if (dismissTimer) {
				clearTimeout(dismissTimer)
				setDismissTimer(null)
			}
		}
	}, [userMoveCounter, showGameAvailable, dismissTimer])

	// Clear timer on unmount
	useEffect(() => {
		return () => {
			if (dismissTimer) {
				clearTimeout(dismissTimer)
			}
		}
	}, [dismissTimer])

	// Demo playing status
	const showDemoStatus = openingDemo && !openingDemo.isComplete && openingDemo.isPlaying && openingDemo.moves.length > 0

	// Don't render if nothing to show
	if (!showDemoStatus && !showGameAvailable) {
		return null
	}

	return (
		<div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/20 backdrop-blur-sm">
			{/* Demo Status */}
			{showDemoStatus && (
				<div className="bg-gradient-to-r from-blue-900 to-indigo-900 border border-blue-500/30 rounded-lg p-4 shadow-lg pointer-events-auto">
					<div className="flex items-center space-x-3">
						<div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
						<div className="text-center">
							<h3 className="text-blue-200 font-semibold text-sm">Demo Playing</h3>
							<p className="text-blue-300 text-xs">
								Move {Math.max(0, openingDemo.currentMoveIndex + 1)}/{openingDemo.moves.length}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Game Available Status */}
			{showGameAvailable && (
				<div className="bg-gradient-to-r from-emerald-900 to-green-900 border border-emerald-500/30 rounded-lg p-4 shadow-lg pointer-events-auto animate-bounce">
					<div className="flex items-center space-x-3">
						<span className="text-green-400 text-lg">🎯</span>
						<div className="text-center">
							<h3 className="text-green-200 font-semibold text-sm">Demo Complete!</h3>
							<p className="text-green-300 text-xs">Your turn to play!</p>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}