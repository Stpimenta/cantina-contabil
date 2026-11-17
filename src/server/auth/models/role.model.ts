export const externalRoles = ["root", "admin", "tesouraria"] as const;
export const allowedRoles = [...externalRoles, "finance", "operator"] as const;
export type Role = (typeof allowedRoles)[number];
export const isAllowedRole = (value: unknown): value is Role =>
  typeof value === "string" && allowedRoles.some((role) => role === value);

export const roleLabels: Record<Role, string> = {
  operator: "Operador",
  finance: "Financeiro",
  root: "Root",
  admin: "Administrador",
  tesouraria: "Tesouraria",
};
