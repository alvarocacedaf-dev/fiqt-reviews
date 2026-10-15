import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPushNotifications } from '@/components/AdminPushNotifications';

const subscribe = vi.fn();
const getSubscription = vi.fn();

describe('notificaciones push administrativas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    subscribe.mockReset();
    getSubscription.mockReset().mockResolvedValue(null);
    Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { requestPermission: vi.fn().mockResolvedValue('granted') },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe } }) },
    });
  });

  it('informa que se pueden activar en un dispositivo compatible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ configured: true, subscribed: false }) }));
    render(<AdminPushNotifications />);
    expect(await screen.findByRole('button', { name: 'Activar notificaciones' })).toBeEnabled();
    expect(screen.getByText(/aunque la aplicación esté cerrada/i)).toBeInTheDocument();
  });

  it('solicita permiso desde el clic y registra la suscripción', async () => {
    const pushSubscription = {
      endpoint: 'https://push.example/subscription',
      toJSON: () => ({ endpoint: 'https://push.example/subscription', keys: { p256dh: 'key', auth: 'secret' } }),
    };
    subscribe.mockResolvedValue(pushSubscription);
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa40HI5gSzMKgxHM_XAYK_Y0OWwKOW2x3YQ2T1pkag');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ configured: true, subscribed: false }) })
      .mockResolvedValueOnce({ json: async () => ({ configured: true }) })
      .mockResolvedValueOnce({ ok: true }));

    render(<AdminPushNotifications />);
    const button = await screen.findByRole('button', { name: 'Activar notificaciones' });
    await act(async () => fireEvent.click(button));

    await waitFor(() => expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true })));
    expect(await screen.findByText(/este dispositivo recibirá/i)).toBeInTheDocument();
  });
});
