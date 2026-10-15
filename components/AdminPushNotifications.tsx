'use client';

import { useEffect, useState } from 'react';
import { InlineSpinner } from '@/components/ui/InlineSpinner';

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
}

export function AdminPushNotifications() {
  const [supported, setSupported] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('Comprobando este dispositivo…');

  useEffect(() => {
    const available = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(available);
    if (!available) {
      setBusy(false);
      setMessage('Este navegador no admite notificaciones push. Puedes usar los avisos por correo.');
      return;
    }
    Promise.all([
      navigator.serviceWorker.ready.then(registration => registration.pushManager.getSubscription()),
      fetch('/api/admin-notifications/subscription').then(response => response.json()),
    ]).then(([subscription, status]) => {
      setConfigured(Boolean(status.configured));
      setSubscribed(Boolean(subscription));
      setMessage(subscription ? 'Las notificaciones están activas en este dispositivo.' : 'Actívalas para recibir avisos aunque la aplicación esté cerrada.');
    }).catch(() => setMessage('No se pudo comprobar el estado de las notificaciones.'))
      .finally(() => setBusy(false));
  }, []);

  async function toggle() {
    setBusy(true);
    setMessage('Actualizando permiso…');
    try {
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      if (current) {
        await fetch('/api/admin-notifications/subscription', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: current.endpoint }),
        });
        await current.unsubscribe();
        setSubscribed(false);
        setMessage('Notificaciones desactivadas en este dispositivo.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Debes permitir las notificaciones desde el teléfono.');
      const keyResponse = await fetch('/api/admin-notifications/subscription');
      const status = await keyResponse.json() as { configured?: boolean };
      if (!status.configured) throw new Error('Falta configurar las claves de notificaciones en el servidor.');
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error('Falta la clave pública de notificaciones.');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const response = await fetch('/api/admin-notifications/subscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error('No se pudo guardar este dispositivo.');
      setSubscribed(true);
      setMessage('Listo. Este dispositivo recibirá las nuevas solicitudes.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron activar las notificaciones.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface-muted mt-6 border-blue-100 bg-blue-50 p-5">
      <h2 className="text-xl font-black text-ink">Notificaciones administrativas</h2>
      <p className="mt-2 text-sm text-slate-600">Recibe un aviso por cada nueva reseña o verificación pendiente.</p>
      <button className="btn-primary mt-4 min-w-56 gap-2 disabled:cursor-wait" disabled={busy || !supported || !configured} onClick={toggle} type="button">
        {busy && <InlineSpinner />}
        {busy ? 'Comprobando…' : subscribed ? 'Desactivar en este dispositivo' : 'Activar notificaciones'}
      </button>
      <p aria-live="polite" className="mt-3 text-sm font-semibold text-slate-600">{message}</p>
    </section>
  );
}
