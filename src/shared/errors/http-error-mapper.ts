import type { ApplicationError, ErrorCategory } from "./application-error";

const statusByCategory: Record<ErrorCategory, number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unavailable: 503,
  unexpected: 500,
};

export function mapHttpError(error: ApplicationError) {
  return { status: statusByCategory[error.category], body: { error } };
}
