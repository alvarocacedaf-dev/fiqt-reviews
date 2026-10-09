import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  profile: vi.fn(),
  file: vi.fn(),
  signedUrl: vi.fn(),
  reward: vi.fn(),
  r2: vi.fn(),
  r2Configured: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.auth } }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        single: table === 'profiles' ? mocks.profile : mocks.file,
      };
      return query;
    },
    storage: { from: () => ({ createSignedUrl: mocks.signedUrl }) },
  }),
}));
vi.mock('@/lib/rewardProgress', () => ({ getRewardProgress: mocks.reward }));
vi.mock('@/lib/r2', () => ({
  createR2PresignedUrl: mocks.r2,
  isR2Configured: mocks.r2Configured,
}));

import { GET } from '@/app/api/admin-worksheets/[fileId]/download/route';

const params = Promise.resolve({ fileId: '11111111-1111-4111-8111-111111111111' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: 'owner' } } });
  mocks.profile.mockResolvedValue({ data: { role: 'owner' } });
  mocks.reward.mockResolvedValue({ total: 0 });
  mocks.file.mockResolvedValue({
    data: {
      id: '11111111-1111-4111-8111-111111111111',
      course_id: 'course-id',
      file_path: 'worksheets/practica.jpeg',
      file_name: '7e2d67d5-archivo-tecnico.jpeg',
      title: 'Práctica calificada 1',
      mime_type: 'image/jpeg',
      storage_provider: 'r2',
    },
  });
  mocks.r2Configured.mockReturnValue(true);
  mocks.r2.mockReturnValue('https://storage.example/practica?signature=fresh');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('imagen', {
    headers: { 'content-length': '6', 'content-type': 'image/jpeg' },
  })));
});

afterEach(() => vi.unstubAllGlobals());

describe('descarga individual de planchas', () => {
  it('fuerza la descarga desde R2 conservando el nombre del archivo', async () => {
    const response = await GET(new Request('https://example.test'), { params });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('attachment;');
    expect(response.headers.get('content-disposition')).toContain("filename*=UTF-8''Pr%C3%A1ctica%20calificada%201.jpeg");
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.text()).toBe('imagen');
  });

  it('también fuerza la descarga cuando el archivo está en Supabase', async () => {
    mocks.file.mockResolvedValue({
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        course_id: 'course-id',
        file_path: 'worksheets/documento.pdf',
        file_name: 'nombre-original.pdf',
        title: 'Documento visible',
        mime_type: 'application/pdf',
        storage_provider: 'supabase',
      },
    });
    mocks.signedUrl.mockResolvedValue({ data: { signedUrl: 'https://supabase.example/documento' }, error: null });

    const response = await GET(new Request('https://example.test'), { params });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('filename="Documento visible.pdf"');
    expect(fetch).toHaveBeenCalledWith('https://supabase.example/documento', { cache: 'no-store' });
  });

  it('abre el visor normal del almacenamiento sin alterar la firma de R2', async () => {
    const response = await GET(new Request('https://example.test?mode=preview'), { params });

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://storage.example/practica?signature=fresh');
    expect(mocks.r2).toHaveBeenCalledWith('GET', 'worksheets/practica.jpeg', 300);
  });
});
