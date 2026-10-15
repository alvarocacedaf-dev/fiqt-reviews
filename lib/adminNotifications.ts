import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

export type AdminNotificationEvent = 'review_pending' | 'verification_pending' | 'contribution_pending';

const eventCopy = {
  review_pending: {
    title: 'Nueva reseña pendiente',
    body: 'Hay una nueva reseña esperando moderación.',
    url: '/admin/resenas',
  },
  verification_pending: {
    title: 'Nueva verificación pendiente',
    body: 'Hay una nueva evidencia académica esperando revisión.',
    url: '/admin/verificaciones',
  },
  contribution_pending: {
    title: 'Nuevo Yape pendiente',
    body: 'Hay un nuevo comprobante de aporte esperando aprobación.',
    url: '/admin/yapes',
  },
} satisfies Record<AdminNotificationEvent, { title: string; body: string; url: string }>;

function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

async function claimDelivery(eventType: AdminNotificationEvent, eventId: string, channel: 'push' | 'email', recipientKey: string) {
  const admin = createAdminClient();
  const { error } = await admin.from('admin_notification_deliveries').insert({
    event_type: eventType,
    event_id: eventId,
    channel,
    recipient_key: recipientKey,
    status: 'sending',
  });
  return !error;
}

async function finishDelivery(eventType: AdminNotificationEvent, eventId: string, channel: 'push' | 'email', recipientKey: string, success: boolean, providerId?: string, error?: unknown) {
  const admin = createAdminClient();
  await admin.from('admin_notification_deliveries').update({
    status: success ? 'sent' : 'failed',
    provider_id: providerId ?? null,
    last_error: success ? null : String(error instanceof Error ? error.message : error).slice(0, 1000),
    sent_at: success ? new Date().toISOString() : null,
  }).match({ event_type: eventType, event_id: eventId, channel, recipient_key: recipientKey });
}

export async function sendAdminNotifications(eventType: AdminNotificationEvent, eventId: string) {
  const copy = eventCopy[eventType];
  const admin = createAdminClient();

  if (pushConfigured()) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    const { data: subscriptions } = await admin
      .from('admin_push_subscriptions')
      .select('id,user_id,endpoint,p256dh,auth_secret')
      .eq('enabled', true);

    await Promise.all((subscriptions ?? []).map(async subscription => {
      const recipientKey = subscription.id as string;
      if (!await claimDelivery(eventType, eventId, 'push', recipientKey)) return;
      try {
        const result = await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret },
        }, JSON.stringify({ ...copy, eventId, tag: `${eventType}:${eventId}` }));
        await finishDelivery(eventType, eventId, 'push', recipientKey, true, String(result.statusCode));
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('admin_push_subscriptions').update({ enabled: false }).eq('id', subscription.id);
        }
        await finishDelivery(eventType, eventId, 'push', recipientKey, false, undefined, error);
      }
    }));
  }

  const email = process.env.ADMIN_NOTIFICATION_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_NOTIFICATION_FROM;
  if (email && resendKey && from && await claimDelivery(eventType, eventId, 'email', email.toLowerCase())) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [email],
          subject: copy.title,
          html: `<div style="font-family:Arial,sans-serif;color:#071936"><h2>${copy.title}</h2><p>${copy.body}</p><p><a style="display:inline-block;background:#14499b;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700" href="${new URL(copy.url, process.env.NEXT_PUBLIC_SITE_URL || 'https://fiqtreviews.com')}">Revisar ahora</a></p></div>`,
        }),
      });
      const result = await response.json() as { id?: string; message?: string };
      if (!response.ok) throw new Error(result.message || 'Resend rechazó el correo.');
      await finishDelivery(eventType, eventId, 'email', email.toLowerCase(), true, result.id);
    } catch (error) {
      await finishDelivery(eventType, eventId, 'email', email.toLowerCase(), false, undefined, error);
    }
  }
}
