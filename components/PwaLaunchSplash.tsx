'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';

type StandaloneNavigator = Navigator & { standalone?: boolean };

const SPLASH_DURATION_MS = 7000;
const SPLASH_RETURN_AFTER_MS = 30 * 60 * 1000;
const SESSION_KEY = 'fiqt-pwa-splash-shown';
const HIDDEN_AT_KEY = 'fiqt-pwa-hidden-at';

export function PwaLaunchSplash() {
  // Se renderiza desde el HTML inicial para que iOS no muestre un vacío negro
  // mientras React termina de hidratar la aplicación.
  const [visible, setVisible] = useState(true);
  const [run, setRun] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || Boolean((window.navigator as StandaloneNavigator).standalone);

    if (!standalone) {
      setVisible(false);
      return;
    }

    const clearTimer = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const finishSplash = () => {
      setVisible(false);
      document.body.classList.remove('pwa-splash-visible');
      document.documentElement.classList.add('pwa-content-ready');
      document.documentElement.classList.add('pwa-splash-skip');
    };

    const beginSplash = (restart: boolean) => {
      clearTimer();
      window.sessionStorage.setItem(SESSION_KEY, '1');
      document.documentElement.classList.remove('pwa-content-ready', 'pwa-splash-skip');
      document.body.classList.add('pwa-splash-visible');
      flushSync(() => {
        setVisible(true);
        if (restart) setRun((current) => current + 1);
      });
      timerRef.current = window.setTimeout(finishSplash, SPLASH_DURATION_MS);
    };

    const prepareAppSnapshot = () => {
      clearTimer();
      window.localStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
      document.documentElement.classList.remove('pwa-content-ready');
      document.documentElement.classList.remove('pwa-splash-skip');
      document.body.classList.add('pwa-splash-visible');
      flushSync(() => setVisible(true));
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') prepareAppSnapshot();
      else {
        const hiddenAt = Number(window.localStorage.getItem(HIDDEN_AT_KEY));
        window.localStorage.removeItem(HIDDEN_AT_KEY);
        if (hiddenAt > 0 && Date.now() - hiddenAt >= SPLASH_RETURN_AFTER_MS) beginSplash(true);
        else finishSplash();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    const hiddenAt = Number(window.localStorage.getItem(HIDDEN_AT_KEY));
    const returningAfterLongAbsence = hiddenAt > 0 && Date.now() - hiddenAt >= SPLASH_RETURN_AFTER_MS;
    const alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === '1';
    window.localStorage.removeItem(HIDDEN_AT_KEY);

    if (!alreadyShown || returningAfterLongAbsence) beginSplash(false);
    else finishSplash();

    return () => {
      clearTimer();
      document.removeEventListener('visibilitychange', handleVisibility);
      document.body.classList.remove('pwa-splash-visible');
      document.documentElement.classList.add('pwa-content-ready');
    };
  }, []);

  if (!visible) return null;

  return (
    <div key={run} className="pwa-launch-splash" role="status" aria-label="Abriendo FIQT">
      <div className="pwa-launch-brand" aria-hidden="true">
        <span className="pwa-launch-line"><span /></span>
        <div className="pwa-launch-copy">
          <div className="pwa-launch-title">
            {'FIQT'.split('').map((letter, index) => (
              <span
                key={letter}
                style={{ '--enter-delay': `${900 + index * 120}ms`, '--exit-delay': `${5480 + index * 90}ms` } as CSSProperties}
              >
                <span className="pwa-launch-letter-exit">{letter}</span>
              </span>
            ))}
          </div>
          <div className="pwa-launch-subtitle">
            {'Reviews/Planchas'.split('').map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                style={{ '--enter-delay': `${1650 + index * 35}ms`, '--exit-delay': `${5380 + (index % 5) * 75}ms` } as CSSProperties}
              >
                <span className="pwa-launch-letter-exit">{letter === ' ' ? '\u00a0' : letter}</span>
              </span>
            ))}
          </div>
          <div className="pwa-launch-tagline"><span>EXPERIENCIAS QUE ORIENTAN</span></div>
          <span className="pwa-launch-rule"><span /></span>
        </div>
      </div>
    </div>
  );
}
