import { PageTransition } from "@/components/layout/page-transition";
export default function TabletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}
