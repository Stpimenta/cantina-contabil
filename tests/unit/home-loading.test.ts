import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeOverview } from "@/presentation/home/components/home-overview";

describe("home loading and empty data", () => {
  it("keeps the dashboard structure without inventing balances or empty results before data arrives", () => {
    const html = renderToStaticMarkup(createElement(HomeOverview));
    for (const label of [
      "Saldo real",
      "Pendente",
      "Doações",
      "Movimentações",
      "Saldo por caixa",
      "Próximos eventos",
    ])
      expect(html).toContain(label);
    expect(html).not.toContain("R$");
    expect(html).not.toContain("Nenhum");
    expect(html).not.toContain("Preparando");
  });

  it("shows genuine zero balances and customized empty results after data resolves", () => {
    const html = renderToStaticMarkup(
      createElement(HomeOverview, {
        data: {
          realCents: 0,
          pendingCents: 0,
          boxCount: 0,
          boxes: [],
          upcoming: [],
        },
      }),
    );
    expect(html).toContain("R$");
    expect(html).toContain("Nenhum caixa encontrado.");
    expect(html).toContain("Nenhum evento próximo.");
  });
});
