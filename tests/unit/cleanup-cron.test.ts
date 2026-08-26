// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createAdminClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient }));

import { GET } from '@/app/api/cron/cleanup-chats/route';

describe('cron de limpieza de chats', () => {
  beforeEach(() => createAdminClient.mockReset());

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

  it('completa de forma idempotente un trabajo pendiente y registra el reintento', async () => {
    vi.stubEnv('CRON_SECRET', 'secreto-prueba');
    const remove = vi.fn().mockResolvedValue({ error: null });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        id: 'job-1',
        thread_id: 'thread-1',
        status: 'failed',
        chat_attachment_paths: ['thread-1/archivo.pdf'],
        report_attachment_paths: [],
        attempt_count: 1,
      }],
      error: null,
    });
    createAdminClient.mockReturnValue({
      rpc,
      storage: { from: vi.fn().mockReturnValue({ remove }) },
      from: vi.fn().mockReturnValue({ update }),
    });

    const response = await GET(new Request('http://localhost/api/cron/cleanup-chats', {
      headers: {
        authorization: 'Bearer secreto-prueba',
        'x-request-id': 'cron-reintento-123',
      },
    }) as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      processedJobs: 1,
      completedJobs: 1,
      retriedJobs: 1,
    });
    expect(remove).toHaveBeenCalledWith(['thread-1/archivo.pdf']);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      attempt_count: 2,
    }));
    expect(updateEq).toHaveBeenCalledWith('id', 'job-1');
  });
});
