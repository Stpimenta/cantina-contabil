import { ReleaseError } from "./release-error.mjs";
import { z } from "zod";
const envelope = z.object({ success: z.literal(true), result: z.unknown() });
export async function requestJson(
  url,
  token,
  schema,
  { method = "GET", body, optional404 = false } = {},
  request = fetch,
) {
  if (!token)
    throw new ReleaseError(
      "Credencial necessária não configurada no ambiente do Actions.",
    );
  const destination = new URL(url);
  const service = destination.hostname;
  if (
    destination.protocol !== "https:" ||
    destination.username ||
    destination.password ||
    !["api.github.com", "api.cloudflare.com"].includes(service)
  )
    throw new ReleaseError("Destino de API não autorizado.");
  const response = await request(url, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(service === "api.github.com"
        ? { "X-GitHub-Api-Version": "2022-11-28" }
        : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 404 && optional404) return null;
  if (!response.ok)
    throw new ReleaseError(
      `${service}: falha HTTP ${response.status}; conferir permissão e configuração. Resposta privada omitida.`,
    );
  let value = await response.json();
  if (service === "api.cloudflare.com") {
    const parsed = envelope.safeParse(value);
    if (!parsed.success)
      throw new ReleaseError(
        "Resposta Cloudflare inválida ou operação recusada; conteúdo omitido.",
      );
    value = parsed.data.result;
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new ReleaseError(
      `Contrato de resposta inválido em ${service}; conteúdo omitido.`,
    );
  return parsed.data;
}
const identifier = z.string().min(1);
export const gitRefSchema = z.object({
  object: z.object({
    type: z.literal("commit"),
    sha: z.string().regex(/^[a-f0-9]{40}$/),
  }),
});
export const deploymentSchema = z.object({
  id: identifier,
  versions: z
    .array(
      z.object({
        percentage: z.number().min(0).max(100),
        version_id: identifier,
      }),
    )
    .min(1),
});
export const versionSchema = z.object({
  id: identifier,
  annotations: z.record(z.string(), z.string()).optional(),
});
export function cloudflareClient(config, token, request) {
  const base = `https://api.cloudflare.com/client/v4/accounts/${config.account_id}`;
  const worker = `${base}/workers/scripts/${encodeURIComponent(config.name)}`;
  const call = (url, schema, options) =>
    requestJson(url, token, schema, options, request);
  return {
    async active() {
      const { deployments } = await call(
        `${worker}/deployments`,
        z.object({ deployments: z.array(deploymentSchema).min(1) }),
      );
      const deployment = deployments[0];
      if (
        deployment.versions.length !== 1 ||
        deployment.versions[0].percentage !== 100
      )
        throw new ReleaseError(
          "Produção não está em uma única versão com 100% do tráfego; conferir manualmente.",
        );
      const version = await call(
        `${worker}/versions/${encodeURIComponent(deployment.versions[0].version_id)}`,
        versionSchema,
      );
      if (version.id !== deployment.versions[0].version_id)
        throw new ReleaseError("Identidade da versão Cloudflare divergente.");
      return { deployment, version };
    },
    async migrations(databaseId) {
      const results = await call(
        `${base}/d1/database/${databaseId}/query`,
        z
          .array(
            z.object({
              success: z.literal(true),
              results: z.array(
                z.object({ name: z.string().regex(/^\d{4}_[a-z0-9_]+\.sql$/) }),
              ),
            }),
          )
          .length(1),
        {
          method: "POST",
          body: { sql: "SELECT name FROM d1_migrations ORDER BY name" },
        },
      );
      return results[0].results.map((row) => row.name);
    },
  };
}
