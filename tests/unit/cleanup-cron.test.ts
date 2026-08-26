// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const createAdminClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }));

import { GET } from '@/app/api/cron/cleanup-chats/route';

describe('cron de limpieza de chats', () => {
  it('rechaza solicitudes sin el secreto configurado', async () => {
    vi.stubEnv('CRON_SECRET', 'secreto-prueba');
    const response = await GET(new Request('http://localhost/api/cron/cleanup-chats') as never);

    expect(response.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('rechaza un bearer token incorrecto', async () => {
    vi.stubEnv('CRON_SECRET', 'secreto-prueba');
    const response = await GET(new Request('http://localhost/api/cron/cleanup-chats', {
      headers: { authorization: 'Bearer incorrecto' },
    }) as never);

    expect(response.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
