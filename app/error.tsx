"use client";

import { useEffect } from "react";
import Link from "next/link";
import styles from "./contingency.module.css";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <section className={styles.card} role="alert">
        <p className={styles.eyebrow}>Error temporal</p>
        <h1 className={styles.title}>No pudimos cargar esta sección</h1>
        <p className={styles.copy}>
          Puede tratarse de un problema momentáneo de conexión o del servicio.
          Tus datos no se han perdido; intenta cargar nuevamente.
        </p>
        <div className={styles.actions}>
          <button className={styles.primaryButton} type="button" onClick={reset}>
            Intentar nuevamente
          </button>
          <Link className={styles.secondaryButton} href="/">
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
