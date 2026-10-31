"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DonationFiltersModal } from "@/components/modals/donation-filters-modal";

export function DonationFilters(props: {
  cashBoxes: { id: string; name: string }[];
  years: number[];
  cashBoxId: string;
  year: string;
  query: string;
}) {
  const [open, setOpen] = useState(false);
  const count = Number(Boolean(props.cashBoxId)) + Number(Boolean(props.year));
  return (
    <>
      <Button
        variant="neutral"
        title="Filtros"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count ? `Filtros: ${count} ativos` : "Filtros"}
      >
        <Icon name="filter" />
        Filtros{count ? ` (${count})` : ""}
      </Button>
      {open && (
        <DonationFiltersModal {...props} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
