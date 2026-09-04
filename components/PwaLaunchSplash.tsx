'use client';

import { useEffect, useState, type CSSProperties } from 'react';

type StandaloneNavigator = Navigator & { standalone?: boolean };

const SPLASH_DURATION_MS = 7000;

export function PwaLaunchSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || Boolean((window.navigator as StandaloneNavigator).standalone);

    if (!standalone) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.classList.add('pwa-splash-visible');
    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
      document.body.classList.remove('pwa-splash-visible');
    }, reducedMotion ? 250 : SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove('pwa-splash-visible');
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pwa-launch-splash" role="status" aria-label="Abriendo FIQT">
      <div className="pwa-launch-brand" aria-hidden="true">
        <span className="pwa-launch-line" />
        <div className="pwa-launch-copy">
          <div className="pwa-launch-title">
            {'FIQT'.split('').map((letter, index) => (
              <span
                key={letter}
                style={{ '--enter-delay': `${900 + index * 120}ms`, '--exit-delay': `${5480 + index * 90}ms` } as CSSProperties}
              >
                {letter}
              </span>
            ))}
          </div>
          <div className="pwa-launch-subtitle">
            {'Reviews/Planchas'.split('').map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                style={{ '--enter-delay': `${1650 + index * 35}ms`, '--exit-delay': `${5380 + (index % 5) * 75}ms` } as CSSProperties}
              >
                {letter === ' ' ? '\u00a0' : letter}
              </span>
            ))}
          </div>
          <div className="pwa-launch-tagline">EXPERIENCIAS QUE ORIENTAN</div>
          <span className="pwa-launch-rule" />
        </div>
      </div>
    </div>
  );
}
