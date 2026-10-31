import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { AppShell } from "@/components/layout/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");

  return <AppShell session={session}>{children}</AppShell>;
}
