import styles from "./contingency.module.css";

export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true" aria-live="polite">
      <section className={styles.card}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.eyebrow}>FIQT Reviews/Planchas</p>
        <h1 className={styles.title}>Cargando contenido…</h1>
        <p className={styles.copy}>
          Estamos preparando la información. Esto puede tomar unos segundos.
        </p>
      </section>
    </main>
  );
}
