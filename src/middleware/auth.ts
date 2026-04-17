import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "changeme_weak_secret_do_not_use";
const ALLOW_ALG_NONE = process.env.ALLOW_JWT_ALG_NONE === "true";

function decodeUnsafe(token: string): { header: jwt.JwtHeader; payload: jwt.JwtPayload } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return { header, payload };
  } catch {
    return null;
  }
}

/**
 * INSECURE: accepts alg "none" when ALLOW_JWT_ALG_NONE is set — intentional training flaw.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_bearer_token" });
  }
  const token = hdr.slice("Bearer ".length);

  const unsafe = decodeUnsafe(token);
  if (ALLOW_ALG_NONE && unsafe?.header.alg === "none") {
    req.auth = unsafe.payload as Express.Request["auth"];
    req.tenantId = (unsafe.payload as { tenantId?: string }).tenantId;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof decoded === "string") {
      return res.status(401).json({ error: "invalid_token", detail: "unexpected_string_payload" });
    }
    const authPayload = decoded as jwt.JwtPayload & { tenantId?: string; role?: string };
    req.auth = authPayload as Express.Request["auth"];
    req.tenantId = authPayload.tenantId;
    return next();
  } catch (e) {
    const err = e as Error;
    // INSECURE: verbose error — intentional information disclosure
    return res.status(401).json({ error: "invalid_token", detail: err.message, stack: err.stack });
  }
}

export function signToken(payload: Record<string, unknown>, expiresIn: jwt.SignOptions["expiresIn"] = "8h") {
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, { algorithm: "HS256", expiresIn });
}
