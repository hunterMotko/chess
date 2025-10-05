import { pieceImgs } from "~/utils/utils"

type PromotionPiece = 'q' | 'r' | 'b' | 'n'

type PromotionModalProps = {
	isVisible: boolean
	color: 'white' | 'black'
	onSelectPiece: (piece: PromotionPiece) => void
	onCancel: () => void
}

const PROMOTION_PIECES: PromotionPiece[] = ['q', 'r', 'b', 'n']

const PIECE_NAMES: Record<PromotionPiece, string> = {
	q: 'Queen',
	r: 'Rook',
	b: 'Bishop',
	n: 'Knight'
}

export default function PromotionModal({
	isVisible,
	color,
	onSelectPiece,
	onCancel
}: PromotionModalProps) {
	if (!isVisible) return null

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onCancel()
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Escape') {
			onCancel()
		}
	}

	return (
		<div
			className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4"
			onClick={handleBackdropClick}
			onKeyDown={handleKeyDown}
			tabIndex={-1}
		>
			<div
				className="bg-gray-800 rounded-xl border-2 border-gray-600 p-4 max-w-xs w-full mx-auto shadow-2xl transform scale-95 sm:scale-100"
				role="dialog"
				aria-modal="true"
				aria-labelledby="promotion-title"
			>
				<div className="text-center mb-4">
					<h2
						id="promotion-title"
						className="text-lg font-bold text-white mb-1"
					>
						Choose Promotion Piece
					</h2>
					<p className="text-gray-300 text-xs">
						Select the piece to promote your pawn to
					</p>
				</div>

				<div className="grid grid-cols-2 gap-3 mb-4">
					{PROMOTION_PIECES.map((piece) => {
						const pieceKey = color === 'white' ? piece.toUpperCase() : piece.toLowerCase()
						const imageSrc = pieceImgs[pieceKey]

						return (
							<button
								key={piece}
								onClick={() => onSelectPiece(piece)}
								className="group relative bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg p-3 border-2 border-gray-600 hover:border-yellow-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-800"
								aria-label={`Promote to ${PIECE_NAMES[piece]}`}
							>
								<div className="flex flex-col items-center space-y-1">
									<img
										src={`/${imageSrc}`}
										alt={PIECE_NAMES[piece]}
										className="w-10 h-10 group-hover:scale-110 transition-transform duration-200"
									/>
									<span className="text-white text-xs font-medium">
										{PIECE_NAMES[piece]}
									</span>
								</div>
								<div className="absolute inset-0 rounded-lg ring-2 ring-transparent group-hover:ring-yellow-400 transition-all duration-200" />
							</button>
						)
					})}
				</div>

				<div className="flex justify-center">
					<button
						onClick={onCancel}
						className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	)
}