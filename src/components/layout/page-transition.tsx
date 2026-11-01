"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  RouteLoading,
  loadingAreaForPath,
  type LoadingArea,
} from "./route-loading";

// Mínimo aprovado para avaliação em todos os ambientes.
const MINIMUM_LOADING_MS = 300;

function PageContent({
  children,
  area,
}: {
  children: ReactNode;
  area: LoadingArea;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), MINIMUM_LOADING_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return <RouteLoading area={area} />;
  return <div>{children}</div>;
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <PageContent key={pathname} area={loadingAreaForPath(pathname)}>
      {children}
    </PageContent>
  );
}
