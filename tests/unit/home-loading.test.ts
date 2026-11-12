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

  it("keeps zero balances concealed and shows customized empty results after data resolves", () => {
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
    expect(html).not.toContain("R$");
    expect(html).toContain("Valor oculto");
    expect(html).toContain("Nenhum caixa encontrado.");
    expect(html).toContain("Nenhum evento próximo.");
  });
  it("keeps chart bars while concealing the summary and box amounts", () => {
    const html = renderToStaticMarkup(
      createElement(HomeOverview, {
        data: {
          realCents: 12345,
          pendingCents: 6789,
          boxCount: 1,
          boxes: [
            {
              id: "box",
              name: "Caixa sintético",
              balanceCents: 12345,
              pendingCents: 6789,
            },
          ],
          upcoming: [],
        },
      }),
    );
    expect(html).toContain("<svg");
    expect(html).toContain('width="100"');
    expect(html).toContain("Caixa sintético");
    expect(html).not.toContain("123,45");
    expect(html).not.toContain("67,89");
    expect(html.match(/Valor oculto/g)).toHaveLength(3);
  });
});
