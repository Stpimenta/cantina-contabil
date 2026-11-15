import { createAuth } from "@/server/auth/composition";
import { checkAccess } from "@/shared/auth/check-access";
import { executeOperation } from "@/shared/errors/execute-operation";
import { commandResponse } from "@/server/canteen/infrastructure/http-response";
import document from "@/server/api/generated/openapi.json";
// Generated before build; served only after normal login authorization.
export async function GET() {
  const authorization = await executeOperation(
    {
      operation: "api.spec",
      message: "Não foi possível abrir a documentação.",
      source: "src/app/api/openapi/route.ts",
      route: "/api/openapi",
      method: "GET",
    },
    async () => {
      checkAccess(await createAuth().getSession.execute());
      return true;
    },
  );
  return authorization.ok
    ? Response.json(document, {
        headers: { "Cache-Control": "private, no-store" },
      })
    : commandResponse(authorization);
}
