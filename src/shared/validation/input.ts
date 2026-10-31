import type { z } from "zod";
import type {
  BusinessCode,
  BusinessFailure,
  ValidationIssue,
} from "@/shared/errors/business-failure";
import { throwBusinessError } from "@/shared/errors/business-error";

export type InputValidation<T> =
  { ok: true; value: T } | { ok: false; error: BusinessFailure };

// Do not expose Zod messages, raw inputs or its error object to presentation/logs.
export function validateInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
  code: BusinessCode,
  propertyIssues: Readonly<Partial<Record<string, ValidationIssue>>> = {},
): InputValidation<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  const issues: Partial<Record<string, ValidationIssue>> = {};
  for (const issue of result.error.issues) {
    const property = issue.path[0];
    if (typeof property === "string" && propertyIssues[property]) {
      issues[property] = propertyIssues[property];
      if (issue.path.length > 1)
        issues[issue.path.join(".")] = propertyIssues[property];
    }
  }
  return {
    ok: false,
    error: {
      code,
      category: "validation",
      ...(Object.keys(issues).length ? { issues } : {}),
    },
  };
}

export function parseInput<T>(result: InputValidation<T>): T {
  if (!result.ok) throwBusinessError(result.error);
  return result.value;
}
