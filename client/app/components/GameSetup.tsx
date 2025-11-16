import { useState } from "react"

type GameSetupProps = {
	onStartGame: (difficulty: number, playerColor: 'white' | 'black') => void
}

export default function GameSetup({ onStartGame }: GameSetupProps) {
	const [selectedDifficulty, setSelectedDifficulty] = useState(10)
	const [selectedColor, setSelectedColor] = useState<'white' | 'black'>('white')
	const difficultyLevels = [
		{ value: 1, label: "Beginner", description: "Very easy", icon: "🌱" },
		{ value: 5, label: "Easy", description: "Learning", icon: "🎯" },
		{ value: 10, label: "Medium", description: "Casual play", icon: "⚖️" },
		{ value: 15, label: "Hard", description: "Challenging", icon: "🔥" },
		{ value: 20, label: "Expert", description: "Maximum strength", icon: "🏆" }
	]
	const handleStart = () => {
		onStartGame(selectedDifficulty, selectedColor)
	}
	const colorOptions = [
		{ value: 'white' as const, label: "White", description: "You move first", icon: "♔" },
		{ value: 'black' as const, label: "Black", description: "AI moves first", icon: "♚" }
	]
	return (
		<div className="min-h-screen text-white p-6 sm:p-10">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-4xl sm:text-5xl font-extrabold mb-8 text-center text-indigo-400">
					Play vs Stockfish
				</h1>
				<p className="text-lg text-gray-300 mb-8 text-center">
					Configure your game settings and challenge the chess engine.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
					{/* Difficulty Selection */}
					<div className="bg-gray-800 rounded-lg shadow-xl p-6 border-2 border-transparent">
						<h3 className="text-2xl font-bold mb-3 text-indigo-300">Choose Difficulty</h3>
						<p className="text-gray-400 mb-4 text-sm">Select the engine strength that matches your skill level</p>
						<div className="space-y-3">
							{difficultyLevels.map((level) => (
								<button
									key={level.value}
									onClick={() => setSelectedDifficulty(level.value)}
									className={`w-full p-4 rounded-lg border-2 transition-all duration-300 ${selectedDifficulty === level.value
										? 'border-indigo-500 bg-indigo-900 bg-opacity-30'
										: 'border-transparent bg-gray-700 hover:border-indigo-500'
										} group`}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-3">
											<span className="text-2xl">{level.icon}</span>
											<div className="text-left">
												<div className="font-semibold text-gray-300 group-hover:text-indigo-200">{level.label}</div>
												<div className="text-sm text-gray-400">{level.description}</div>
											</div>
										</div>
										{selectedDifficulty === level.value && (
											<div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
												<div className="w-2 h-2 bg-white rounded-full"></div>
											</div>
										)}
									</div>
								</button>
							))}
						</div>
					</div>

					{/* Color Selection */}
					<div className="bg-gray-800 rounded-lg shadow-xl p-6 border-2 border-transparent">
						<h3 className="text-2xl font-bold mb-3 text-indigo-300">Choose Your Color</h3>
						<p className="text-gray-400 mb-4 text-sm">Select which pieces you want to play with</p>
						<div className="space-y-3">
							{colorOptions.map((color) => (
								<button
									key={color.value}
									onClick={() => setSelectedColor(color.value)}
									className={`w-full p-4 rounded-lg border-2 transition-all duration-300 ${selectedColor === color.value
										? 'border-indigo-500 bg-indigo-900 bg-opacity-30'
										: 'border-transparent bg-gray-700 hover:border-indigo-500'
										} group`}
								>
									<div className="flex items-center space-x-4">
										<div className="text-4xl">{color.icon}</div>
										<div className="text-left">
											<div className="font-semibold text-gray-300 group-hover:text-indigo-200">{color.label}</div>
											<div className="text-sm text-gray-400">{color.description}</div>
										</div>
										{selectedColor === color.value && (
											<div className="ml-auto w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
												<div className="w-2 h-2 bg-white rounded-full"></div>
											</div>
										)}
									</div>
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="text-center">
					<div className="flex gap-4 justify-center">
						<button
							onClick={() => window.history.back()}
							className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded transition duration-300"
						>
							← Back
						</button>
						<button
							onClick={handleStart}
							className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded transition duration-300"
						>
							Start Game
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
