import { Router } from "express";
import { db } from "../db";

const r = Router();

/**
 * INSECURE: internal route — weak static token check only; lists all tenants (cross-tenant disclosure).
 */
r.get("/tenants", (req, res) => {
  const token = req.headers["x-internal-token"];
  const expected = process.env.INTERNAL_OPS_TOKEN || "dev-internal-token";
  if (token !== expected) {
    return res.status(401).json({ error: "invalid_internal_token" });
  }
  const rows = db.prepare(`SELECT id, name, region, created_at FROM tenants`).all();
  return res.json({ tenants: rows });
});

/** INSECURE: unauthenticated metrics — information disclosure */
r.get("/metrics", (_req, res) => {
  const counts = db.prepare(`SELECT tenant_id, COUNT(*) as c FROM orders GROUP BY tenant_id`).all();
  return res.json({ order_counts_by_tenant: counts });
});

export const internalRouter = r;
