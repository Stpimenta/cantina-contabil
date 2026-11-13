import { BusinessError } from "@/shared/errors/business-error";
import { isActivationOriginAllowed } from "@/server/canteen/infrastructure/activation-origin";
import { cookies } from "next/headers";
import { createCanteen } from "@/server/canteen/composition";
import { temporaryCookieName } from "@/server/canteen/infrastructure/http-identity";
import { commandResponse } from "@/server/canteen/infrastructure/http-response";
import { executeOperation } from "@/shared/errors/execute-operation";
export async function POST(request: Request) {
  const result = await executeOperation(
    {
      operation: "canteen.activate",
      message: "Não foi possível ativar o acesso.",
      source: "src/app/command-access/activate/route.ts",
      route: "/command-access/activate",
      method: "POST",
    },
    async () => {
      if (
        !isActivationOriginAllowed(
          request,
          process.env.NODE_ENV === "production",
        )
      )
        throw new BusinessError({
          code: "ACCESS_DENIED",
          category: "forbidden",
        });
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
