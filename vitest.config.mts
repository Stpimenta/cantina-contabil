import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      "@": local("./src"),
      "server-only": local("./tests/support/server-only.ts"),
      "@opennextjs/cloudflare": local("./tests/support/cloudflare.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/{unit,integration}/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 60000,
    restoreMocks: true,
    unstubGlobals: true,
    // Never load the app's .env or its production/development bindings.
    env: { APP_ENV: "test" },
  },
  envDir: false,
});
