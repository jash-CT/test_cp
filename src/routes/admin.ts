import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";

const r = Router();
r.use(authMiddleware);

/**
 * INSECURE: "admin" screen uses string role check that is case-sensitive / bypassable in some JWT edits;
 * primary demo: reflected/stored HTML — team/display_name rendered into HTML without encoding.
 */
r.get("/team-dashboard", (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) return res.status(401).send("Unauthorized");
  if (req.auth?.role !== "admin") return res.status(403).send("Forbidden");

  const row = db.prepare(`SELECT team, display_name FROM users WHERE id = ?`).get(userId) as
    | { team: string; display_name: string }
    | undefined;
  const team = row?.team ?? "";
  const name = row?.display_name ?? "";

  res.type("html");
  return res.send(
    `<!doctype html><html><head><title>Ops</title></head><body>
    <h1>Team: ${team}</h1>
    <p>Lead: ${name}</p>
    </body></html>`
  );
});

export const adminRouter = r;
