import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth/composition";
import { createUsers } from "@/server/users/composition";
import { executeOperation } from "@/shared/errors/execute-operation";
import { PageFailure } from "@/components/ui/page-failure";
import { UserList } from "@/presentation/users/components/user-list";
export const metadata = { title: "Usuários" };
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await createAuth().getSession.execute();
  if (!session) redirect("/login");
  if (session.role === "operator" || session.role === "finance") redirect("/");
  const params = await searchParams;
  const result = await executeOperation(
    {
      operation: "users.list",
      message: "Não foi possível carregar os usuários.",
      source: "src/app/(authenticated)/users/page.tsx",
      route: "/users",
      method: "GET",
    },
    () =>
      createUsers().list.execute(session, {
        query: params.q,
        page: params.page,
      }),
  );
  return result.ok ? (
    <UserList data={result.value} />
  ) : (
    <PageFailure error={result.error} />
  );
}
