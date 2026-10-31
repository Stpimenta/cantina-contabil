"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationError } from "@/shared/errors/application-error";
import { ErrorModal } from "../modals/error-modal";
import { Button } from "./button";
export function PageFailure({ error }: { error: ApplicationError }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  return (
    <div className="stack">
      <p>{error.message}</p>
      <div className="action-group">
        <Button variant="neutral" onClick={() => router.refresh()}>
          Tentar novamente
        </Button>
      </div>
      <ErrorModal error={open ? error : null} onClose={() => setOpen(false)} />
    </div>
  );
}
