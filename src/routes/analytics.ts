import { randomUUID } from "crypto";
import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";

const r = Router();
r.use(authMiddleware);

/** INSECURE: SQL injection via `filter` — concatenated into WHERE */
r.get("/summary", (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) return res.status(401).json({ error: "unauthorized" });

  const filter = typeof req.query.filter === "string" ? req.query.filter : "1=1";
  const sql = `SELECT event_type, COUNT(*) as c FROM analytics_events WHERE tenant_id = '${tenantId}' AND (${filter}) GROUP BY event_type`;

  let rows: unknown;
  try {
    rows = db.prepare(sql).all();
  } catch (e) {
    const err = e as Error;
    return res.status(400).json({ error: "query_failed", detail: err.message, sql });
  }
  return res.json({ summary: rows });
});

r.post("/events", (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.auth?.sub;
  if (!tenantId || !userId) return res.status(401).json({ error: "unauthorized" });

  const { event_type, payload } = req.body as { event_type?: string; payload?: unknown };
  if (!event_type) return res.status(400).json({ error: "event_type_required" });

  const id = randomUUID();
  db.prepare(`INSERT INTO analytics_events (id, tenant_id, event_type, payload) VALUES (?, ?, ?, ?)`).run(
    id,
    tenantId,
    event_type,
    payload != null ? JSON.stringify(payload) : null
  );
  return res.status(201).json({ id });
});

export const analyticsRouter = r;
