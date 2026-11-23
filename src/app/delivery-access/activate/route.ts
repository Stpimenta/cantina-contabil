import { cookies } from "next/headers";
import { BusinessError } from "@/shared/errors/business-error";
import { executeOperation } from "@/shared/errors/execute-operation";
import { isActivationOriginAllowed } from "@/server/canteen/infrastructure/activation-origin";
import { commandResponse } from "@/server/canteen/infrastructure/http-response";
import { createDeliveries } from "@/server/deliveries/composition";
import { deliveryCookieName } from "@/server/deliveries/infrastructure/http-identity";
export async function POST(request: Request) {
  const result = await executeOperation(
    {
      operation: "deliveries.activate",
      message: "Não foi possível ativar o acesso.",
      source: "src/app/delivery-access/activate/route.ts",
      route: "/delivery-access/activate",
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
      const value = await createDeliveries().activate.execute(
        body.secret,
        jar.get(deliveryCookieName)?.value,
      );
      jar.set(deliveryCookieName, value.credential, {
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
