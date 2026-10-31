import styles from "./brand.module.css";
export function Brand({
  variant = "header",
}: {
  variant?: "header" | "login";
}) {
  return (
    <span
      className={`${styles.root}${variant === "login" ? ` ${styles.login}` : ""}`}
    >
      <img
        className={styles.logo}
        src="/brand/mc-logo.png"
        width={32}
        height={32}
        alt=""
      />
      <span className={styles.wordmark}>
        <span>Ministério</span>
        <span className={styles.secondary}>Contábil</span>
      </span>
    </span>
  );
}
