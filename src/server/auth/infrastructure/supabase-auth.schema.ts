import { z } from "zod";

export const supabaseIdentitySchema = z.object({
  id: z.uuid(),
  email: z.email().max(254),
  email_confirmed_at: z.iso.datetime({ offset: true }).nullish(),
});

export const supabaseTokensSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.literal("bearer"),
  expires_in: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  user: supabaseIdentitySchema,
});

export const supabaseErrorSchema = z.object({
  error_code: z.string().optional(),
  code: z.string().optional(),
});

export const supabaseUserListSchema = z.object({
  users: z.array(
    z.object({
      id: z.uuid(),
      email: z.string().nullish(),
      email_confirmed_at: z.iso.datetime({ offset: true }).nullish(),
    }),
  ),
});
