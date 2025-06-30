import express from "express";
import cors from "cors";
import path from "path";
// import { config } from "./config.js";

const __dirname = path.resolve();

if (!config.api.port) {
	console.error("PORT environment variable is not set");
	process.exit(1);
}

const app = express();
app.use(express.json());

app.use(
	cors({
		origin: ["https://*", "http://*"],
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: "*",
		exposedHeaders: ["Link"],
		credentials: false,
		maxAge: 300,
	}),
);

const v1Router = express.Router();

app.use("/v1", v1Router);

app.listen(config.api.port, () => {
	console.log(`Server is running on port: ${config.api.port}`);
});
