"use client";
import { SectionFeedback } from "./section-feedback";
import { Button } from "./button";
import { Icon } from "./icon";
import { formatDateTime } from "@/shared/formatting/date-time";
import styles from "./history-record-list.module.css";
export function HistoryRecordList({
  entries,
  label,
  onDetails,
  disabled = false,
}: {
  entries: { id: string; label: string; actorName: string; occurredAt?: string }[];
  label: string;
  onDetails: (id: string) => void;
  disabled?: boolean;
}) {
  if (entries.length === 0)
    return (
      <SectionFeedback area="historico">
        Nenhum registro no histórico.
      </SectionFeedback>
    );
  return (
    <ul className="record-list" aria-label={label}>
      {entries.map((entry) => (
        <li key={entry.id} className="record-row record-row-centered">
          <div className={`stack-small ${styles.content}`}>
            <p className={styles.line}>{entry.label}</p>
            <div className={entry.occurredAt ? styles.metadata : undefined}>
              <p className={`muted ${styles.line}`}>{entry.actorName}</p>
              {entry.occurredAt && <time className="muted record-meta" dateTime={entry.occurredAt}>{formatDateTime(entry.occurredAt)}</time>}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            iconOnly
            title="Ver detalhes"
            aria-label={`Ver detalhes: ${entry.label}, registrado por ${entry.actorName}`}
            aria-haspopup="dialog"
            disabled={disabled}
            onClick={() => onDetails(entry.id)}
          >
            <Icon name="more" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
