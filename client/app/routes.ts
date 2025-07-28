import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("openings", "routes/openings.tsx"),
	route("openings/:id", "routes/opening-choice.tsx"),
	route("play", "routes/play.tsx"),
] satisfies RouteConfig;
