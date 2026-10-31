import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  isNull,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Database } from "@/shared/infrastructure/database";
import { hasDatabaseError } from "@/shared/infrastructure/database-error";
import type { Donation } from "../models/donation.model";
import type {
  DonationWrite,
  DonationFilters,
  DonationRepository,
} from "../repositories/donation.repository";
import { donations } from "./donation.schema";
import { cashBoxes } from "@/server/cash-boxes/infrastructure/cash-box.schema";

export class D1DonationRepository implements DonationRepository {
  constructor(private readonly db: Database) {}

  async create(donation: Donation) {
    try {
      const result = await this.db
        .insert(donations)
        .values(donation)
        .onConflictDoNothing({ target: donations.id })
        .run();
      return result.meta.changes > 0 ? ("saved" as const) : ("exists" as const);
    } catch (cause) {
      if (hasDatabaseError(cause, "DONATION_BALANCE_LIMIT"))
        return "balance_limit" as const;
      if (hasDatabaseError(cause, "DONATION_BOX_UNAVAILABLE"))
        return "box_unavailable" as const;
      throw cause;
    }
  }
  async update(
    value: Donation,
    expectedVersion: number,
  ): Promise<DonationWrite> {
    try {
      const { id, createdAt, createdBy, createdByName, ...changes } = value;
      const result = await this.db
        .update(donations)
        .set(changes)
        .where(
          and(
            eq(donations.id, id),
            eq(donations.version, expectedVersion),
            isNull(donations.deletedAt),
          ),
        )
        .run();
      return result.meta.changes ? "saved" : "changed";
    } catch (cause) {
      if (hasDatabaseError(cause, "DONATION_BALANCE_LIMIT"))
        return "balance_limit";
      if (hasDatabaseError(cause, "DONATION_BOX_UNAVAILABLE"))
        return "box_unavailable";
      if (hasDatabaseError(cause, "DONATION_INSUFFICIENT_BALANCE"))
        return "insufficient";
      if (hasDatabaseError(cause, "DONATION_CHANGED")) return "changed";
      throw cause;
    }
  }
  async find(id: string) {
    return (
      (await this.db
        .select()
        .from(donations)
        .where(and(eq(donations.id, id), isNull(donations.deletedAt)))
        .get()) ?? null
    );
  }
  async list(filters: DonationFilters, pageSize: number) {
    const conditions: SQL[] = [isNull(donations.deletedAt)];
    if (filters.query) {
      const search = `%${filters.query.replace(/[!%_]/g, "!$&")}%`;
      conditions.push(sql`${donations.donorName} LIKE ${search} ESCAPE '!'`);
    }
    if (filters.cashBoxId)
      conditions.push(eq(donations.cashBoxId, filters.cashBoxId));
    if (filters.year !== null) {
      const year = String(filters.year).padStart(4, "0");
      conditions.push(
        gte(donations.donatedOn, `${year}-01-01`),
        lte(donations.donatedOn, `${year}-12-31`),
      );
    }
    const condition = and(...conditions);
    const result = await this.db
      .select({ total: count() })
      .from(donations)
      .where(condition)
      .get();
    const total = result?.total ?? 0;
    const page = Math.min(
      filters.page,
      Math.max(1, Math.ceil(total / pageSize)),
    );
    const items = await this.db
      .select({ ...getTableColumns(donations), cashBoxName: cashBoxes.name })
      .from(donations)
      .innerJoin(cashBoxes, eq(cashBoxes.id, donations.cashBoxId))
      .where(condition)
      .orderBy(
        desc(donations.donatedOn),
        desc(donations.createdAt),
        desc(donations.id),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    return { items, total, page, pageSize, filters: { ...filters, page } };
  }
  async options() {
    const boxes = await this.db
      .select({ id: cashBoxes.id, name: cashBoxes.name })
      .from(cashBoxes)
      .where(isNull(cashBoxes.deletedAt))
      .orderBy(asc(cashBoxes.nameKey), asc(cashBoxes.id))
      .all();
    const year = sql<number>`CAST(substr(${donations.donatedOn},1,4) AS INTEGER)`;
    const years = await this.db
      .selectDistinct({ year })
      .from(donations)
      .where(isNull(donations.deletedAt))
      .orderBy(desc(year))
      .all();
    return { cashBoxes: boxes, years: years.map((row) => row.year) };
  }
}
