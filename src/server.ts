import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { PAGE } from "./page.js";
import { AlertStore, SEVERITIES, parseAlert, type Severity } from "./store.js";

const MAX_BODY = 64 * 1024;

function send(res: ServerResponse, status: number, body: string, type = "application/json"): void {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
  res.end(body);
}

function authorized(req: IncomingMessage, token: string | undefined): boolean {
  if (!token) return true; // auth disabled (local dev)
  const header = req.headers.authorization ?? "";
  const expected = Buffer.from(`Bearer ${token}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function readBody(req: IncomingMessage): Promise<string | null> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) return null;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createServer(store: AlertStore, token?: string): Server {
  return createHttpServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/") return send(res, 200, PAGE, "text/html; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/health") return send(res, 200, '{"status":"ok"}');

    if (req.method === "GET" && url.pathname === "/api/alerts") {
      const min = url.searchParams.get("min") as Severity | null;
      const floor = min && SEVERITIES.includes(min) ? min : undefined;
      return send(res, 200, JSON.stringify(store.list(floor)));
    }

    if (req.method === "POST" && url.pathname === "/api/alerts") {
      if (!authorized(req, token)) return send(res, 401, '{"error":"unauthorized"}');
      const raw = await readBody(req);
      if (raw === null) return send(res, 413, '{"error":"payload too large"}');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return send(res, 400, '{"error":"invalid json"}');
      }
      const alert = parseAlert(parsed);
      if (!alert) return send(res, 422, '{"error":"invalid alert"}');
      store.add(alert);
      return send(res, 201, JSON.stringify({ ok: true, id: alert.id }));
    }

    return send(res, 404, '{"error":"not found"}');
  });
}
