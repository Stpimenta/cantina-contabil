import type { Driver } from "../models/driver.model";
import type { DeliveryRoute } from "../models/delivery-route.model";
import type { DeliveryOrder } from "../models/delivery-order.model";
import type { DeliverySettings } from "../models/delivery-settings.model";
import type { DeliveryAccess } from "../models/delivery-access.model";
import type { DeliveryPage } from "../models/delivery-page.model";
export interface DeliveryRepository {
  drivers(): Promise<Driver[]>;
  saveDriver(driver: Driver, expected: number): Promise<boolean>;
  settings(eventId: string): Promise<DeliverySettings | null>;
  saveSettings(settings: DeliverySettings, expected: number): Promise<boolean>;
  routeOptions(
    eventId: string,
  ): Promise<Pick<DeliveryRoute, "id" | "name" | "version">[]>;
  route(id: string): Promise<DeliveryRoute | null>;
  routes(
    eventId: string,
    page: number,
    driverId?: string,
  ): Promise<DeliveryPage<DeliveryRoute>>;
  orders(eventId: string, routeId: string): Promise<DeliveryOrder[]>;
  candidates(
    eventId: string,
    query: string,
    page: number,
  ): Promise<DeliveryPage<DeliveryOrder>>;
  saveRoutes(
    routes: { value: DeliveryRoute; expected: number }[],
  ): Promise<boolean>;
  accessByCredential(hash: string): Promise<DeliveryAccess | null>;
  accessByLink(hash: string): Promise<DeliveryAccess | null>;
  createAccess(access: DeliveryAccess, hash: string): Promise<boolean>;
  activate(hash: string, sessionHash: string): Promise<DeliveryAccess | null>;
  accesses(eventId: string): Promise<DeliveryAccess[]>;
  revoke(id: string, eventId: string): Promise<void>;
}

export interface DeliveryAuthorization {
  execute(
    credential: unknown,
    eventId: string,
  ): Promise<import("../models/delivery-actor.model").DeliveryActor>;
}
