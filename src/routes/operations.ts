import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { Router } from "express";
import { authMiddleware } from "../middleware/auth";

const execAsync = promisify(exec);
const r = Router();
r.use(authMiddleware);

const exportDir = path.join(process.cwd(), "data", "exports");
fs.mkdirSync(exportDir, { recursive: true });

/** INSECURE: command injection — `label` concatenated into shell command */
r.post("/export-report", async (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: "unauthorized" });
  const label = String((req.body as { label?: string }).label ?? "report");
  const outName = `export_${Date.now()}.txt`;
  const outPath = path.join(exportDir, outName);
  fs.writeFileSync(outPath, `report:${label}\n`, "utf8");

  const isWin = process.platform === "win32";
  try {
    if (isWin) {
      await execAsync(`cmd.exe /c echo meta:${label} > "${outPath}.meta"`);
    } else {
      await execAsync(`sh -c 'echo meta:${label} > "${outPath}.meta"'`);
    }
  } catch (e) {
    const err = e as Error;
    return res.status(500).json({ error: "export_failed", detail: err.message });
  }

  return res.json({ file: outName, note: "download via /operations/download?file=" });
});

/** INSECURE: path traversal — `file` joined without path canonicalization / allow-list */
r.get("/download", (req, res) => {
  if (!req.auth?.sub) return res.status(401).json({ error: "unauthorized" });
  const file = String(req.query.file ?? "");
  const resolved = path.join(exportDir, file);
  if (!fs.existsSync(resolved)) return res.status(404).json({ error: "not_found" });
  return res.sendFile(resolved);
});

export const operationsRouter = r;
