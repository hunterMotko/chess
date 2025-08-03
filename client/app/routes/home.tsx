import type { Route } from "./+types/home";
import Game from '../game/Game'
import { Link } from "react-router";

export function meta({ }: Route.MetaArgs) {
	return [
		{ title: "Chess Game" },
		{ name: "description", content: "Work on your chess skills here!" },
	];
}

export default function Home() {
	return (
		<div className="w-full md:w-2/3 my-5 mx-auto">
			<HomeScreen />
		</div>
	)
}

function HomeScreen() {
	return (
		<div className="min-h-screen flex items-center justify-center text-white p-4">
			<div className="text-center space-y-8">
				<h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
					<span className="block text-indigo-400">Lets work on that chess game!</span>
				</h1>
				<p className="max-w-xl mx-auto text-xl text-gray-300">
					Choose your adventure: challenge Stockfish or sharpen your opening skills.
				</p>
				<div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mt-8">
					<Link
						to="/play/new"
						className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105 shadow-lg"
					>
						Play Against Stockfish
					</Link>
					<Link
						to="/openings"
						className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105 shadow-lg"
					>
						Chess Openings Trainer
					</Link>
				</div>
			</div>
		</div>
	);
};

