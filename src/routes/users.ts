import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";

const r = Router();
r.use(authMiddleware);

/** Onboarding / profile — INSECURE: mass assignment on role/display_name/team */
r.put("/me", (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const body = req.body as Record<string, unknown>;
  const allowedFromClient = { ...body };

  const sets: string[] = [];
  const vals: Array<string | number | null | bigint> = [];
  for (const [k, v] of Object.entries(allowedFromClient)) {
    if (k === "id" || k === "tenant_id") continue;
    sets.push(`${k} = ?`);
    if (v === null || v === undefined) vals.push(null);
    else if (typeof v === "number" || typeof v === "bigint") vals.push(v);
    else if (typeof v === "boolean") vals.push(v ? 1 : 0);
    else vals.push(String(v));
  }
  if (sets.length === 0) return res.status(400).json({ error: "no_updates" });

  vals.push(userId);
  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

  const row = db.prepare(`SELECT id, email, role, display_name, team, tenant_id FROM users WHERE id = ?`).get(userId);
  return res.json(row);
});

r.get("/me", (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  const row = db.prepare(`SELECT id, email, role, display_name, team, tenant_id FROM users WHERE id = ?`).get(userId);
  return res.json(row);
});

export const usersRouter = r;
