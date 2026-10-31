export const allowedRoles = ["root", "admin", "tesouraria"] as const;
export type Role = (typeof allowedRoles)[number];
export const isAllowedRole = (value: unknown): value is Role =>
  typeof value === "string" && allowedRoles.some((role) => role === value);

export const roleLabels: Record<Role, string> = {
  root: "Root",
  admin: "Administrador",
  tesouraria: "Tesouraria",
};
