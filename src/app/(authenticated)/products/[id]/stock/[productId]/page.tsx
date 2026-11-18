import { redirect } from "next/navigation";
export default async function StockEntriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; productId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id, productId } = await params;
  const query = await searchParams;
  const next = new URLSearchParams({ stock: productId });
  if (query.page) next.set("stockPage", query.page);
  redirect(`/products/${id}?${next}`);
}
