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

export async function harness(withCommands = false) {
  const commandBundle = withCommands
    ? await (
        await import("esbuild")
      ).build({
        entryPoints: ["custom-worker.ts"],
        bundle: true,
        format: "esm",
        platform: "browser",
        external: ["cloudflare:workers"],
        write: false,
        plugins: [
          {
            name: "test-opennext-boundary",
            setup(build) {
              build.onResolve({ filter: /\.open-next\/worker\.js$/ }, () => ({
                path: "opennext",
                namespace: "synthetic",
              }));
              build.onLoad({ filter: /.*/, namespace: "synthetic" }, () => ({
                contents:
                  "export default {fetch(){return new Response('synthetic next boundary')}}",
                loader: "js",
              }));
            },
          },
        ],
      })
    : null;
  const temporary = await mkdtemp(join(tmpdir(), "cantina-tests-"));
  const mf = new Miniflare({
    host: "127.0.0.1",
    port: 0,
    telemetry: { enabled: false },
    isolatedResourcePersistencePath: temporary,
    workers: [
      {
        config: {
          name: "cantina-tests",
          compatibilityDate: "2026-10-01",
          manifest: {
            mainModule: "test.js",
            modules: {
              "test.js": {
                type: "esm",
                contents:
                  commandBundle?.outputFiles[0].text ??
                  "export default {fetch(){return new Response('test')}}",
              },
            },
          },
          exports: withCommands
            ? {
                CommandHub: {
                  type: "durable-object",
                  storage: "sqlite",
                  state: "created",
                },
              }
            : {},
          env: {
            ...(withCommands
              ? {
                  WORKER_SELF_REFERENCE: {
                    type: "worker" as const,
                    worker: "cantina-tests",
                  },
                  SESSION_SECRET: {
                    type: "json" as const,
                    value: "synthetic-secret-only-for-disposable-canteen-tests",
                  },
                  APP_ENV: { type: "json" as const, value: "test" },
                  DB: {
                    type: "d1" as const,
                    id: "test-db",
                    dev: { remote: false },
                  },
                  COMMANDS: {
                    type: "durable-object" as const,
                    worker: "cantina-tests",
                    exportName: "CommandHub",
                  },
                }
              : {}),
            TEST_DB: { type: "d1", id: "test-db", dev: { remote: false } },
            TEST_RECEIPTS: {
              type: "r2",
              name: "test-receipts",
              dev: { remote: false },
            },
          },
        },
      },
      ...(withCommands
        ? [
            {
              config: {
                name: "cantina-next-proxy-tests",
                compatibilityDate: "2026-10-01",
                manifest: {
                  mainModule: "proxy.js",
                  modules: {
                    "proxy.js": {
                      type: "esm" as const,
                      contents: "export default {}",
                    },
                  },
                },
                env: {
                  WORKER_SELF_REFERENCE: {
                    type: "worker" as const,
                    worker: "cantina-tests",
                  },
                },
              },
            },
          ]
        : []),
    ],
  });
  try {
    const d1 = await mf.getD1Database("TEST_DB");
    const directory = new URL("../../migrations/", import.meta.url);
    for (const file of (await readdir(directory))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      const sql = await readFile(new URL(file, directory), "utf8");
      // Use Wrangler's parser so trigger bodies and migration transactions stay intact.
      await d1.batch(
        unstable_splitSqlQuery(sql).map((statement) => d1.prepare(statement)),
      );
    }
    const db = drizzle(d1);
    const hubs = withCommands
      ? await mf.getDurableObjectNamespace("COMMANDS")
      : null;
    const worker = withCommands
      ? ((await mf.getBindings("cantina-next-proxy-tests"))
          .WORKER_SELF_REFERENCE as {
          armCommands(eventId: string, operation: string): Promise<void>;
        })
      : null;
    const publications =
      hubs && worker
        ? {
            async arm(eventId: string, operation: string) {
              await worker.armCommands(eventId, operation);
            },
            async flush(eventId: string) {
              await hubs
                .get(hubs.idFromName(eventId))
                .fetch("https://commands.internal/flush", { method: "POST" });
            },
          }
        : undefined;
    const bucket = await mf.getR2Bucket("TEST_RECEIPTS");
    setTestBucket(bucket);
    const boxes = new D1CashBoxRepository(db);
    const actor = session();
    return {
      d1,
      db,
      mf,
      hubs,
      publications,
      bucket,
      actor,
      boxes,
      donations: new D1DonationRepository(db),
      events: new D1EventRepository(db, publications),
      supplies: new D1EventSupplyRepository(db),
      movements: new D1MovementRepository(db),
      receipts: new R2ReceiptRepository(),
      box: (name = "Caixa teste") =>
        new CreateCashBoxUseCase(boxes).execute(actor, {
          name,
          description: "",
        }),
      async close() {
        setTestBucket(undefined);
        try {
          await mf.dispose();
        } finally {
          await rm(temporary, { recursive: true, force: true });
        }
      },
    };
  } catch (error) {
    setTestBucket(undefined);
    try {
      await mf.dispose();
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
    throw error;
  }
}
export type Harness = Awaited<ReturnType<typeof harness>>;
