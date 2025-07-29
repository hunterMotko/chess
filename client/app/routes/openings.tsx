import { Form, useNavigate } from "react-router";
import { Link } from "react-router";
import type { Route } from "./+types/openings";
import { redirect } from "react-router";

interface EcoVolume {
	id: string;
	name: string;
	description: string;
	ranges: { code: string; description: string; }[];
}

const ecoVolumes: EcoVolume[] = [
	{
		id: 'A',
		name: 'Volumes A: Flank Openings',
		description: 'White first moves other than 1.e4, 1.d4 and atypical replies to 1.d4 or 1...Nf6.',
		ranges: [
			{ code: 'A00–A39', description: 'White first moves other than 1.e4, 1.d4' },
			{ code: 'A40–A44', description: '1.d4 without 1...d5, 1...Nf6 or 1...f5: Atypical replies to 1.d4' },
			{ code: 'A45–A49', description: '1.d4 Nf6 without 2.c4: Atypical replies to 1...Nf6' },
			{ code: 'A50–A79', description: '1.d4 Nf6 2.c4 without 2...e6, 2...g6: Atypical Indian systems' },
			{ code: 'A80–A99', description: '1.d4 f5: Dutch Defence' },
		],
	},
	{
		id: 'B',
		name: 'Volumes B: Semi-Open Games (other than the French Defence)',
		description: 'Covers various semi-open games initiated by 1.e4.',
		ranges: [
			{ code: 'B00–B09', description: '1.e4 without 1...c6, 1...c5, 1...e6, 1...e5' },
			{ code: 'B10–B19', description: '1.e4 c6: Caro–Kann Defence' },
			{ code: 'B20–B99', description: '1.e4 c5: Sicilian Defence' },
		],
	},
	{
		id: 'C',
		name: 'Volumes C: Open Games and the French Defence',
		description: 'Focuses on 1.e4 e5 (open games) and the French Defence.',
		ranges: [
			{ code: 'C00–C19', description: '1.e4 e6: French Defence' },
			{ code: 'C20–C99', description: '1.e4 e5: Double King Pawn games' },
		],
	},
	{
		id: 'D',
		name: 'Volumes D: Closed Games and Semi-Closed Games',
		description: 'Includes Double Queen Pawn games and the Grünfeld Defence.',
		ranges: [
			{ code: 'D00–D69', description: '1.d4 d5: Double Queen Pawn games' },
			{ code: 'D70–D99', description: '1.d4 Nf6 2.c4 g6 with 3...d5: Grünfeld Defence' },
		],
	},
	{
		id: 'E',
		name: 'Volumes E: Indian Defences',
		description: 'Concentrates on Indian systems with ...e6 or ...g6.',
		ranges: [
			{ code: 'E00–E59', description: '1.d4 Nf6 2.c4 e6: Indian systems with ...e6' },
			{ code: 'E60–E99', description: '1.d4 Nf6 2.c4 g6 without 3...d5: Indian systems with ...g6 (except Grünfeld)' },
		],
	},
];

export async function action({ request }: Route.ActionArgs) {
	const data = await request.formData()
	const id = data.get("id")
	return redirect(`/openings/${id}?p=${1}&o=${0}`)
}

export default function Openings() {
	const navigate = useNavigate()

	return (
		<div className="min-h-screen text-white p-6 sm:p-10">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-4xl sm:text-5xl font-extrabold mb-8 text-center text-indigo-400">
					Choose Your Openings Training
				</h1>
				<p className="text-lg text-gray-300 mb-8 text-center">
					Select an ECO Volume to start practicing chess openings.
					For a detailed reference, check out the
					{' '}
					<Link
						to="https://en.wikipedia.org/wiki/Encyclopaedia_of_Chess_Openings"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-400 hover:text-blue-300 underline"
					>
						Wikipedia page
					</Link>.
				</p>

				<Form
					className="grid grid-cols-1 md:grid-cols-2 gap-6"
					method="post"
				>
					{ecoVolumes.map((volume) => (
						<button
							key={volume.id}
							name="id"
							value={volume.id}
							className="bg-gray-800 rounded-lg shadow-xl p-6 border-2 border-transparent hover:border-indigo-500 transition-all duration-300 cursor-pointer group"
							type="submit"
						>
							<h2 className="text-2xl font-bold mb-3 text-indigo-300 group-hover:text-indigo-200">
								{volume.name}
							</h2>
							<p className="text-gray-400 mb-4 text-sm">{volume.description}</p>
							<ul className="list-disc list-inside text-gray-400 space-y-1">
								{volume.ranges.map((range, index) => (
									<li key={index}>
										<span className="font-semibold text-gray-300">{range.code}:</span> {range.description}
									</li>
								))}
							</ul>
						</button>
					))}
				</Form>

				<div className="text-center mt-10">
					<button
						onClick={() => navigate('/')}
						className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition duration-300"
					>
						Back to Home
					</button>
				</div>
			</div>
		</div>
	);
}
