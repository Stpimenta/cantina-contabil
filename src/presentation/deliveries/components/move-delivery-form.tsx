"use client";
import { useId, useState } from "react";
import type { DeliveryRoute } from "@/server/deliveries/models/delivery-route.model";
import { validateMove } from "@/server/deliveries/inputs/delivery.input";
import { moveDeliveryAction } from "@/server/deliveries/actions/move-delivery.action";
import { createRequestId } from "@/shared/identifiers/request-id";
import { SelectField } from "@/components/ui/select-field";
import { DeliveryForm } from "./delivery-form";
export function MoveDeliveryForm({
  eventId,
  from,
  orderId,
  options,
  onClose,
}: {
  eventId: string;
  from: Pick<DeliveryRoute, "id" | "version">;
  orderId: string;
  options: Pick<DeliveryRoute, "id" | "name" | "version">[];
  onClose: () => void;
}) {
  const id = useId(),
    [requestId] = useState(createRequestId),
    [toId, setToId] = useState("");
  const input = {
    requestId,
    fromId: from.id,
    fromVersion: from.version,
    toId,
    toVersion: options.find((o) => o.id === toId)?.version ?? 0,
    orderId,
  };
  return (
    <DeliveryForm
      title="Mover entrega"
      input={input}
      dirty={!!toId}
      validate={validateMove}
      fieldIds={{ toId: id }}
      save={() => moveDeliveryAction(eventId, input)}
      onClose={onClose}
    >
      {(fields, pending) => (
        <SelectField
          id={id}
          label="Rota de destino"
          error={fields?.toId}
          disabled={pending}
          value={toId}
          onValueChange={setToId}
          options={[
            { value: "", label: "Selecione" },
            ...options
              .filter((o) => o.id !== from.id)
              .map((o) => ({ value: o.id, label: o.name })),
          ]}
        />
      )}
    </DeliveryForm>
  );
}
