import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";

const r = Router();
r.use(authMiddleware);

r.post("/", (req, res) => {
  const userId = req.auth?.sub;
  const tenantId = req.tenantId;
  if (!userId || !tenantId) return res.status(401).json({ error: "unauthorized" });

  const { sku, quantity, notes } = req.body as { sku?: string; quantity?: number; notes?: string };
  if (!sku || typeof quantity !== "number") {
    return res.status(400).json({ error: "sku_and_quantity_required" });
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO orders (id, tenant_id, user_id, sku, quantity, status, notes) VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  ).run(id, tenantId, userId, sku, quantity, notes ?? null);

  const row = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id);
  return res.status(201).json(row);
});

/** INSECURE: IDOR — fetches by id without enforcing tenant_id match */
r.get("/:id", (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  const row = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "not_found" });
  return res.json(row);
});

/** INSECURE: broken access control — no ownership check, only authentication */
r.delete("/:id", (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: "unauthorized" });
  const info = db.prepare(`DELETE FROM orders WHERE id = ?`).run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "not_found" });
  return res.status(204).send();
});

r.get("/", (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.auth?.sub;
  if (!tenantId || !userId) return res.status(401).json({ error: "unauthorized" });
  const rows = db.prepare(`SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC`).all(tenantId);
  return res.json({ items: rows });
});

export const ordersRouter = r;
