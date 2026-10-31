import "server-only";
import { unstable_rethrow } from "next/navigation";
import { success, type Result } from "./application-error";
import { handleFailure } from "./handle-failure";

type OperationContext = Record<string, string | number>;
interface OperationOptions {
  operation: string;
  message: string;
  source: string;
  route: string;
  method: "GET" | "POST";
  context?: OperationContext;
}

// Única captura de entrada: use cases retornam valores e lançam erros tipados.
export async function executeOperation<T>(
  options: OperationOptions,
  execute: (context: OperationContext) => T | Promise<T>,
): Promise<Result<T>> {
  const context = { ...options.context };
  try {
    return success(await execute(context));
  } catch (error) {
    // redirect/notFound e sinais internos do Next não são falhas da aplicação.
    unstable_rethrow(error);
    return handleFailure(options.operation, options.message, error, {
      ...context,
      source: options.source,
      route: options.route,
      method: options.method,
    });
  }
}
