import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createServer } from "./server.js";
import { AlertStore, parseAlert } from "./store.js";

const alert = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  source: "github",
  event_type: "push",
  severity: "high",
  score: 60,
  reasons: ["Force push to default branch"],
  summary: "forced push",
  engine: "rules",
  ...over,
});

async function withServer(token: string | undefined, fn: (base: string, store: AlertStore) => Promise<void>) {
  const store = new AlertStore();
  const server = createServer(store, token);
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await fn(base, store);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

const post = (base: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}/api/alerts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

test("parseAlert rejects bad severity and clamps score", () => {
  assert.equal(parseAlert(alert({ severity: "urgent" })), null);
  assert.equal(parseAlert(alert({ score: 999 }))?.score, 100);
  assert.equal(parseAlert("nope"), null);
});

test("store de-duplicates by id and filters by severity", () => {
  const s = new AlertStore();
  s.add(parseAlert(alert())!);
  s.add(parseAlert(alert({ summary: "updated" }))!);
  s.add(parseAlert(alert({ id: "a2", severity: "low" }))!);
  assert.equal(s.size, 2);
  assert.equal(s.list("high").length, 1);
});

test("POST then GET returns the alert", async () => {
  await withServer(undefined, async (base) => {
    assert.equal((await post(base, alert())).status, 201);
    const list = (await (await fetch(`${base}/api/alerts`)).json()) as unknown[];
    assert.equal(list.length, 1);
  });
});

test("invalid json and invalid alert are rejected", async () => {
  await withServer(undefined, async (base) => {
    assert.equal((await post(base, "{not json")).status, 400);
    assert.equal((await post(base, { id: 1 })).status, 422);
  });
});

test("token auth is enforced on POST only", async () => {
  await withServer("s3cret", async (base) => {
    assert.equal((await post(base, alert())).status, 401);
    assert.equal((await post(base, alert(), { authorization: "Bearer wrong!" })).status, 401);
    assert.equal((await post(base, alert(), { authorization: "Bearer s3cret" })).status, 201);
    assert.equal((await fetch(`${base}/api/alerts`)).status, 200);
  });
});

test("oversized body is rejected", async () => {
  await withServer(undefined, async (base) => {
    assert.equal((await post(base, alert({ summary: "x".repeat(70_000) }))).status, 413);
  });
});

test("dashboard page and health respond", async () => {
  await withServer(undefined, async (base) => {
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Sentinel alerts/);
    assert.equal((await fetch(`${base}/health`)).status, 200);
  });
});
