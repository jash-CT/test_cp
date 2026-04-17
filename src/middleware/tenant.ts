import type { Request, Response, NextFunction } from "express";

/** Prefer JWT tenant; allow X-Tenant-Id override for "routing" — intentionally weak binding. */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerTenant = req.headers["x-tenant-id"];
  if (typeof headerTenant === "string" && headerTenant.length > 0) {
    req.tenantId = headerTenant;
  }
  next();
}
