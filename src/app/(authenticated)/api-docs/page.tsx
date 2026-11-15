import { createAuth } from "@/server/auth/composition";
import { checkAccess } from "@/shared/auth/check-access";
import { ApiReference } from "@/presentation/api/api-reference";
export const metadata = { title: "Documentação da API" };
export default async function ApiDocsPage() {
  checkAccess(await createAuth().getSession.execute());
  return <ApiReference />;
}
