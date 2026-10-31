import { presentBusinessFailure } from "@/presentation/errors/present-business-failure";
import { failure, type Result } from "./application-error";
import { InfrastructureError } from "./infrastructure-error";
import { BusinessError } from "./business-error";
import { logFailure } from "../logging/logger";

export function handleFailure<T>(
  operation: string,
  message: string,
  error: unknown,
  context: Record<string, string | number> = {},
): Result<T> {
  if (error instanceof BusinessError)
    return failure(presentBusinessFailure(error.details));
  const reference = crypto.randomUUID();
  logFailure(operation, reference, error, context);
  return failure({
    code:
      error instanceof InfrastructureError
        ? "SERVICE_UNAVAILABLE"
        : "UNEXPECTED_ERROR",
    category:
      error instanceof InfrastructureError ? "unavailable" : "unexpected",
    message,
    reference,
  });
}
