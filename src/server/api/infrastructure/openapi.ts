import { z } from "zod";
import { createDocument } from "zod-openapi";
import {
  commandIdSchema,
  commandQuerySchema,
} from "@/server/canteen/inputs/command.input";
import {
  commandResponseSchema,
  commandPageSchema,
  commandWindowSchema,
} from "@/server/canteen/inputs/command-response.schema";
const failure = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    category: z.string(),
    message: z.string(),
    reference: z.string().optional(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});
const result = <T extends z.ZodType>(schema: T) =>
  z.object({ ok: z.literal(true), value: schema });
const content = (schema: z.ZodType) => ({ "application/json": { schema } });
const errors = {
  400: { description: "Entrada inválida", content: content(failure) },
  401: {
    description: "Sessão ausente, expirada ou acesso revogado",
    content: content(failure),
  },
  403: {
    description: "Perfil ou evento fora do escopo do acesso",
    content: content(failure),
  },
  404: { description: "Evento indisponível", content: content(failure) },
  409: {
    description: "Evento não está na modalidade Cantina",
    content: content(failure),
  },
  500: {
    description: "Falha inesperada com referência segura",
    content: content(failure),
  },
  503: {
    description: "Serviço temporariamente indisponível",
    content: content(failure),
  },
};
// Same input schemas used by the use cases; documentation contains no business implementation.
export function createOpenApiDocument(version: string) {
  return createDocument({
    openapi: "3.1.0",
    info: {
      title: "Ministério Contábil — API de comandas",
      version,
      description:
        "Consultas autenticadas por cookie de sessão. Não aceita bearer externo. Gravações continuam nas Server Actions. Acesso temporário limitado ao próprio evento; documentação exige login normal.",
    },
    servers: [{ url: "/" }],
    security: [{ appSession: [] }, { commandAccess: [] }],
    components: {
      securitySchemes: {
        appSession: {
          type: "apiKey",
          in: "cookie",
          name: "__Host-cantina-account",
          description:
            "Sessão opaca do login normal (cantina-account em desenvolvimento), validada no D1 com 12h de inatividade.",
        },
        commandAccess: {
          type: "apiKey",
          in: "cookie",
          name: "__Host-cantina-command-access",
          description:
            "Sessão temporária revogável do navegador (cantina-command-access em desenvolvimento).",
        },
      },
    },
    paths: {
      "/api/events/{id}/commands": {
        get: {
          operationId: "listCommands",
          summary: "Consultar página de comandas",
          requestParams: {
            path: z.object({ id: commandIdSchema }),
            query: commandQuerySchema,
          },
          responses: {
            200: {
              description:
                "Página com no máximo 15 pedidos, mais antigos primeiro",
              content: content(result(commandPageSchema)),
            },
            ...errors,
          },
        },
      },
      "/api/events/{id}/commands/{orderId}": {
        get: {
          operationId: "getCommand",
          summary: "Consultar pedido afetado",
          description:
            "Sem window retorna somente o pedido (null se excluído/ausente/fora do evento). Com window=1 inclui IDs da janela atual e contagem; novos IDs são buscados individualmente.",
          requestParams: {
            path: z.object({ id: commandIdSchema, orderId: commandIdSchema }),
            query: commandQuerySchema.extend({
              window: z.literal("1").optional(),
            }),
          },
          responses: {
            200: {
              description: "Pedido mínimo e metadados opcionais da janela",
              content: content(
                z.union([
                  result(commandResponseSchema.nullable()),
                  result(commandWindowSchema),
                ]),
              ),
            },
            ...errors,
          },
        },
      },
    },
  });
}
