import Link from "next/link";
import type { GetHomeUseCase } from "@/server/home/use-cases/get-home.use-case";
import { formatCurrency } from "@/shared/formatting/currency";
import { formatDateOnly } from "@/shared/formatting/date-time";
import { Icon } from "@/components/ui/icon";
import styles from "./home-overview.module.css";

type Overview = Awaited<ReturnType<GetHomeUseCase["execute"]>>;

export function HomeOverview({ data }: { data: Overview }) {
  const maximum = data.boxes.reduce((max, box) => {
    const amount = BigInt(box.balanceCents);
    const absolute = amount < 0n ? -amount : amount;
    return absolute > max ? absolute : max;
  }, 0n);
  const signed = data.boxes.some((box) => box.balanceCents < 0);
  return (
    <div className={styles.dashboard}>
      <section
        className={styles.summary}
        aria-label="Resumo financeiro de todos os caixas ativos"
      >
        <div className={styles.mainBalance}>
          <p className={styles.eyebrow}>Saldo real</p>
          <p
            className={styles.total}
            data-long={formatCurrency(data.realCents).length > 22 || undefined}
          >
            {formatCurrency(data.realCents)}
          </p>
          <Link className={styles.summaryLink} href="/caixas">
            {data.boxCount}{" "}
            {data.boxCount === 1 ? "caixa ativo" : "caixas ativos"}
            <Icon name="arrow" />
          </Link>
        </div>
        <div className={styles.pendingBalance}>
          <p className={styles.eyebrow}>Pendente</p>
          <p className={styles.pendingValue}>
            {formatCurrency(data.pendingCents)}
          </p>
          <p className="muted record-meta">Pedidos ainda não pagos</p>
        </div>
      </section>
      <nav className={styles.hooks} aria-label="Ações do dia a dia">
        <Link href="/doacoes" className={styles.hook}>
          <span className={styles.hookIcon}>
            <Icon name="donation" />
          </span>
          <span className={styles.hookText}>
            <strong>Doações</strong>
            <span>Consultar recebimentos</span>
          </span>
          <Icon name="chevronRight" />
        </Link>
        <Link href="/movimentacoes" className={styles.hook}>
          <span className={styles.hookIcon}>
            <Icon name="movements" />
          </span>
          <span className={styles.hookText}>
            <strong>Movimentações</strong>
            <span>Acompanhar entradas e saídas</span>
          </span>
          <Icon name="chevronRight" />
        </Link>
      </nav>
      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby="home-chart">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="home-chart">Saldo por caixa</h2>
              <p className="muted record-meta">Real · Todos os períodos</p>
            </div>
            <Link
              className={styles.more}
              href="/caixas"
              aria-label="Ver todos os caixas"
            >
              <Icon name="arrow" />
            </Link>
          </div>
          {data.boxes.length === 0 ? (
            <p className="muted">0 resultados</p>
          ) : (
            <ul
              className={styles.chart}
              aria-label="Comparação dos saldos reais por caixa"
            >
              {data.boxes.map((box) => {
                const value = BigInt(box.balanceCents);
                const absolute = value < 0n ? -value : value;
                const width =
                  maximum === 0n
                    ? 0
                    : Number((absolute * 10000n) / maximum) /
                      (signed ? 200 : 100);
                const start = signed ? (value < 0n ? 50 - width : 50) : 0;
                return (
                  <li key={box.id}>
                    <Link
                      href={`/caixas/${box.id}`}
                      className={styles.chartLink}
                    >
                      <span className={styles.chartLabel}>
                        <span>{box.name}</span>
                        <strong className="balance-value">
                          {formatCurrency(box.balanceCents)}
                        </strong>
                      </span>
                      <svg
                        viewBox="0 0 100 6"
                        preserveAspectRatio="none"
                        className={styles.bar}
                        aria-hidden="true"
                      >
                        <rect
                          width="100"
                          height="6"
                          rx="1"
                          className={styles.track}
                        />
                        <rect
                          x={start}
                          width={width}
                          height="6"
                          rx="1"
                          className={
                            box.balanceCents < 0 ? styles.negative : styles.fill
                          }
                        />
                        {signed && (
                          <line
                            x1="50"
                            x2="50"
                            y1="0"
                            y2="6"
                            className={styles.zero}
                          />
                        )}
                      </svg>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className={styles.panel} aria-labelledby="home-events">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="home-events">Próximos eventos</h2>
              <p className="muted record-meta">A partir de hoje</p>
            </div>
            <Link
              className={styles.more}
              href="/eventos"
              aria-label="Ver todos os eventos"
            >
              <Icon name="arrow" />
            </Link>
          </div>
          {data.upcoming.length === 0 ? (
            <p className="muted">0 resultados</p>
          ) : (
            <ul className={styles.records}>
              {data.upcoming.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/eventos/${event.id}`}
                    className={styles.eventLink}
                  >
                    <span className={styles.eventContent}>
                      <strong>{event.name}</strong>
                      <span className="muted record-meta">
                        {formatDateOnly(event.occursOn)}
                      </span>
                    </span>
                    <Icon name="chevronRight" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
