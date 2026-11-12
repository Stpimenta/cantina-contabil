import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BalanceVisibilityProvider,
  BalanceVisibilityToggle,
  BalanceAmount,
} from "@/components/ui/balance-visibility";
import { CashBoxBalance } from "@/presentation/cash-boxes/components/cash-box-balance";

describe("visibilidade inicial dos saldos", () => {
  it("oculta valores desde o HTML inicial e oferece ação acessível de mostrar", () => {
    const html = renderToStaticMarkup(
      createElement(
        BalanceVisibilityProvider,
        null,
        createElement(BalanceVisibilityToggle),
        createElement(BalanceAmount, { cents: 123456789 }),
      ),
    );
    expect(html).toContain('aria-label="Mostrar valores"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Valor oculto");
    expect(html).not.toContain("R$");
    expect(html).not.toContain("1.234.567");
  });
  it("oculta real/pendente dos caixas sem mudar o saldo de eventos que reutiliza o componente", () => {
    const hidden = renderToStaticMarkup(
      createElement(CashBoxBalance, {
        amountCents: 12345,
        pendingCents: 100,
        concealable: true,
      }),
    );
    expect(hidden.match(/Valor oculto/g)).toHaveLength(2);
    expect(hidden).not.toContain("123,45");
    const unchanged = renderToStaticMarkup(
      createElement(CashBoxBalance, { amountCents: 12345, pendingCents: 100 }),
    );
    expect(unchanged).toContain("123,45");
  });
});
