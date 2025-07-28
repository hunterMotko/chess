import type { Route } from "./+types/opening-choice"

type Opening = {
	id: string
	eco: string
	name: string
	pgn: string
}

async function getOpening(id: string): Promise<Opening[] | null> {
	try {
		const res = await fetch(`http://localhost:8888/api/openings/${id}?start=${0}&end=${20}`)
		const result = await res.json()
		return result
	} catch (error) {
		console.error("get opening error: ", error)
	}
	return null
}

export async function loader({ params }: Route.LoaderArgs) {
	const openings = await getOpening(params.id)
	if (!openings) {
		throw new Response('Not Found', { status: 404 })
	}
	return { openings }
}

export default function({ loaderData }: Route.ComponentProps) {
	console.log(loaderData)

	return (
		<div>This opening list</div>
	)
}
