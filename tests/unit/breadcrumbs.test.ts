import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
const root = { label: "Home", href: "/" };
describe("retorno das páginas secundárias", () => {
  it.each([
    {
      items: [
        root,
        { label: "Caixas", href: "/cash-boxes" },
        { label: "Caixa" },
      ],
      href: "/cash-boxes",
      label: "Caixas",
    },
    {
      items: [root, { label: "Eventos", href: "/events" }, { label: "Evento" }],
      href: "/events",
      label: "Eventos",
    },
    {
      items: [
        root,
        { label: "Eventos", href: "/events" },
        { label: "Evento", href: "/events/1" },
        { label: "Pedidos" },
      ],
      href: "/events/1",
      label: "Evento",
    },
    {
      items: [
        root,
        { label: "Eventos", href: "/events" },
        { label: "Evento", href: "/events/1" },
        { label: "Insumos" },
      ],
      href: "/events/1",
      label: "Evento",
    },
  ])(
    "volta ao ancestral $label sem substituir o caminho",
    ({ items, href, label }) => {
      const html = renderToStaticMarkup(createElement(Breadcrumbs, { items }));
      expect(html).toContain('aria-label="Caminho de navegação"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain(
        `aria-label="Voltar para ${label}" href="${href}"`,
      );
    },
  );
  it("reserva retorno desabilitado no carregamento", () => {
    const html = renderToStaticMarkup(
      createElement(Breadcrumbs, {
        items: [root, { label: "Caixa" }],
        loading: true,
      }),
    );
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain('aria-label="Voltar para');
  });
});
