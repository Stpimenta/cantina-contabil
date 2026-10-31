export type ErrorCategory =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unavailable"
  | "unexpected";

export interface ApplicationError {
  code: string;
  category: ErrorCategory;
  message: string;
  reference?: string;
  fields?: Partial<Record<string, string>>;
}

export type Result<T> =
  { ok: true; value: T } | { ok: false; error: ApplicationError };

export const success = <T>(value: T): Result<T> => ({ ok: true, value });
export const failure = <T = never>(error: ApplicationError): Result<T> => ({
  ok: false,
  error,
});
