'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { activitySection, activityResource, type ActivityEventName, type ActivityResource } from '@/lib/activity';

type ActivityRecord = { id: string; event: ActivityEventName; path: string; resource?: ActivityResource | null };
export function SiteActivityTracker() {
  const path = usePathname();
  const currentPath = useRef(path);
  const queue = useRef<ActivityRecord[]>([]);
  const lastInteraction = useRef(0);
  const enabled = useRef(false);
  const lastPage = useRef<string | null>(null);

  useEffect(() => {
    try {
      enabled.current = localStorage.getItem('fiqt-activity-optout') !== '1' && navigator.doNotTrack !== '1';
    } catch { enabled.current = false; }
    const tab = crypto.randomUUID();
    lastInteraction.current = Date.now();
    let busy = false;
    let stopped = false;
    const touch = () => { lastInteraction.current = Date.now(); };
    const preference = () => {
      enabled.current = localStorage.getItem('fiqt-activity-optout') !== '1' && navigator.doNotTrack !== '1';
      if (!enabled.current) { queue.current = []; }
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
      if (kind && queue.current.length < 100) queue.current.push({ id: crypto.randomUUID(), event: kind, path: currentPath.current, resource: activityResource(url.pathname + url.search) });
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
      queue.current.push({ id: crypto.randomUUID(), event: 'page_view', path, resource: activityResource(path) });
      lastInteraction.current = Date.now();
    }
    lastPage.current = path;
  }, [path]);

  return null;
}
