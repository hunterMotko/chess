import { useNavigate } from "react-router"
import type { Route } from "./+types/opening-choice"
import Pagination from "~/components/pagination"

type Opening = {
	id: string
	eco: string
	name: string
	pgn: string
}

type Resp = {
	openings: Opening[]
	page: number
	offset: number
	total: number
}

async function getOpening(id: string, page: number, offset: number): Promise<Resp | null> {
	try {
		const res = await fetch(`http://localhost:8888/api/openings/${id}?p=${page}&o=${offset}`)
		const result = await res.json()
		return result
	} catch (error) {
		console.error("get opening error: ", error)
	}
	return null
}

export async function loader({ params, request }: Route.LoaderArgs) {
	let url = new URL(request.url)
	let page = parseInt(url.searchParams.get('p') ?? "")
	let offset = parseInt(url.searchParams.get('o') ?? "")

	const openings = await getOpening(params.id, page, offset)
	if (!openings) {
		throw new Response('Not Found', { status: 404 })
	}

	return {
		id: params.id,
		data: openings,
		page: page,
		offset: offset
	}
}

export default function({ loaderData }: Route.ComponentProps) {
	const navigate = useNavigate()
	const { id, data, page } = loaderData

	// Handle case where data might be null due to API failure
	if (!data || !data.openings) {
		return (
			<div className="min-h-screen text-white p-6 sm:p-10">
				<div className="max-w-4xl mx-auto">
					<div className="bg-red-900 border border-red-600 rounded-lg shadow-xl p-8 text-center">
						<h1 className="text-3xl font-bold text-red-300 mb-4">Error Loading Openings</h1>
						<p className="text-lg text-red-200 mb-6">Could not connect to server. Please try again.</p>
						<button
							onClick={() => navigate('/openings')}
							className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition duration-300"
						>
							Back to Openings
						</button>
					</div>
				</div>
			</div>
		)
	}

	const totalPages = Math.floor(data.total / 50)

	function onPageChange(curPage: number) {
		navigate(`/openings/${id}?p=${curPage}&o=${curPage * 50}`)
	}

	function onClick(pgn: string, eco: string) {
		navigate(`/play/new?pgn=${pgn}&eco=${eco}`)
	}

	return (
		<div className="min-h-screen text-white p-6 sm:p-10">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-4xl sm:text-5xl font-extrabold mb-8 text-center text-indigo-400">
					Openings Volume: {id}
				</h1>
				<p className="text-lg text-gray-300 mb-8 text-center">
					Choose your opening to practice and master the theory.
				</p>

				<div className="space-y-4 mb-8">
					{data.openings.map(item => (
						<button
							key={item.id}
							onClick={() => onClick(item.pgn, item.eco)}
							className="w-full bg-gray-800 rounded-lg shadow-xl p-6 border-2 border-transparent hover:border-indigo-500 transition-all duration-300 cursor-pointer group"
						>
							<div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
								<div className="md:col-span-1">
									<span className="inline-block bg-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-full">
										{item.eco}
									</span>
								</div>
								<div className="md:col-span-3">
									<h3 className="text-lg font-semibold text-gray-300 group-hover:text-indigo-200 text-left">
										{item.name}
									</h3>
								</div>
								<div className="md:col-span-3">
									<p className="text-gray-400 text-sm font-mono text-left">
										{item.pgn}
									</p>
								</div>
							</div>
						</button>
					))}
				</div>

				<Pagination
					curPage={page}
					totalPages={totalPages}
					onPageChange={onPageChange}
				/>

				<div className="text-center mt-10">
					<button
						onClick={() => navigate('/openings')}
						className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition duration-300"
					>
						Back to Openings
					</button>
				</div>
			</div>
		</div>
	)
}

