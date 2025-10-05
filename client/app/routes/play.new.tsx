import type { Route } from "./+types/play.new";
import ChessGame from "~/game/ChessGame";

export async function loader({ params, request }: Route.LoaderArgs) {
	const gameId = crypto.randomUUID()
	let url = new URL(request.url)
	let pgn = url.searchParams.get('pgn')
	let eco = url.searchParams.get('eco')

	return {
		gameId,
		pgn: pgn,
		eco: eco
	}
}

export default function PlayNew({ loaderData }: Route.ComponentProps) {
	const { gameId, pgn, eco } = loaderData
	// Enable learning mode when PGN is provided (indicating opening demo)
	const learningMode = !!pgn

	return (
		<div className="">
			<ChessGame gameId={gameId} pgn={pgn} eco={eco} learningMode={learningMode} />
		</div>
	)
}