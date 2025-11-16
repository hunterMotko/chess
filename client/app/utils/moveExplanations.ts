export type MoveExplanation = {
	move: string
	moveNumber: number
	explanation: string
	category: 'development' | 'control' | 'attack' | 'defense' | 'preparation' | 'structure'
	keyPoints: string[]
	nextMoveHint?: string
	difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export type OpeningExplanations = {
	eco: string
	name: string
	description: string
	themes: string[]
	moves: MoveExplanation[]
}

// Common opening explanations database
// TODO: migration or MCP?
export const openingExplanationsDB: Record<string, OpeningExplanations> = {
	// Sicilian Defense examples
	'B20': {
		eco: 'B20',
		name: 'Sicilian Defense',
		description: 'The most popular and complex defense to 1.e4',
		themes: ['Asymmetric pawn structure', 'Sharp tactical play', 'Counterattack'],
		moves: [
			{
				move: 'e4',
				moveNumber: 1,
				explanation: 'White opens with the king\'s pawn, claiming central space',
				category: 'control',
				keyPoints: [
					'Controls the central d5 and f5 squares',
					'Opens lines for the bishop and queen',
					'Follows classical opening principles'
				],
				nextMoveHint: 'Black will likely respond with c5, e6, e5, or c6',
				difficulty: 'beginner'
			},
			{
				move: 'c5',
				moveNumber: 1,
				explanation: 'The Sicilian Defense - Black fights for central control asymmetrically',
				category: 'defense',
				keyPoints: [
					'Attacks the d4 square to prevent White\'s ideal pawn center',
					'Creates an unbalanced position with winning chances for both sides',
					'Leads to sharp, tactical middlegames'
				],
				nextMoveHint: 'White typically continues with Nf3, preparing d4',
				difficulty: 'intermediate'
			},
			{
				move: 'Nf3',
				moveNumber: 2,
				explanation: 'Knight develops to its best square, preparing d4',
				category: 'development',
				keyPoints: [
					'Develops a piece toward the center',
					'Prepares the d2-d4 pawn break',
					'Maintains flexibility in pawn structure'
				],
				nextMoveHint: 'Black often plays d6, Nc6, or g6',
				difficulty: 'beginner'
			},
			{
				move: 'd6',
				moveNumber: 2,
				explanation: 'Black solidifies the position and prepares piece development',
				category: 'preparation',
				keyPoints: [
					'Supports the c5 pawn',
					'Prepares to develop the bishop on f8',
					'Creates a solid pawn foundation'
				],
				nextMoveHint: 'White will likely play d4, opening the center',
				difficulty: 'beginner'
			}
		]
	},

	// French Defense
	'C00': {
		eco: 'C00',
		name: 'French Defense',
		description: 'A solid defense leading to strategic battles',
		themes: ['Pawn chains', 'Strategic play', 'Light-square weaknesses'],
		moves: [
			{
				move: 'e4',
				moveNumber: 1,
				explanation: 'White\'s most popular first move, controlling the center',
				category: 'control',
				keyPoints: [
					'Claims central space immediately',
					'Develops pieces quickly',
					'Creates attacking chances'
				],
				difficulty: 'beginner'
			},
			{
				move: 'e6',
				moveNumber: 1,
				explanation: 'The French Defense - preparing d5 while keeping flexibility',
				category: 'preparation',
				keyPoints: [
					'Prepares the central d7-d5 advance',
					'Supports the center without committing pieces',
					'Maintains a solid pawn structure'
				],
				nextMoveHint: 'White often continues with d4 or Nf3',
				difficulty: 'beginner'
			},
			{
				move: 'd4',
				moveNumber: 2,
				explanation: 'White establishes a strong pawn center',
				category: 'control',
				keyPoints: [
					'Creates the ideal two-pawn center',
					'Gains space in the center',
					'Prepares piece development'
				],
				difficulty: 'beginner'
			},
			{
				move: 'd5',
				moveNumber: 2,
				explanation: 'Black immediately challenges White\'s center',
				category: 'control',
				keyPoints: [
					'Fights for central equality',
					'Creates pawn tension',
					'Leads to characteristic French pawn structures'
				],
				difficulty: 'intermediate'
			}
		]
	},

	// Ruy Lopez
	'C60': {
		eco: 'C60',
		name: 'Ruy Lopez (Spanish Opening)',
		description: 'One of the oldest and most classical openings',
		themes: ['Classical development', 'Central control', 'Long-term pressure'],
		moves: [
			{
				move: 'e4',
				moveNumber: 1,
				explanation: 'The king\'s pawn opening, following classical principles',
				category: 'control',
				keyPoints: [
					'Controls central squares',
					'Opens diagonals for pieces',
					'Rapid development'
				],
				difficulty: 'beginner'
			},
			{
				move: 'e5',
				moveNumber: 1,
				explanation: 'Black mirrors White\'s central control',
				category: 'control',
				keyPoints: [
					'Claims equal space in the center',
					'Opens lines for quick development',
					'Symmetrical and sound'
				],
				difficulty: 'beginner'
			},
			{
				move: 'Nf3',
				moveNumber: 2,
				explanation: 'Knight develops with tempo, attacking the e5 pawn',
				category: 'development',
				keyPoints: [
					'Develops with a threat',
					'Increases pressure on Black\'s center',
					'Prepares castling'
				],
				difficulty: 'beginner'
			},
			{
				move: 'Nc6',
				moveNumber: 2,
				explanation: 'Black defends the e5 pawn while developing',
				category: 'defense',
				keyPoints: [
					'Defends the central pawn',
					'Develops toward the center',
					'Maintains the balance'
				],
				difficulty: 'beginner'
			},
			{
				move: 'Bb5',
				moveNumber: 3,
				explanation: 'The Ruy Lopez - bishop attacks the defender of e5',
				category: 'attack',
				keyPoints: [
					'Creates indirect pressure on e5',
					'Develops with purpose',
					'Begins long-term strategic pressure'
				],
				nextMoveHint: 'Black often plays a6, Be7, or f5',
				difficulty: 'intermediate'
			}
		]
	}
}

// Function to get explanations for a specific opening
export function getOpeningExplanations(eco: string): OpeningExplanations | null {
	return openingExplanationsDB[eco] || null
}

// Function to get explanation for a specific move in an opening
export function getMoveExplanation(eco: string, moveIndex: number): MoveExplanation | null {
	const opening = getOpeningExplanations(eco)
	if (!opening || moveIndex >= opening.moves.length) {
		return null
	}
	return opening.moves[moveIndex]
}

// Function to create a fallback explanation for unknown openings
export function createFallbackExplanation(move: string, moveNumber: number): MoveExplanation {
	const isWhiteMove = moveNumber % 2 === 1
	const color = isWhiteMove ? 'White' : 'Black'

	return {
		move,
		moveNumber,
		explanation: `${color} plays ${move}`,
		category: 'development',
		keyPoints: [
			'Continues piece development',
			'Maintains opening principles'
		],
		difficulty: 'beginner'
	}
}

// Function to get move category color for UI
export function getCategoryColor(category: MoveExplanation['category']): string {
	switch (category) {
		case 'development': return 'text-blue-400'
		case 'control': return 'text-green-400'
		case 'attack': return 'text-red-400'
		case 'defense': return 'text-purple-400'
		case 'preparation': return 'text-yellow-400'
		case 'structure': return 'text-orange-400'
		default: return 'text-gray-400'
	}
}

// Function to get difficulty badge color
export function getDifficultyColor(difficulty: MoveExplanation['difficulty']): string {
	switch (difficulty) {
		case 'beginner': return 'bg-green-600 text-green-100'
		case 'intermediate': return 'bg-yellow-600 text-yellow-100'
		case 'advanced': return 'bg-red-600 text-red-100'
		default: return 'bg-gray-600 text-gray-100'
	}
}
