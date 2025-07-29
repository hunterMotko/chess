import { useNavigate, useSearchParams } from "react-router"
import type { Route } from "./+types/opening-choice"
import { useState } from "react"
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
	const totalPages = Math.floor(data.total / 50)

	function onPageChange(curPage: number) {
		navigate(`/openings/${id}?p=${curPage}&o=${curPage * 50}`)
	}

	return (
		<div className="my-5 mx-auto">
			<section className="w-1/2 bg-gray-700 text-center border rounded my-8 mx-auto p-3">
				<h1 className="text-4xl">Openings Volume: {id}</h1>
				<p className="text-3xl">Choose your opening to practice</p>
			</section>
			<section className="mx-3">
				{data.openings.map(item => (
					<div
						key={item.id}
						className="bg-gray-700 hover:bg-gray-600 text-white grid grid-cols-7 font-bold border rounded mx-3 p-2"
					>
						<div className="">
							{item.eco}
						</div>
						<div className="col-span-3">
							{item.name}
						</div>
						<div className="col-span-3">
							{item.pgn}
						</div>
					</div>
				))}
			</section>

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
					Back to Home
				</button>
			</div>
		</div>
	)
}

