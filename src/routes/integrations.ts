import axios from "axios";
import { randomUUID } from "crypto";
import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";

const r = Router();
r.use(authMiddleware);

r.get("/", (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) return res.status(401).json({ error: "unauthorized" });
  const rows = db.prepare(`SELECT * FROM integrations WHERE tenant_id = ?`).all(tenantId);
  return res.json({ items: rows });
});

r.post("/", (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) return res.status(401).json({ error: "unauthorized" });
  const { name, webhook_url } = req.body as { name?: string; webhook_url?: string };
  if (!name) return res.status(400).json({ error: "name_required" });
  const id = randomUUID();
  db.prepare(`INSERT INTO integrations (id, tenant_id, name, webhook_url) VALUES (?, ?, ?, ?)`).run(
    id,
    tenantId,
    name,
    webhook_url ?? null
  );
  const row = db.prepare(`SELECT * FROM integrations WHERE id = ?`).get(id);
  return res.status(201).json(row);
});

/**
 * INSECURE: SSRF — server-side fetch of user-controlled URL.
 */
r.post("/:id/probe", async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) return res.status(401).json({ error: "unauthorized" });
  const row = db.prepare(`SELECT * FROM integrations WHERE id = ? AND tenant_id = ?`).get(req.params.id, tenantId) as
    | { webhook_url: string | null }
    | undefined;
  if (!row?.webhook_url) return res.status(404).json({ error: "not_found" });

  const overrideUrl = typeof req.body?.url === "string" ? req.body.url : row.webhook_url;
  try {
    const resp = await axios.get(overrideUrl, { timeout: 8000, maxRedirects: 5, validateStatus: () => true });
    return res.json({ status: resp.status, data: resp.data, url: overrideUrl });
  } catch (e) {
    const err = e as Error;
    return res.status(502).json({ error: "probe_failed", detail: err.message });
  }
});

export const integrationsRouter = r;
