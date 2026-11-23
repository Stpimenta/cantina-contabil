"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function RefreshDeliveries() {
  const router = useRouter(),
    [pending, start] = useTransition();
  return (
    <Button
      variant="neutral"
      busy={pending}
      onClick={() => start(() => router.refresh())}
    >
      Atualizar rotas
    </Button>
  );
}
