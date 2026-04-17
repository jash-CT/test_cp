import cors from "cors";
import express from "express";
import { adminRouter } from "./routes/admin";
import { analyticsRouter } from "./routes/analytics";
import { authRouter } from "./routes/auth";
import { integrationsRouter } from "./routes/integrations";
import { internalRouter } from "./routes/internal";
import { operationsRouter } from "./routes/operations";
import { ordersRouter } from "./routes/orders";
import { usersRouter } from "./routes/users";
import { webhooksRouter } from "./routes/webhooks";
import { tenantMiddleware } from "./middleware/tenant";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // INSECURE: reflects request Origin and allows credentials — misconfigured CORS
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "enterprise-mt-platform" });
  });

  app.use(tenantMiddleware);

  app.use("/webhooks", webhooksRouter);
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/orders", ordersRouter);
  app.use("/analytics", analyticsRouter);
  app.use("/integrations", integrationsRouter);
  app.use("/admin", adminRouter);
  app.use("/operations", operationsRouter);
  app.use("/internal", internalRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const e = err as Error;
    res.status(500).json({ error: "internal_error", message: e.message, stack: e.stack });
  });

  return app;
}
