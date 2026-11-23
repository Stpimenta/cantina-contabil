import { PageTransition } from "@/components/layout/page-transition";
export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}
