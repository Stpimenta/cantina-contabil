import { describe, expect, it, vi } from "vitest";
import {
  compareVersions,
  validatePackageVersion,
  releaseMessage,
  checkMigrationNames,
  deploymentDecision,
} from "../../scripts/release-rules.mjs";
import { publishRelease } from "../../scripts/ci-release.mjs";
import { cloudflareClient, requestJson } from "../../scripts/ci-api.mjs";
import { z } from "zod";
const sha = "a".repeat(40);
const otherSha = "b".repeat(40);
const release = {
  tag: "v0.6.4",
  sha,
  message: releaseMessage("feat: automatizar publicação", 2, sha),
};
function live(
  tag = "v0.6.3",
  message = "Publicação anterior",
  id = "anterior",
) {
  return {
    deployment: { id, versions: [{ version_id: id, percentage: 100 }] },
    version: {
      id,
      annotations: { "workers/tag": tag, "workers/message": message },
    },
  };
}
const confirmed = () => live(release.tag, release.message, "nova");
function setup() {
  const cleanup = vi.fn();
  const record = { status: "failed", uploadAttempted: false };
  return {
    release,
    record,
    migrationNames: ["0001_initial.sql"],
    github: {
      head: vi.fn().mockResolvedValue(sha),
      tag: vi.fn().mockResolvedValue(null),
      createTag: vi.fn().mockResolvedValue(undefined),
    },
    cloudflare: {
      active: vi.fn().mockResolvedValue(live()),
      migrations: vi.fn().mockResolvedValue(["0001_initial.sql"]),
    },
    prepare: vi
      .fn()
      .mockResolvedValue({ workspace: "/tmp/sintetico", cleanup }),
    upload: vi.fn().mockResolvedValue(undefined),
    cleanup,
  };
}
describe("identificação da publicação", () => {
  it("ordena versão numericamente e confere os três campos do pacote", () => {
    expect(compareVersions("0.6.10", "0.6.9")).toBe(1);
    expect(compareVersions("1.0.0", "0.99.99")).toBe(1);
    expect(compareVersions("0.6.4", "0.6.4")).toBe(0);
    expect(
      validatePackageVersion(
        { version: "0.6.4" },
        { version: "0.6.4", packages: { "": { version: "0.6.4" } } },
        "0.6.3",
      ),
    ).toBe("0.6.4");
  });
  it.each(["v0.6.4", "0.6", "0.6.4-beta", "01.0.0"])(
    "rejeita versão não aprovada %s",
    (version) => expect(() => compareVersions(version, "0.6.3")).toThrow(),
  );
  it.each(["0.6.3", "0.6.2"])("exige incremento no PR: %s", (version) =>
    expect(() =>
      validatePackageVersion(
        { version },
        { version, packages: { "": { version } } },
        "0.6.3",
      ),
    ).toThrow(/maior/),
  );
  it("recusa lockfile divergente", () =>
    expect(() =>
      validatePackageVersion({ version: "0.6.4" }, { version: "0.6.3" }),
    ).toThrow(/mesma versão/));
  it("conserva título, PR e commit sem executar conteúdo do título", () => {
    expect(release.message).toBe(
      `feat: automatizar publicação (#2; commit ${sha})`,
    );
    expect(
      releaseMessage("fix: tratar $(comando) e `texto`", 3, sha),
    ).toContain("$(comando)");
    const message = releaseMessage(`feat: ${"á".repeat(1000)}`, 2, sha);
    expect(Buffer.byteLength(message)).toBeLessThan(512);
    expect(message.endsWith(`commit ${sha})`)).toBe(true);
  });
  it.each(["chore: mudança", "feat: texto\ncom outra linha", "sem padrão"])(
    "recusa título %s",
    (title) => expect(() => releaseMessage(title, 2, sha)).toThrow(),
  );
  it("não move tags ou retorna a uma versão anterior", () => {
    expect(() =>
      deploymentDecision(release.tag, sha, live().version, otherSha),
    ).toThrow(/outro commit/);
    expect(() =>
      deploymentDecision(release.tag, sha, live("v0.7.0").version, null),
    ).toThrow(/antigo bloqueado/);
    expect(() =>
      deploymentDecision(release.tag, sha, live(release.tag).version, null),
    ).toThrow(/outro commit/);
    expect(deploymentDecision(release.tag, sha, confirmed().version, sha)).toBe(
      "already-live",
    );
  });
  it("rejeita migração pendente, remota extra ou repetida", () => {
    expect(() =>
      checkMigrationNames(["0001_a.sql", "0002_b.sql"], ["0001_a.sql"]),
    ).toThrow();
    expect(() =>
      checkMigrationNames(["0001_a.sql"], ["0001_a.sql", "0002_b.sql"]),
    ).toThrow();
    expect(() =>
      checkMigrationNames(["0001_a.sql"], ["0001_a.sql", "0001_a.sql"]),
    ).toThrow();
    expect(() =>
      checkMigrationNames(
        ["0001_a.sql", "0002_b.sql"],
        ["0002_b.sql", "0001_a.sql"],
      ),
    ).not.toThrow();
  });
});
describe("falhas e repetição da publicação sem serviços reais", () => {
  it("confirma versão ativa antes de criar tag e limpa pacote", async () => {
    const h = setup();
    h.cloudflare.active
      .mockResolvedValueOnce(live())
      .mockResolvedValueOnce(live())
      .mockResolvedValueOnce(confirmed());
    await publishRelease(h);
    expect(h.record).toMatchObject({
      status: "deployed",
      confirmed: { versionId: "nova", traffic: 100 },
    });
    expect(h.upload).toHaveBeenCalledOnce();
    expect(h.cleanup).toHaveBeenCalledOnce();
    expect(h.github.createTag).toHaveBeenCalledWith(release.tag, sha);
    expect(h.github.createTag.mock.invocationCallOrder[0]).toBeGreaterThan(
      h.cloudflare.active.mock.invocationCallOrder.at(-1),
    );
  });
  it("migração pendente bloqueia antes de build e upload", async () => {
    const h = setup();
    h.cloudflare.migrations.mockResolvedValue([]);
    await expect(publishRelease(h)).rejects.toThrow(/Migrações/);
    expect(h.prepare).not.toHaveBeenCalled();
    expect(h.upload).not.toHaveBeenCalled();
    expect(h.github.createTag).not.toHaveBeenCalled();
  });
  it("falha de permissão D1 bloqueia sem tentar modificar banco", async () => {
    const h = setup();
    h.cloudflare.migrations.mockRejectedValue(new Error("HTTP 403"));
    await expect(publishRelease(h)).rejects.toThrow("HTTP 403");
    expect(h.upload).not.toHaveBeenCalled();
  });
  it("build falho não envia nem cria tag", async () => {
    const h = setup();
    h.prepare.mockRejectedValue(new Error("build falhou"));
    await expect(publishRelease(h)).rejects.toThrow("build falhou");
    expect(h.upload).not.toHaveBeenCalled();
    expect(h.github.createTag).not.toHaveBeenCalled();
  });
  it("upload com resultado incerto não é repetido automaticamente e limpa pacote", async () => {
    const h = setup();
    h.upload.mockRejectedValue(new Error("resultado incerto"));
    await expect(publishRelease(h)).rejects.toThrow("resultado incerto");
    expect(h.record.uploadAttempted).toBe(true);
    expect(h.upload).toHaveBeenCalledOnce();
    expect(h.cleanup).toHaveBeenCalledOnce();
    expect(h.github.createTag).not.toHaveBeenCalled();
  });
  it("falha na tag preserva identificação do deploy já confirmado", async () => {
    const h = setup();
    h.cloudflare.active
      .mockResolvedValueOnce(live())
      .mockResolvedValueOnce(live())
      .mockResolvedValueOnce(confirmed());
    h.github.createTag.mockRejectedValue(new Error("tag indisponível"));
    await expect(publishRelease(h)).rejects.toThrow("tag indisponível");
    expect(h.record).toMatchObject({
      status: "deployed-tag-pending",
      confirmed: { versionId: "nova" },
    });
  });
  it("nova execução após deploy apenas completa tag sem publicar novamente", async () => {
    const h = setup();
    h.cloudflare.active.mockResolvedValue(confirmed());
    await publishRelease(h);
    expect(h.record.status).toBe("already-live");
    expect(h.upload).not.toHaveBeenCalled();
    expect(h.prepare).not.toHaveBeenCalled();
    expect(h.github.createTag).toHaveBeenCalledOnce();
  });
  it.each(["antes", "depois"])(
    "commit superado %s do build não publica",
    async (stage) => {
      const h = setup();
      if (stage === "antes") h.github.head.mockResolvedValue(otherSha);
      else
        h.github.head
          .mockResolvedValueOnce(sha)
          .mockResolvedValueOnce(otherSha);
      await publishRelease(h);
      expect(h.record.status).toBe("superseded");
      expect(h.upload).not.toHaveBeenCalled();
      expect(h.github.createTag).not.toHaveBeenCalled();
      if (stage === "depois") expect(h.cleanup).toHaveBeenCalledOnce();
    },
  );
  it("produção alterada durante build bloqueia o envio", async () => {
    const h = setup();
    h.cloudflare.active
      .mockResolvedValueOnce(live())
      .mockResolvedValueOnce(live("v0.6.3", "Outra publicação", "externa"));
    await expect(publishRelease(h)).rejects.toThrow(/mudou durante/);
    expect(h.upload).not.toHaveBeenCalled();
    expect(h.cleanup).toHaveBeenCalledOnce();
  });
  it("resultado ativo diferente não recebe tag de sucesso", async () => {
    const h = setup();
    await expect(publishRelease(h)).rejects.toThrow(/não confirmada/);
    expect(h.github.createTag).not.toHaveBeenCalled();
  });
});
describe("contratos de API do CI", () => {
  it("consulta apenas nomes das migrações por SQL fixo, sem escrita", async () => {
    const request = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        result: [{ success: true, results: [{ name: "0001_initial.sql" }] }],
      }),
    );
    const api = cloudflareClient(
      { account_id: "a".repeat(32), name: "cantina-contabil" },
      "token-sintetico",
      request,
    );
    expect(await api.migrations("id-sintetico")).toEqual(["0001_initial.sql"]);
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      sql: "SELECT name FROM d1_migrations ORDER BY name",
    });
    expect(request.mock.calls[0][1].redirect).toBe("error");
  });
  it.each([401, 403, 500])(
    "não expõe resposta privada no erro HTTP %s",
    async (status) => {
      await expect(
        requestJson(
          "https://api.cloudflare.com/test",
          "segredo",
          z.object({}),
          {},
          async () => new Response("payload-privado", { status }),
        ),
      ).rejects.toThrow(`falha HTTP ${status}`);
    },
  );
  it("recusa payload inválido e sucesso falso sem expor dados", async () => {
    for (const body of [
      { success: false, result: "privado" },
      { success: true, result: { secret: "privado" } },
    ])
      await expect(
        requestJson(
          "https://api.cloudflare.com/test",
          "segredo",
          z.object({ id: z.string() }),
          {},
          async () => Response.json(body),
        ),
      ).rejects.toThrow(/omitido/);
  });
  it("não permite destino diferente das APIs aprovadas", async () => {
    const request = vi.fn();
    await expect(
      requestJson(
        "https://example.invalid",
        "segredo",
        z.unknown(),
        {},
        request,
      ),
    ).rejects.toThrow(/não autorizado/);
    expect(request).not.toHaveBeenCalled();
  });
  it("tráfego dividido não é tratado como publicação integral", async () => {
    const request = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        result: {
          deployments: [
            {
              id: "deploy",
              versions: [
                { percentage: 50, version_id: "a" },
                { percentage: 50, version_id: "b" },
              ],
            },
          ],
        },
      }),
    );
    await expect(
      cloudflareClient(
        { account_id: "a".repeat(32), name: "cantina-contabil" },
        "token",
        request,
      ).active(),
    ).rejects.toThrow(/100%/);
  });
});

describe("safe failure diagnostics", () => {
  it("identifies a failed API recheck after the build without starting upload", async () => {
    const h = setup();
    const cause = Object.assign(new Error("private socket payload"), {
      code: "UND_ERR_SOCKET",
    });
    const error = new TypeError("private fetch payload", { cause });
    h.github.head.mockResolvedValueOnce(sha).mockRejectedValueOnce(error);
    await expect(publishRelease(h)).rejects.toBe(error);
    expect(h.record).toMatchObject({
      phase: "recheck-main",
      uploadAttempted: false,
    });
    expect(h.cleanup).toHaveBeenCalledOnce();
    expect(h.upload).not.toHaveBeenCalled();
    expect(h.github.createTag).not.toHaveBeenCalled();
  });
  it.each(["recheck-migrations", "recheck-production"])(
    "records %s separately from the build",
    async (phase) => {
      const h = setup();
      const error = new TypeError("private response");
      if (phase === "recheck-migrations")
        h.cloudflare.migrations
          .mockResolvedValueOnce(["0001_initial.sql"])
          .mockRejectedValueOnce(error);
      else
        h.cloudflare.active
          .mockResolvedValueOnce(live())
          .mockRejectedValueOnce(error);
      await expect(publishRelease(h)).rejects.toBe(error);
      expect(h.record.phase).toBe(phase);
      expect(h.record.uploadAttempted).toBe(false);
      expect(h.upload).not.toHaveBeenCalled();
    },
  );
});
