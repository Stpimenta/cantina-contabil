import styles from "./section-feedback.module.css";

const illustrations = {
  home: "/illustrations/empty-states/home.svg",
  caixas: "/illustrations/empty-states/caixas.svg",
  doacoes: "/illustrations/empty-states/doacoes.svg",
  movimentacoes: "/illustrations/empty-states/movimentacoes.svg",
  eventos: "/illustrations/empty-states/eventos.svg",
  pedidos: "/illustrations/empty-states/pedidos.svg",
  insumos: "/illustrations/empty-states/insumos.svg",
  historico: "/illustrations/empty-states/historico.svg",
} as const;

export type SectionArea = keyof typeof illustrations;

export function SectionIllustration({ area }: { area: SectionArea }) {
  return (
    <img
      className={styles.illustration}
      src={illustrations[area]}
      width={180}
      height={128}
      alt=""
      aria-hidden="true"
    />
  );
}
