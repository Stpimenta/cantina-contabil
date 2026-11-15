import { describe, expect, it } from "vitest";
import { unstable_readConfig } from "wrangler";
import { resolve } from "node:path";
describe("Next local platform proxy", () => {
  it("targets the executable Worker instead of resolving RPC to its empty entrypoint", () => {
    const config = resolve("wrangler.local.jsonc");
    const worker = unstable_readConfig({ config });
    const proxy = unstable_readConfig({ config, env: "next" });
    expect(proxy.name).not.toBe(worker.name);
    expect(proxy.services).toEqual([
      { binding: "WORKER_SELF_REFERENCE", service: worker.name },
    ]);
    expect(proxy.d1_databases).toEqual(worker.d1_databases);
    expect(proxy.r2_buckets).toEqual(worker.r2_buckets);
    expect(
      proxy.d1_databases.every(
        (binding: { remote?: boolean }) => binding.remote === false,
      ),
    ).toBe(true);
    expect(
      proxy.r2_buckets.every(
        (binding: { remote?: boolean }) => binding.remote === false,
      ),
    ).toBe(true);
  });
});
