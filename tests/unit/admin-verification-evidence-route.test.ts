import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  maybeSingle: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/lib/adminApi', () => ({ getAdminApiContext: mocks.context }));

import { GET } from '@/app/api/admin/verification-evidence/[submissionId]/route';

const params = Promise.resolve({ submissionId: '11111111-1111-4111-8111-111111111111' });

beforeEach(() => {
  vi.clearAllMocks();
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: mocks.maybeSingle,
  };
  mocks.context.mockResolvedValue({
    db: {
      from: () => query,
      storage: { from: () => ({ createSignedUrl: mocks.createSignedUrl }) },
    },
    user: { id: 'admin-id' },
    role: 'owner',
    isOwner: true,
  });
  mocks.maybeSingle.mockResolvedValue({ data: { file_url: 'user/evidence.png' } });
  mocks.createSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://storage.example/fresh-evidence-token' },
    error: null,
  });
});

describe('evidencia privada de verificaciones', () => {
  it('genera una URL nueva cada vez que el administrador abre la evidencia', async () => {
    const response = await GET(new Request('https://fiqtreviews.com/api/admin/verification-evidence/id'), { params });

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://storage.example/fresh-evidence-token');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith('user/evidence.png', 60);
  });

  it('redirige al inicio de sesión cuando no hay una sesión administrativa', async () => {
    mocks.context.mockResolvedValue({ error: 'Debes iniciar sesión.', status: 401 });

    const response = await GET(new Request('https://fiqtreviews.com/api/admin/verification-evidence/id'), { params });

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://fiqtreviews.com/login?next=/admin/verificaciones');
  });

  it('no expone rutas inexistentes', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null });

    const response = await GET(new Request('https://fiqtreviews.com/api/admin/verification-evidence/id'), { params });

    expect(response.status).toBe(404);
  });
});
