import Link from "next/link";
import styles from "./contingency.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.code}>404</p>
        <p className={styles.eyebrow}>Página no encontrada</p>
        <h1 className={styles.title}>No encontramos esta página</h1>
        <p className={styles.copy}>
          La dirección puede ser incorrecta o el contenido pudo haber sido movido
          o eliminado.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/">
            Volver al inicio
          </Link>
          <Link className={styles.secondaryButton} href="/ciclos">
            Ir a la ruta académica
          </Link>
        </div>
      </section>
    </main>
  );
}
