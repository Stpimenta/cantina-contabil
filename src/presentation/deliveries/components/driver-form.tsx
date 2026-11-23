"use client";
import { useId, useState } from "react";
import type { Driver } from "@/server/deliveries/models/driver.model";
import { validateDriver } from "@/server/deliveries/inputs/delivery.input";
import { saveDriverAction } from "@/server/deliveries/actions/save-driver.action";
import { createRequestId } from "@/shared/identifiers/request-id";
import { Field } from "@/components/ui/field";
import { BrazilianMaskedField } from "@/components/ui/brazilian-masked-field";
import { DeliveryForm } from "./delivery-form";
export function DriverForm({
  eventId,
  driver: initialValue,
  onClose,
}: {
  eventId: string;
  driver?: Driver;
  onClose: () => void;
}) {
  const [driver] = useState(initialValue);
  const id = useId(),
    [requestId] = useState(createRequestId),
    [driverId] = useState(() => driver?.id ?? createRequestId()),
    [name, setName] = useState(driver?.name ?? ""),
    [phone, setPhone] = useState(driver?.phone ?? "");
  const input = {
    id: driverId,
    requestId,
    version: driver?.version ?? 0,
    name,
    phone,
  };
  return (
    <DeliveryForm
      title={driver ? "Editar entregador" : "Cadastrar entregador"}
      input={input}
      dirty={name !== (driver?.name ?? "") || phone !== (driver?.phone ?? "")}
      validate={validateDriver}
      fieldIds={{ name: `${id}-name`, phone: `${id}-phone` }}
      save={() => saveDriverAction(eventId, input)}
      onClose={onClose}
    >
      {(fields, pending) => (
        <>
          <Field
            id={`${id}-name`}
            label="Nome"
            value={name}
            maxLength={100}
            disabled={pending}
            error={fields?.name}
            onChange={(e) => setName(e.target.value)}
          />
          <BrazilianMaskedField
            kind="phone"
            id={`${id}-phone`}
            label="Telefone (opcional)"
            value={phone}
            onValueChange={setPhone}
            disabled={pending}
            error={fields?.phone}
          />
        </>
      )}
    </DeliveryForm>
  );
}
