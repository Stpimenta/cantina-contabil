"use client";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { FieldError } from "./field-error";
import { Icon } from "./icon";
import styles from "./file-upload-field.module.css";

export function FileUploadField({
  id,
  label,
  files,
  existingFiles = [],
  onRemoveExisting,
  maxFiles = 1,
  maxBytes,
  onValueChange,
  disabled,
  error,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  hint = "JPEG, PNG, WebP ou PDF, até 5 MB.",
}: {
  id: string;
  label: string;
  files: File[];
  existingFiles?: {
    id: string;
    name: string;
    size: number | null;
    label: ReactNode;
  }[];
  onRemoveExisting?: (id: string) => void;
  maxFiles?: number;
  maxBytes?: number;
  onValueChange: (files: File[]) => void;
  disabled?: boolean;
  error?: string;
  accept?: string;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [selectionError, setSelectionError] = useState<string>();
  const message = selectionError ?? error;
  function select(selection: FileList | null) {
    if (disabled || !selection?.length) return;
    const added = Array.from(selection);
    if (existingFiles.length + files.length + added.length > maxFiles) {
      setSelectionError(`Anexe até ${maxFiles} arquivo(s) por vez.`);
      return;
    }
    if (maxBytes && added.some((file) => file.size > maxBytes || !file.size)) {
      setSelectionError(
        `Cada arquivo deve ter até ${new Intl.NumberFormat("pt-BR").format(maxBytes / 1024 / 1024)} MB e não pode estar vazio.`,
      );
      return;
    }
    if (added.some((file) => !accept.split(",").includes(file.type))) {
      setSelectionError("Selecione arquivos nos formatos indicados.");
      return;
    }
    setSelectionError(undefined);
    onValueChange([...files, ...added]);
  }
  function removed() {
    setSelectionError(undefined);
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }
  function fileSize(size: number) {
    return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(size / 1024)} KB`;
  }
  return (
    <div className="stack-small" role="group" aria-label={label}>
      <p className="record-meta">{label}</p>
      <input
        ref={input}
        type="file"
        multiple={maxFiles > 1}
        accept={accept}
        hidden
        disabled={disabled}
        onChange={(event) => select(event.target.files)}
      />
      <button
        id={id}
        type="button"
        className={styles.zone}
        disabled={disabled}
        data-dragging={dragging && !disabled}
        aria-invalid={!!message}
        aria-describedby={`${id}-help${message ? ` ${id}-error` : ""}`}
        onClick={() => {
          if (input.current) {
            input.current.value = "";
            input.current.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) {
            dragDepth.current++;
            setDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (!dragDepth.current) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          dragDepth.current = 0;
          setDragging(false);
          select(event.dataTransfer.files);
        }}
      >
        <Icon name="upload" />
        <span>Clique para selecionar</span>
        <span id={`${id}-help`} className="muted record-meta">
          {hint}
        </span>
      </button>
      {existingFiles.map((file) => (
        <div key={file.id} className={`spread-row ${styles.selection}`}>
          <p className={styles.filename}>
            <span className={styles.name} title={file.name}>
              {file.label}
            </span>
            {file.size !== null && (
              <span className={`muted ${styles.size}`}>
                ({fileSize(file.size)})
              </span>
            )}
          </p>
          <Button
            type="button"
            variant="ghost"
            iconOnly
            aria-label={`Remover ${file.name}`}
            title={`Remover ${file.name}`}
            disabled={disabled}
            onClick={() => {
              onRemoveExisting?.(file.id);
              removed();
            }}
          >
            <Icon name="close" />
          </Button>
        </div>
      ))}
      {files.map((file, index) => (
        <div
          key={`${index}:${file.name}:${file.lastModified}`}
          className={`spread-row ${styles.selection}`}
        >
          <p className={styles.filename}>
            <span className={styles.name} title={file.name}>
              {file.name}
            </span>
            <span className={`muted ${styles.size}`}>
              ({fileSize(file.size)})
            </span>
          </p>
          <Button
            type="button"
            variant="ghost"
            iconOnly
            aria-label={`Remover ${file.name}`}
            title="Remover arquivo"
            disabled={disabled}
            onClick={() => {
              onValueChange(files.filter((_, current) => current !== index));
              removed();
            }}
          >
            <Icon name="close" />
          </Button>
        </div>
      ))}
      <FieldError id={`${id}-error`} error={message} />
      <span className="sr-only" role="status">
        {`${existingFiles.length + files.length} arquivo(s) selecionado(s)`}
      </span>
    </div>
  );
}
