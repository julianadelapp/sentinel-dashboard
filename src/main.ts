import { createServer } from "./server.js";
import { AlertStore } from "./store.js";

const port = Number(process.env.PORT ?? 3000);
const token = process.env.DASHBOARD_TOKEN;
if (!token) console.warn("DASHBOARD_TOKEN not set: POST /api/alerts is unauthenticated (dev only)");

createServer(new AlertStore(), token).listen(port, () => {
  console.log(`sentinel-dashboard listening on :${port}`);
});
