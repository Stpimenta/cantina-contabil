"use client";
import { useId, useState } from "react";
import type { Driver } from "@/server/deliveries/models/driver.model";
import type { DeliverySettings } from "@/server/deliveries/models/delivery-settings.model";
import {
  emptyOrderAddress,
  brazilianStates,
} from "@/server/events/inputs/order-delivery.input";
import { validateSettings } from "@/server/deliveries/inputs/delivery.input";
import { saveSettingsAction } from "@/server/deliveries/actions/save-settings.action";
import { createRequestId } from "@/shared/identifiers/request-id";
import { Field } from "@/components/ui/field";
import { FieldError } from "@/components/ui/field-error";
import { SelectField } from "@/components/ui/select-field";
import { BrazilianMaskedField } from "@/components/ui/brazilian-masked-field";
import { DeliveryForm } from "./delivery-form";
import styles from "./deliveries.module.css";
export function DeliverySettingsForm({
  eventId,
  settings: initialValue,
  drivers,
  onClose,
}: {
  eventId: string;
  settings: DeliverySettings | null;
  drivers: Driver[];
  onClose: () => void;
}) {
  const [settings] = useState(initialValue);
  const id = useId(),
    [requestId] = useState(createRequestId),
    [origin, setOrigin] = useState(settings?.origin ?? emptyOrderAddress),
    [driverIds, setDriverIds] = useState(settings?.driverIds ?? []);
  const input = {
    requestId,
    version: settings?.version ?? 0,
    origin,
    driverIds,
  };
  return (
    <DeliveryForm
      title="Organizar entregas"
      input={input}
      dirty={
        JSON.stringify({ origin, driverIds }) !==
        JSON.stringify({
          origin: settings?.origin ?? emptyOrderAddress,
          driverIds: settings?.driverIds ?? [],
        })
      }
      validate={validateSettings}
      fieldIds={{
        "origin.postalCode": `${id}-cep`,
        "origin.state": `${id}-state`,
        "origin.street": `${id}-street`,
        "origin.number": `${id}-number`,
        "origin.neighborhood": `${id}-neighborhood`,
        "origin.city": `${id}-city`,
        origin: `${id}-street`,
        driverIds: `${id}-drivers`,
      }}
      save={() => saveSettingsAction(eventId, input)}
      onClose={onClose}
    >
      {(fields, pending) => (
        <>
          <h3>Ponto de saída</h3>
          <div className="form-grid">
            <BrazilianMaskedField
              kind="postalCode"
              id={`${id}-cep`}
              label="CEP (opcional)"
              value={origin.postalCode}
              onValueChange={(postalCode) =>
                setOrigin((o) => ({ ...o, postalCode }))
              }
              disabled={pending}
              error={fields?.["origin.postalCode"]}
            />
            <SelectField
              id={`${id}-state`}
              label="UF"
              value={origin.state}
              options={[
                { value: "", label: "Selecione" },
                ...brazilianStates.map((value) => ({ value, label: value })),
              ]}
              onValueChange={(state) => setOrigin((o) => ({ ...o, state }))}
              disabled={pending}
              error={fields?.["origin.state"]}
            />
            {(
              [
                ["street", "Rua", 100],
                ["number", "Número", 20],
                ["neighborhood", "Bairro", 100],
                ["city", "Cidade", 100],
              ] as const
            ).map(([key, label, maxLength]) => (
              <Field
                key={key}
                id={`${id}-${key}`}
                label={label}
                value={origin[key]}
                maxLength={maxLength}
                disabled={pending || (key === "number" && origin.noNumber)}
                error={fields?.[`origin.${key}`]}
                onChange={(e) =>
                  setOrigin((o) => ({ ...o, [key]: e.target.value }))
                }
              />
            ))}
          </div>
          <label className={styles.choice}>
            <input
              type="checkbox"
              checked={origin.noNumber}
              disabled={pending}
              onChange={(e) =>
                setOrigin((o) => ({
                  ...o,
                  noNumber: e.target.checked,
                  number: e.target.checked ? "" : o.number,
                }))
              }
            />
            Sem número
          </label>
          <FieldError id={`${id}-origin-error`} error={fields?.origin} />
          <h3 id={`${id}-drivers`} tabIndex={-1}>
            Entregadores deste evento
          </h3>
          <div className="stack-small">
            {drivers.map((d) => (
              <label key={d.id} className={styles.choice}>
                <input
                  type="checkbox"
                  checked={driverIds.includes(d.id)}
                  disabled={pending}
                  onChange={(e) =>
                    setDriverIds((ids) =>
                      e.target.checked
                        ? [...ids, d.id]
                        : ids.filter((v) => v !== d.id),
                    )
                  }
                />
                <span>{d.name}</span>
              </label>
            ))}
          </div>
          <FieldError id={`${id}-drivers-error`} error={fields?.driverIds} />
        </>
      )}
    </DeliveryForm>
  );
}
