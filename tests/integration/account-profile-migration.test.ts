import { readFile } from "node:fs/promises";
import { unstable_splitSqlQuery } from "wrangler";
import { describe, expect, it } from "vitest";
import { harness } from "../support/harness";
import { D1LocalAccountRepository } from "@/server/users/infrastructure/d1-local-account.repository";

describe("migração de perfil após gerenciamento já aplicado", () => {
  it("acrescenta campos opcionais sem reescrever conta, autorias ou caixas existentes", async () => {
    const h = await harness(false, "0029_account_management.sql");
    try {
      await h.box("Caixa preservado");
      await h.d1
        .prepare(
          "INSERT INTO local_accounts(external_user_id,name,email,email_key,role,state,created_at,updated_at) VALUES(42,'Pessoa sintética','synthetic@example.invalid','synthetic@example.invalid','admin','pending','2026-11-16T12:00:00Z','2026-11-16T12:00:00Z')",
        )
        .run();
      const oldAccount = await h.d1
        .prepare("SELECT * FROM local_accounts")
        .first();
      const oldBoxes = (
        await h.d1.prepare("SELECT * FROM cash_boxes ORDER BY id").all()
      ).results;
      const oldAudit = (
        await h.d1
          .prepare("SELECT * FROM local_account_audit ORDER BY id")
          .all()
      ).results;
      const oldColumns = (
        await h.d1
          .prepare("PRAGMA table_info(local_accounts)")
          .all<{ name: string }>()
      ).results.map((x) => x.name);
      expect(oldColumns).not.toContain("birth_date");
      const sql = await readFile(
        new URL(
          "../../migrations/0030_local_account_profile.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await h.d1.batch(
        unstable_splitSqlQuery(sql).map((statement) => h.d1.prepare(statement)),
      );
      const current = (await h.d1
        .prepare("SELECT * FROM local_accounts")
        .first())!;
      const { birth_date, phone_country, phone_number, ...preserved } = current;
      expect([birth_date, phone_country, phone_number]).toEqual([
        null,
        null,
        null,
      ]);
      expect(preserved).toEqual(oldAccount);
      expect(
        (await h.d1.prepare("SELECT * FROM cash_boxes ORDER BY id").all())
          .results,
      ).toEqual(oldBoxes);
      expect(
        (
          await h.d1
            .prepare("SELECT * FROM local_account_audit ORDER BY id")
            .all()
        ).results,
      ).toEqual(oldAudit);
      const accessSql = await readFile(
        new URL("../../migrations/0031_account_access.sql", import.meta.url),
        "utf8",
      );
      await h.d1.batch(
        unstable_splitSqlQuery(accessSql).map((statement) =>
          h.d1.prepare(statement),
        ),
      );
      const repo = new D1LocalAccountRepository(h.db);
      await expect(
        repo.reserveImported({
          externalUserId: 43,
          name: "Nova pessoa",
          email: "new@example.invalid",
          birthDate: "1990-01-01",
          phoneCountry: "55",
          phoneNumber: "11999999999",
          now: "2026-11-16T12:00:00Z",
        }),
      ).resolves.toMatchObject({
        authorId: 43,
        birthDate: "1990-01-01",
        phoneCountry: "55",
        phoneNumber: "11999999999",
      });
    } finally {
      await h.close();
    }
  });
});
