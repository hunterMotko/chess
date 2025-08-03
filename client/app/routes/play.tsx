import Game from "~/game/Game";
import type { Route } from "./+types/play";

// newGameId
// is new create new game items
// is from openings load in png?
// game stats?
export async function loader({ params, request }: Route.LoaderArgs) {
	const gameId = crypto.randomUUID()
	return {
		gameId
	}
}

export default function Play({ loaderData }: Route.ComponentProps) {
	const { gameId } = loaderData
	return (
		<div className="">
			<Game gameId={gameId} />
		</div>
	)
}
