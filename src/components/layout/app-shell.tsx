"use client";

import styles from "./app-shell.module.css";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Session } from "@/server/auth/models/session.model";
import { useServerAction } from "@/shared/hooks/use-server-action";
import { logoutAction } from "@/server/auth/actions/logout.action";
import { Brand } from "./brand";
import { Navigation } from "./navigation";
import { PageTransition } from "./page-transition";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { ErrorModal } from "../modals/error-modal";
import { UserInfoModal } from "../modals/user-info-modal";
import { NavigationModal } from "../modals/navigation-modal";

export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [desktopNavigationOpen, setDesktopNavigationOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { execute, pending, isPending, error, closeError } = useServerAction({
    connectionMessage:
      "Não foi possível sair agora. Verifique sua conexão e tente novamente.",
  });
  const popoverId = useId();
  const sidebarId = useId();
  const drawerId = useId();
  const popover = useRef<HTMLDivElement>(null);
  const userTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktop = matchMedia("(min-width: 48rem)");
    const close = () => {
      setIsDesktop(desktop.matches);
      if (desktop.matches) setNavigationOpen(false);
    };
    close();
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);

  function logout() {
    if (isPending()) return;
    popover.current?.hidePopover();
    execute(logoutAction);
  }

  return (
    <div
      className={`${styles.root}${desktopNavigationOpen ? "" : ` ${styles.navigationClosed}`}`}
    >
      <a href="#main" className={styles.skipLink}>
        Ir para o conteúdo
      </a>
      <header className={styles.header}>
        <div className={`inline ${styles.headerGroup}`}>
          <Button
            variant="ghost"
            iconOnly
            aria-label={
              (isDesktop ? desktopNavigationOpen : navigationOpen)
                ? "Fechar menu"
                : "Abrir menu"
            }
            title={
              (isDesktop ? desktopNavigationOpen : navigationOpen)
                ? "Fechar menu"
                : "Abrir menu"
            }
            aria-expanded={isDesktop ? desktopNavigationOpen : navigationOpen}
            aria-controls={isDesktop ? sidebarId : drawerId}
            aria-haspopup={isDesktop ? undefined : "dialog"}
            onClick={() => {
              if (isDesktop) setDesktopNavigationOpen((open) => !open);
              else setNavigationOpen((open) => !open);
            }}
          >
            <Icon name="menu" />
          </Button>
          <Brand />
        </div>
        <Button
          ref={userTrigger}
          variant="ghost"
          iconOnly
          aria-label="Abrir opções do usuário"
          popoverTarget={popoverId}
          disabled={pending}
        >
          <Icon name="user" />
        </Button>
        <div
          id={popoverId}
          popover="auto"
          ref={popover}
          className={styles.userPopover}
          aria-label="Opções do usuário"
        >
          <p className={styles.userName}>{session.user.name}</p>
          <Button
            variant="ghost"
            className={styles.menuAction}
            onClick={() => {
              popover.current?.hidePopover();
              setProfileOpen(true);
            }}
          >
            <Icon name="user" />
            Meus dados
          </Button>
          <Button
            variant="ghost"
            className={styles.menuAction}
            onClick={logout}
            busy={pending}
          >
            <Icon name="logout" />
            Sair
          </Button>
        </div>
      </header>
      <aside
        id={sidebarId}
        className={styles.sidebar}
        inert={!desktopNavigationOpen || !isDesktop}
        aria-hidden={!desktopNavigationOpen || !isDesktop}
      >
        <div className={styles.sidebarContent}>
          <Navigation />
        </div>
      </aside>
      <Button
        type="button"
        iconOnly
        className={styles.sidebarToggle}
        aria-label={desktopNavigationOpen ? "Fechar menu" : "Abrir menu"}
        title={desktopNavigationOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={desktopNavigationOpen}
        aria-controls={sidebarId}
        onClick={() => setDesktopNavigationOpen((open) => !open)}
      >
        <Icon name={desktopNavigationOpen ? "chevronLeft" : "chevronRight"} />
      </Button>
      <main id="main" className={styles.main}>
        <div className={styles.content}>
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <span className="sr-only" role="status">
        {pending ? "Encerrando sua sessão" : ""}
      </span>
      <NavigationModal
        id={drawerId}
        open={navigationOpen}
        onClose={() => setNavigationOpen(false)}
      />
      <UserInfoModal
        open={profileOpen}
        session={session}
        onClose={() => {
          setProfileOpen(false);
          requestAnimationFrame(() => userTrigger.current?.focus());
        }}
      />
      <ErrorModal error={error} onClose={closeError} />
    </div>
  );
}
