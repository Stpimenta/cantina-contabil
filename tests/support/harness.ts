import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Miniflare } from "miniflare";
import { unstable_splitSqlQuery } from "wrangler";
import { drizzle } from "drizzle-orm/d1";
import { D1CashBoxRepository } from "@/server/cash-boxes/infrastructure/d1-cash-box.repository";
import { D1DonationRepository } from "@/server/donations/infrastructure/d1-donation.repository";
import { D1EventRepository } from "@/server/events/infrastructure/d1-event.repository";
import { D1EventSupplyRepository } from "@/server/events/infrastructure/d1-event-supply.repository";
import { D1MovementRepository } from "@/server/movements/infrastructure/d1-movement.repository";
import { R2ReceiptRepository } from "@/server/events/infrastructure/r2-receipt.repository";
import { setTestBucket } from "./cloudflare";
import { session } from "./data";
import { CreateCashBoxUseCase } from "@/server/cash-boxes/use-cases/create-cash-box.use-case";

export async function harness() {
  const temporary = await mkdtemp(join(tmpdir(), "cantina-tests-"));
  const mf = new Miniflare({
    host: "127.0.0.1", port: 0, telemetry: { enabled: false },
    isolatedResourcePersistencePath: temporary,
    workers: [{ config: {
      name: "cantina-tests", compatibilityDate: "2026-10-01",
      manifest: { mainModule: "test.js", modules: { "test.js": { type: "esm", contents: "export default {fetch(){return new Response('test')}}" } } },
      env: { TEST_DB: { type: "d1", id: "test-db", dev: { remote: false } }, TEST_RECEIPTS: { type: "r2", name: "test-receipts", dev: { remote: false } } },
    } }],
  });
  try {
    const d1 = await mf.getD1Database("TEST_DB");
    const directory = new URL("../../migrations/", import.meta.url);
    for (const file of (await readdir(directory)).filter((f) => f.endsWith(".sql")).sort()) {
      const sql = await readFile(new URL(file, directory), "utf8");
      // Use Wrangler's parser so trigger bodies and migration transactions stay intact.
      await d1.batch(unstable_splitSqlQuery(sql).map((statement) => d1.prepare(statement)));
    }
    const db = drizzle(d1);
    const bucket = await mf.getR2Bucket("TEST_RECEIPTS");
    setTestBucket(bucket);
    const boxes = new D1CashBoxRepository(db);
    const actor = session();
    return {
      d1, bucket, actor, boxes,
      donations: new D1DonationRepository(db), events: new D1EventRepository(db),
      supplies: new D1EventSupplyRepository(db), movements: new D1MovementRepository(db),
      receipts: new R2ReceiptRepository(),
      box: (name = "Caixa teste") => new CreateCashBoxUseCase(boxes).execute(actor, { name, description: "" }),
      async close() { setTestBucket(undefined); try { await mf.dispose(); } finally { await rm(temporary, { recursive: true, force: true }); } },
    };
  } catch (error) {
    setTestBucket(undefined);
    try { await mf.dispose(); } finally { await rm(temporary, { recursive: true, force: true }); }
    throw error;
  }
}
export type Harness = Awaited<ReturnType<typeof harness>>;
