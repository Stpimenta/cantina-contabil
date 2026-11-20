type ModalSession = {
  dialog: HTMLDialogElement;
  previousFocus: HTMLElement | null;
};

const sessions: ModalSession[] = [];
let originalOverflow = "";

export function registerModal(
  dialog: HTMLDialogElement,
  previousFocus: HTMLElement | null,
) {
  if (sessions.length === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  const session: ModalSession = { dialog, previousFocus };
  sessions.push(session);

  return () => {
    const index = sessions.indexOf(session);
    if (index < 0) return;
    const wasTop = index === sessions.length - 1;
    sessions.splice(index, 1);

    // Se o pai fechar primeiro, os filhos herdam o gatilho fora dele.
    for (const remaining of sessions) {
      if (remaining.previousFocus && dialog.contains(remaining.previousFocus)) {
        remaining.previousFocus = session.previousFocus;
      }
    }
    if (sessions.length === 0) {
      document.body.style.overflow = originalOverflow;
    }
    if (!wasTop) return;

    // Aguarda a desmontagem conjunta antes de tentar restaurar o foco.
    const target = session.previousFocus;
    queueMicrotask(() => {
      if (!target?.isConnected || target.closest("dialog:not([open])")) return;
      const top = sessions[sessions.length - 1];
      if (top && !top.dialog.contains(target)) return;
      target.focus({ preventScroll: true });
    });
  };
}
