import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./index";

async function main() {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const adminA = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();

  db.prepare(
    `INSERT OR REPLACE INTO tenants (id, name, region) VALUES (?, ?, ?), (?, ?, ?)`
  ).run(tenantA, "Acme Corp", "us-east-1", tenantB, "Globex", "eu-west-1");

  const hash = await bcrypt.hash("Password123!", 10);

  db.prepare(
    `INSERT OR REPLACE INTO users (id, tenant_id, email, password_hash, role, display_name, team) VALUES
     (?, ?, ?, ?, 'admin', 'Acme Admin', 'platform'),
     (?, ?, ?, ?, 'user', 'Acme User', 'sales'),
     (?, ?, ?, ?, 'user', 'Globex User', 'ops')`
  ).run(
    adminA,
    tenantA,
    "admin@acme.example",
    hash,
    userA,
    tenantA,
    "user@acme.example",
    hash,
    userB,
    tenantB,
    "user@globex.example",
    hash
  );

  const o1 = randomUUID();
  const o2 = randomUUID();
  db.prepare(
    `INSERT OR REPLACE INTO orders (id, tenant_id, user_id, sku, quantity, status, notes) VALUES
     (?, ?, ?, 'SKU-100', 2, 'shipped', 'First order'),
     (?, ?, ?, 'SKU-200', 1, 'pending', 'Second order')`
  ).run(o1, tenantA, userA, o2, tenantB, userB);

  db.prepare(
    `INSERT OR REPLACE INTO integrations (id, tenant_id, name, webhook_url) VALUES (?, ?, 'ERP', 'https://hooks.example.com/erp')`
  ).run(randomUUID(), tenantA);

  db.prepare(
    `INSERT OR REPLACE INTO analytics_events (id, tenant_id, event_type, payload) VALUES
     (?, ?, 'page_view', '{"path":"/dashboard"}'),
     (?, ?, 'checkout_started', '{"cart":"abc"}')`
  ).run(randomUUID(), tenantA, randomUUID(), tenantB);

  console.log("Seed complete. Tenants:", { tenantA, tenantB });
  console.log("Sample credentials: user@acme.example / Password123!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
