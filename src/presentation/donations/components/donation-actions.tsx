"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { DonationFormModal } from "@/components/modals/donation-form-modal";
export function DonationActions({
  cashBoxes,
  today,
}: {
  cashBoxes: { id: string; name: string }[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const notify = useToast();
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setOpen(true)}>Nova doação</Button>
      {open && (
        <DonationFormModal
          cashBoxes={cashBoxes}
          today={today}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            notify("Doação registrada.");
            router.refresh();
          }}
        />
      )}
    </>
  );
}
