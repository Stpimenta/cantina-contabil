import { cookies } from "next/headers";
import { createCanteen } from "@/server/canteen/composition";
import { temporaryCookieName } from "@/server/canteen/infrastructure/http-identity";
import { commandResponse } from "@/server/canteen/infrastructure/http-response";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function POST(request: Request) {
  if (request.headers.get("Origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  const result = await executeOperation(
    {
      operation: "canteen.activate",
      message: "Não foi possível ativar o acesso.",
      source: "src/app/acesso-comandas/ativar/route.ts",
      route: "/acesso-comandas/ativar",
      method: "POST",
    },
    async () => {
      const body = await request.json(),
        jar = await cookies();
      const value = await createCanteen().activate.execute(
        body.secret,
        jar.get(temporaryCookieName)?.value,
      );
      jar.set(temporaryCookieName, value.credential, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        expires: new Date(value.access.expiresAt * 1000),
      });
      return { eventId: value.access.eventId };
    },
  );
  return commandResponse(result);
}
