'use client';

import { useEffect, useRef, useState } from 'react';

export function CourseVideoPlayer({ id, title, src, active, onActivate }: {
  id: string; title: string; src: string; active: boolean; onActivate: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;
    setStatus('loading');
    setSlow(false);
    // Set the source only for the selected class. A fresh request also renews signed URLs.
    video.src = src + (src.startsWith('/api/') ? `?attempt=${attempt}` : '');
    video.load();
    void video.play().catch(() => {
      // Safari may require another tap on its native Play control after loading.
    });
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [active, attempt, src]);

  useEffect(() => {
    if (!active || status !== 'loading') return;
    const timer = window.setTimeout(() => setSlow(true), 20000);
    return () => window.clearTimeout(timer);
  }, [active, attempt, status]);

  function retry() { setSlow(false); setStatus('loading'); setAttempt(value => value + 1); }

  if (!active) return (
    <button type="button" onClick={onActivate} aria-label={`Reproducir ${title}`} className="mt-3 flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-black text-white">
      <span aria-hidden="true" className="text-5xl">▶</span>
      <span>Reproducir clase</span>
    </button>
  );

  return (
    <div className="mt-3">
      <video ref={videoRef} aria-label={title} data-material-id={id} controls playsInline preload="none"
        className="aspect-video w-full rounded-xl bg-black"
        onCanPlay={() => { setStatus('ready'); setSlow(false); }}
        onPlaying={() => { setStatus('ready'); setSlow(false); }}
        onWaiting={() => setStatus('loading')}
        onStalled={() => setStatus('loading')}
        onError={() => setStatus('error')} />
      <div role="status" className="mt-2 text-sm text-slate-700">
        {status === 'loading' && (slow ? 'La carga está tardando más de lo habitual. Puedes esperar o reintentar.' : 'Cargando video…')}
        {status === 'ready' && 'Video listo. Pulsa ▶ si no comenzó a reproducirse.'}
        {status === 'error' && 'No se pudo reproducir el video. Comprueba tu conexión y vuelve a intentarlo. Si tu sesión venció, inicia sesión nuevamente.'}
      </div>
      {(status === 'error' || slow) && <button type="button" className="btn-secondary mt-2" onClick={retry}>Reintentar video</button>}
    </div>
  );
}
