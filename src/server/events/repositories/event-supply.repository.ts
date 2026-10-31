import type { EventSupply } from "../models/event-supply.model";
import type { EventPage } from "./event.repository";
export interface EventSupplyRepository {
  find(id: string): Promise<EventSupply | null>;
  list(
    eventId: string,
    page: number,
    pageSize: number,
  ): Promise<EventPage<EventSupply>>;
  create(
    value: EventSupply,
  ): Promise<
    | "saved"
    | "exists"
    | "box_unavailable"
    | "insufficient"
    | "event_unavailable"
    | "limit"
  >;
  update(
    value: EventSupply,
    expectedVersion: number,
  ): Promise<
    | "saved"
    | "changed"
    | "box_unavailable"
    | "insufficient"
    | "event_unavailable"
    | "limit"
  >;
  softDelete(
    id: string,
    eventId: string,
    version: number,
    actorId: number,
    actorName: string,
    at: string,
  ): Promise<boolean>;
  receive(
    id: string,
    eventId: string,
    version: number,
    actorId: number,
    actorName: string,
    at: string,
  ): Promise<boolean>;
}
