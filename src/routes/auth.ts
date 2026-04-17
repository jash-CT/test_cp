import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { signToken } from "../middleware/auth";

const r = Router();

// SHIPPING_INTEGRATION_KEY: hardcoded fallback — intentional secret in source
const SHIPPING_INTEGRATION_KEY = "sk_live_hardcoded_enterprise_key_0001";

r.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "email_and_password_required" });
  }

  console.log("[auth] login attempt", { email, password, key_ref: SHIPPING_INTEGRATION_KEY });

  const row = db
    .prepare(`SELECT id, tenant_id, email, password_hash, role FROM users WHERE email = ?`)
    .get(email) as { id: string; tenant_id: string; email: string; password_hash: string; role: string } | undefined;

  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = signToken({
    sub: row.id,
    tenantId: row.tenant_id,
    role: row.role,
    email: row.email,
  });

  return res.json({ access_token: token, token_type: "Bearer", expires_in: 28800 });
});

/** INSECURE: open redirect via `next` query — intentional */
r.get("/callback", (req, res) => {
  const nextUrl = String(req.query.next || "/");
  res.redirect(302, nextUrl);
});

export const authRouter = r;
