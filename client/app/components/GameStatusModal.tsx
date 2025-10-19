import { useEffect, useState } from "react"
import { getMoveExplanation, createFallbackExplanation, getCategoryColor, getDifficultyColor, type MoveExplanation } from "~/utils/moveExplanations"

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
	eco?: string | null
}

export default function GameStatusModal({ openingDemo, lastMoveAttempt, userMoveCounter, eco }: GameStatusModalProps) {
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

	// Get current move explanation
	const currentMoveExplanation = showDemoStatus && eco && openingDemo
		? getMoveExplanation(eco, openingDemo.currentMoveIndex) ||
		  createFallbackExplanation(
			  openingDemo.moves[openingDemo.currentMoveIndex] || '',
			  openingDemo.currentMoveIndex + 1
		  )
		: null

	// Don't render if nothing to show
	if (!showDemoStatus && !showGameAvailable) {
		return null
	}

	return (
		<div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/20 backdrop-blur-sm">
			{/* Enhanced Demo Status with Move Explanations */}
			{showDemoStatus && currentMoveExplanation ? (
				<div className="bg-gradient-to-r from-blue-900 to-indigo-900 border border-blue-500/30 rounded-lg p-4 shadow-lg pointer-events-auto max-w-md mx-4">
					<div className="space-y-3">
						{/* Header with move info */}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2">
								<div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
								<h3 className="text-blue-200 font-semibold text-sm">Demo Playing</h3>
							</div>
							<div className="flex items-center space-x-2">
								<span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(currentMoveExplanation.difficulty)}`}>
									{currentMoveExplanation.difficulty}
								</span>
								<span className="text-blue-300 text-xs">
									{Math.max(0, openingDemo!.currentMoveIndex + 1)}/{openingDemo!.moves.length}
								</span>
							</div>
						</div>

						{/* Move and explanation */}
						<div className="space-y-2">
							<div className="flex items-center space-x-2">
								<span className="text-white font-mono text-lg bg-blue-800 px-2 py-1 rounded">
									{currentMoveExplanation.move}
								</span>
								<span className={`text-xs ${getCategoryColor(currentMoveExplanation.category)}`}>
									{currentMoveExplanation.category}
								</span>
							</div>
							<p className="text-blue-100 text-sm leading-relaxed">
								{currentMoveExplanation.explanation}
							</p>
						</div>

						{/* Key points */}
						{currentMoveExplanation.keyPoints.length > 0 && (
							<div className="space-y-1">
								<h4 className="text-blue-200 text-xs font-medium">Key Points:</h4>
								<ul className="space-y-1">
									{currentMoveExplanation.keyPoints.map((point, index) => (
										<li key={index} className="text-blue-300 text-xs flex items-start space-x-1">
											<span className="text-blue-400 mt-0.5">•</span>
											<span>{point}</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{/* Next move hint */}
						{currentMoveExplanation.nextMoveHint && (
							<div className="bg-blue-800/50 rounded p-2">
								<p className="text-blue-200 text-xs">
									<span className="font-medium">Next: </span>
									{currentMoveExplanation.nextMoveHint}
								</p>
							</div>
						)}
					</div>
				</div>
			) : showDemoStatus ? (
				/* Fallback simple demo status */
				<div className="bg-gradient-to-r from-blue-900 to-indigo-900 border border-blue-500/30 rounded-lg p-4 shadow-lg pointer-events-auto">
					<div className="flex items-center space-x-3">
						<div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
						<div className="text-center">
							<h3 className="text-blue-200 font-semibold text-sm">Demo Playing</h3>
							<p className="text-blue-300 text-xs">
								Move {Math.max(0, openingDemo!.currentMoveIndex + 1)}/{openingDemo!.moves.length}
							</p>
						</div>
					</div>
				</div>
			) : null}

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