import Game from "~/game/Game";
import type { Route } from "./+types/play";
import ChessGame from "~/game/Game";

// newGameId
// is new create new game items
// is from openings load in png?
// game stats?
export async function loader({ params, request }: Route.LoaderArgs) {
	const gameId = crypto.randomUUID()
	let url = new URL(request.url)
	let pgn = url.searchParams.get('pgn')

	return {
		gameId,
		pgn: pgn
	}
}

export default function Play({ loaderData }: Route.ComponentProps) {
	const { gameId, pgn } = loaderData
	return (
		<div className="">
			{/* <Game gameId={gameId} pgn={pgn} /> */}
			<ChessGame gameId={gameId} pgn={pgn} />
		</div>
	)
}
