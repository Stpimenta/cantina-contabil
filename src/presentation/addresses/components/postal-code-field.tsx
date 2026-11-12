"use client";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { BrazilianMaskedField } from "@/components/ui/brazilian-masked-field";
import { ErrorModal } from "@/components/modals/error-modal";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { lookupPostalCodeAction } from "@/server/addresses/actions/lookup-postal-code.action";
import type { PostalAddress } from "@/server/addresses/models/postal-address.model";

type Props = Omit<ComponentProps<typeof BrazilianMaskedField>, "kind"> & {
  active: boolean;
  onAddressFound: (address: PostalAddress) => void;
};
export function PostalCodeField({
  active,
  onAddressFound,
  onValueChange,
  ...props
}: Props) {
  const [lookup, setLookup] = useState<string | null>(null);
  useEffect(() => {
    if (!active) setLookup(null);
  }, [active]);
  return (
    <div>
      <BrazilianMaskedField
        {...props}
        kind="postalCode"
        onValueChange={(value) => {
          onValueChange(value);
          const digits = value.replace(/\D/g, "");
          setLookup(digits.length === 8 ? digits : null);
        }}
      />
      {active && lookup && (
        <PostalCodeLookup
          key={lookup}
          postalCode={lookup}
          onAddressFound={onAddressFound}
        />
      )}
    </div>
  );
}
function PostalCodeLookup({
  postalCode,
  onAddressFound,
}: {
  postalCode: string;
  onAddressFound: (address: PostalAddress) => void;
}) {
  // Snapshot the callback when this CEP was entered. Unmounting discards late results/errors.
  const receive = useRef(onAddressFound);
  const started = useRef(false);
  const [outcome, setOutcome] = useState<"found" | "notFound" | null>(null);
  const { execute, pending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.",
  });
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    execute(
      () => lookupPostalCodeAction({ postalCode }),
      (address) => {
        if (address) {
          receive.current(address);
          setOutcome("found");
        } else setOutcome("notFound");
      },
    );
  }, []);
  return (
    <>
      <span className="sr-only" role="status">
        {pending
          ? "Consultando CEP."
          : outcome === "found"
            ? "Consulta concluída. Confira os campos do endereço."
            : ""}
      </span>
      {outcome === "notFound" && (
        <p className="muted" role="status">
          CEP não encontrado. Preencha o endereço manualmente.
        </p>
      )}
      <ErrorModal error={error} onClose={closeError} />
    </>
  );
}
