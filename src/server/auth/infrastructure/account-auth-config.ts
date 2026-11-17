import "server-only";
import { z } from "zod";
import { InfrastructureError } from "@/shared/errors/infrastructure-error";
const origin = z.url().refine((value) => {
  const u = new URL(value);
  return (
    !u.username && !u.password && !u.search && !u.hash && u.pathname === "/"
  );
});
const schema = z.object({
  SUPABASE_URL: origin.refine((v) => new URL(v).protocol === "https:"),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  APP_URL: origin,
});
export function accountAuthConfig() {
  const parsed = schema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    APP_URL: process.env.APP_URL,
  });
  if (!parsed.success)
    throw new InfrastructureError(
      "Configuração de autenticação incompleta",
      "account-auth",
    );
  const app = new URL(parsed.data.APP_URL);
  if (
    app.protocol !== "https:" &&
    !(
      process.env.APP_ENV !== "production" &&
      app.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(app.hostname)
    )
  )
    throw new InfrastructureError(
      "Origem de autenticação inválida",
      "account-auth",
    );
  return {
    projectUrl: parsed.data.SUPABASE_URL,
    publishableKey: parsed.data.SUPABASE_PUBLISHABLE_KEY,
    secretKey: parsed.data.SUPABASE_SECRET_KEY,
    redirectTo: new URL("/auth/confirm", app).toString(),
  };
}
