import { randomUUID } from "crypto";
import { Router } from "express";
import { db } from "../db";

const r = Router();

/**
 * INSECURE: third-party webhook has no HMAC/signature verification — anyone can post events.
 */
r.post("/shipping", (req, res) => {
  const tenantId = typeof req.query.tenant_id === "string" ? req.query.tenant_id : "";
  if (!tenantId) return res.status(400).json({ error: "tenant_id_required" });

  const body = req.body as Record<string, unknown>;
  db.prepare(`INSERT INTO analytics_events (id, tenant_id, event_type, payload) VALUES (?, ?, ?, ?)`).run(
    randomUUID(),
    tenantId,
    "shipping_webhook",
    JSON.stringify(body)
  );
  return res.json({ accepted: true });
});

export const webhooksRouter = r;
