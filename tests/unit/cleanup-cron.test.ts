// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const createAdminClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }));

import { GET } from '@/app/api/cron/cleanup-chats/route';

describe('cron de limpieza de chats', () => {
  it('rechaza solicitudes sin el secreto configurado', async () => {
    vi.stubEnv('CRON_SECRET', 'secreto-prueba');
    const response = await GET(new Request('http://localhost/api/cron/cleanup-chats', {
      headers: { 'x-request-id': 'cron-prueba-123' },
    }) as never);

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('cron-prueba-123');
    await expect(response.json()).resolves.toMatchObject({ requestId: 'cron-prueba-123' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('rechaza un bearer token incorrecto', async () => {
    vi.stubEnv('CRON_SECRET', 'secreto-prueba');
    const response = await GET(new Request('http://localhost/api/cron/cleanup-chats', {
      headers: { authorization: 'Bearer incorrecto', 'x-request-id': 'cron-prueba-456' },
    }) as never);

    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('cron-prueba-456');
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
