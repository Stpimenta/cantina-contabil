import type { AccountLifecycleRepository } from "@/server/auth/repositories/account-lifecycle.repository";
import { checkAdminAccess } from "@/shared/auth/check-cash-box-access";
import type { Session } from "@/server/auth/models/session.model";
import type { LocalAccountRepository } from "../repositories/local-account.repository";
import type { CashBoxRepository } from "@/server/cash-boxes/repositories/cash-box.repository";
import { parseInput } from "@/shared/validation/input";
import { validateAccountList } from "../inputs/manage-account.input";
import { DEFAULT_PAGE_SIZE } from "@/shared/pagination";
export class ListLocalAccountsUseCase {
  constructor(
    private readonly accounts: LocalAccountRepository,
    private readonly boxes: CashBoxRepository,
    private readonly lifecycle: AccountLifecycleRepository,
  ) {}
  async execute(session: Session | null, input: unknown) {
    checkAdminAccess(session);
    const filters = parseInput(validateAccountList(input));
    const [result, boxes] = await Promise.all([
      this.accounts.list(filters.query, filters.page, DEFAULT_PAGE_SIZE),
      this.boxes.overview(),
    ]);
    return {
      ...result,
      query: filters.query,
      pageSize: DEFAULT_PAGE_SIZE,
      items: await Promise.all(
        result.items.map(async (a) => {
          const invitation = await this.lifecycle.latestInvitation(a.id);
          return {
            id: a.id,
            name: a.name,
            email: a.email,
            role: a.role,
            state: a.state,
            cashBoxIds: a.cashBoxIds,
            cashBoxWriteIds: a.cashBoxWriteIds ?? [],
            eventIds: a.eventIds ?? [],
            eventWriteIds: a.eventWriteIds ?? [],
            version: a.version,
            invitationExpiresAt: invitation?.expiresAt ?? null,
            invitationState: !invitation
              ? null
              : invitation.cancelledAt
                ? "cancelled"
                : invitation.consumedAt
                  ? "consumed"
                  : invitation.expiresAt <= Math.floor(Date.now() / 1000)
                    ? "expired"
                    : "pending",
          };
        }),
      ),
      events: await this.accounts.eventOptions(),
      boxes: boxes.map((b) => ({ id: b.id, name: b.name })),
    };
  }
}
