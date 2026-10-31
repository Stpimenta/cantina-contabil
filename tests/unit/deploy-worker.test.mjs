import { expect, it, vi } from "vitest";
vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));
import { spawnSync } from "node:child_process";
import { deployPrepared } from "../../scripts/deploy-worker.mjs";
it("CI usa token, preserva tag/mensagem como argumentos e não exige perfil local", () => {
  const message = "fix: tratar $(texto) e `texto`";
  deployPrepared("/tmp/pacote-sintetico", "v0.6.4", message, {
    CLOUDFLARE_API_TOKEN: "sintetico",
  });
  const [command, args, options] = spawnSync.mock.lastCall;
  expect(command).toBe("npx");
  expect(args).not.toContain("--profile");
  expect(args.slice(-4)).toEqual(["--tag", "v0.6.4", "--message", message]);
  expect(options.cwd).toBe("/tmp/pacote-sintetico");
  expect(options.env.OPEN_NEXT_DEPLOY).toBe("true");
  expect(options.shell).toBeUndefined();
});
it("publicação manual sem token mantém perfil existente", () => {
  deployPrepared("/tmp/pacote-sintetico", "v0.6.4", "Publicação sintética", {});
  const args = spawnSync.mock.lastCall[1];
  expect(
    args.slice(args.indexOf("--profile"), args.indexOf("--profile") + 2),
  ).toEqual(["--profile", "cantina-contabil"]);
});
it("falha no envio retorna resultado incerto sem segunda tentativa", () => {
  spawnSync.mockReturnValueOnce({ status: 1 });
  const count = spawnSync.mock.calls.length;
  expect(() =>
    deployPrepared(
      "/tmp/pacote-sintetico",
      "v0.6.4",
      "Publicação sintética",
      {},
    ),
  ).toThrow(/Envio não confirmado/);
  expect(spawnSync.mock.calls.length).toBe(count + 1);
});
