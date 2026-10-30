'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { activitySection, type ActivityEventName } from '@/lib/activity';

type ActivityRecord = { id: string; event: ActivityEventName; path: string };
export function SiteActivityTracker() {
  const path = usePathname();
  const currentPath = useRef(path);
  const queue = useRef<ActivityRecord[]>([]);
  const lastInteraction = useRef(0);
  const [notice, setNotice] = useState(false);
  const enabled = useRef(false);
  const lastPage = useRef<string | null>(null);

  useEffect(() => {
    try {
      enabled.current = localStorage.getItem('fiqt-activity-optout') !== '1' && navigator.doNotTrack !== '1';
      setNotice(enabled.current && localStorage.getItem('fiqt-activity-notice') !== '1');
    } catch { enabled.current = false; }
    const tab = crypto.randomUUID();
    lastInteraction.current = Date.now();
    let busy = false;
    let stopped = false;
    const touch = () => { lastInteraction.current = Date.now(); };
    const preference = () => {
      enabled.current = localStorage.getItem('fiqt-activity-optout') !== '1' && navigator.doNotTrack !== '1';
      if (!enabled.current) { queue.current = []; setNotice(false); }
    };
    async function flush() {
      if (!enabled.current || busy || !activitySection(currentPath.current)) return;
      const events = queue.current.slice(0,20);
      const active = document.visibilityState === 'visible' && Date.now() - lastInteraction.current < 120000;
      busy = true;
      try {
        const response = await fetch('/api/activity', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
          body: JSON.stringify({ tab, path: currentPath.current, active, events }),
          keepalive: true,
        });
        if (response.ok && !stopped) {
          const sent = new Set(events.map(event => event.id));
          queue.current = queue.current.filter(event => !sent.has(event.id));
        }
      } catch { /* Analytics must never block the application. Retry at the next interval. */ }
      finally { busy = false; }
    }
    function click(event: MouseEvent) {
      if (!enabled.current || event.defaultPrevented || !(event.target instanceof Element)) return;
      const anchor = event.target.closest('a[href]');
      if (!anchor || anchor.getAttribute('aria-disabled') === 'true') return;
      const url = new URL(anchor.getAttribute('href') ?? '', window.location.origin);
      if (url.origin !== window.location.origin || !activitySection(currentPath.current)) return;
      const kind = url.pathname === '/api/admin-worksheets/folder-download' ? 'zip_click'
        : anchor.hasAttribute('download') || /^\/api\/(admin-worksheets|course-materials)\/.+\/(download|play)$/.test(url.pathname) ? 'download_click' : null;
      if (kind && queue.current.length < 100) queue.current.push({ id: crypto.randomUUID(), event: kind, path: currentPath.current });
    }
    const visible = () => { if (document.visibilityState === 'visible') touch(); void flush(); };
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void flush(); }, 30000);
    const first = window.setTimeout(() => void flush(), 1000);
    document.addEventListener('pointerdown', touch, { passive: true });
    document.addEventListener('keydown', touch);
    document.addEventListener('scroll', touch, { passive: true, capture: true });
    document.addEventListener('click', click);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('fiqt-activity-preference', preference);
    window.addEventListener('storage', preference);
    return () => {
      stopped = true;
      clearInterval(timer); clearTimeout(first);
      document.removeEventListener('pointerdown', touch);
      document.removeEventListener('keydown', touch);
      document.removeEventListener('scroll', touch, true);
      document.removeEventListener('click', click);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('fiqt-activity-preference', preference);
      window.removeEventListener('storage', preference);
    };
  }, []);

  useEffect(() => {
    currentPath.current = path;
    if (enabled.current && lastPage.current !== path && activitySection(path) && queue.current.length < 100) {
      queue.current.push({ id: crypto.randomUUID(), event: 'page_view', path });
      lastInteraction.current = Date.now();
    }
    lastPage.current = path;
  }, [path]);

  if (!notice || !activitySection(path)) return null;
  return <aside aria-label="Información sobre estadísticas" className="fixed bottom-4 left-4 right-4 z-40 max-w-lg rounded-2xl border border-blue-200 bg-white p-4 text-sm text-slate-700 shadow-xl">
    <p>Usamos estadísticas de navegación y actividad para mejorar FIQT. Si inicias sesión, solo el propietario puede asociarlas a tu cuenta.</p>
    <div className="mt-3 flex flex-wrap items-center gap-4">
      <Link href="/privacidad" className="font-bold text-royal underline">Detalles y preferencias</Link>
      <button type="button" className="font-bold text-royal" onClick={() => { localStorage.setItem('fiqt-activity-notice','1'); setNotice(false); }}>Entendido</button>
      <button type="button" onClick={() => { localStorage.setItem('fiqt-activity-optout','1'); window.dispatchEvent(new Event('fiqt-activity-preference')); }}>No participar</button>
    </div>
  </aside>;
}
