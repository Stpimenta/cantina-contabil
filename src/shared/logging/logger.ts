import { DrizzleQueryError } from "drizzle-orm/errors";
import { InfrastructureError } from "../errors/infrastructure-error";
import { BusinessError } from "../errors/business-error";

const sensitive =
  /password|senha|token|secret|authorization|cookie|cpf|email|gmail|body|credential|telefone|phone|birth|nascimento|donor|note|observacao/i;
const redactText = (value: string) =>
  value
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[REDACTED_JWT]",
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(
      /((?:password|senha|secret|token|authorization|cookie)\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1[REDACTED]",
    )
    .replace(/https?:\/\/[^\s"'<>]+/g, (text) => {
      try {
        const url = new URL(text);
        return `${url.origin}${url.pathname}`;
      } catch {
        return "[REDACTED_URL]";
      }
    });

function safeContext(context: Record<string, string | number>) {
  return Object.fromEntries(
    Object.entries(context)
      .filter(([key]) => !sensitive.test(key))
      .map(([key, value]) => [
        key,
        typeof value === "string" ? redactText(value) : value,
      ]),
  );
}

export function serializeError(
  error: unknown,
  depth = 0,
): Record<string, unknown> {
  if (depth > 5) return { message: "Cadeia de causas limitada" };
  if (!(error instanceof Error)) {
    // Não serializar objetos arbitrários que possam conter credenciais ou dados pessoais.
    return {
      type: error === null ? "null" : typeof error,
      message:
        typeof error === "string"
          ? redactText(error)
          : "Falha sem objeto Error",
    };
  }
  const technical = error as Error & Record<string, unknown>;
  const details = Object.fromEntries(
    ["code", "errno", "syscall", "address", "port"].flatMap((key) => {
      const value = technical[key];
      return typeof value === "string" || typeof value === "number"
        ? [[key, typeof value === "string" ? redactText(value) : value]]
        : [];
    }),
  );
  return {
    type: error.name,
    message:
      error instanceof DrizzleQueryError
        ? "Falha ao executar consulta no banco"
        : error instanceof SyntaxError
          ? "Falha de sintaxe ao interpretar dados; conteúdo omitido"
          : redactText(error.message),
    stack:
      error instanceof DrizzleQueryError
        ? undefined
        : error instanceof SyntaxError
          ? error.stack
              ?.split("\n")
              .filter((line) => /^\s+at .+:\d+:\d+\)?$/.test(line))
              .map(redactText)
              .join("\n") || undefined
          : error.stack
            ? redactText(error.stack)
            : undefined,
    ...details,
    ...(error instanceof InfrastructureError
      ? {
          service: error.service,
          status: error.status,
          details: error.details ? safeContext(error.details) : undefined,
        }
      : {}),
    ...(error.cause !== undefined
      ? { cause: serializeError(error.cause, depth + 1) }
      : {}),
    ...(error instanceof AggregateError
      ? {
          errors: error.errors
            .slice(0, 10)
            .map((item) => serializeError(item, depth + 1)),
        }
      : {}),
  };
}

export function logFailure(
  operation: string,
  reference: string,
  error: unknown,
  context: Record<string, string | number> = {},
) {
  if (error instanceof BusinessError) return;
  const safe = safeContext(context);
  const diagnostic = serializeError(error);
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      environment: process.env.APP_ENV ?? "development",
      operation,
      source: safe.source,
      route: safe.route,
      method: safe.method,
      reason: diagnostic.message,
      code:
        error instanceof InfrastructureError
          ? "SERVICE_UNAVAILABLE"
          : "UNEXPECTED_ERROR",
      reference,
      context: safe,
      error: diagnostic,
    }),
  );
}
