import { Hono } from "hono";
import { api } from "./api";
import type { AppEnv } from "./auth";
import { web } from "./web";

const app = new Hono<AppEnv>();
app.route("/api", api);
app.route("/", web);

export default app;
