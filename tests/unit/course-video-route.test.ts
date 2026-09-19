import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), file: vi.fn(), b2: vi.fn(), r2: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.auth } }) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: () => {
  const query = { select: () => query, eq: () => query, maybeSingle: mocks.file }; return query;
} }) }));
vi.mock('@/lib/b2', () => ({ createB2PresignedUrl: mocks.b2 }));
vi.mock('@/lib/r2', () => ({ createR2PresignedUrl: mocks.r2 }));
import { GET } from '@/app/api/course-materials/[materialId]/play/route';

const params = Promise.resolve({ materialId: '11111111-1111-4111-8111-111111111111' });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: 'student' } } });
  mocks.file.mockResolvedValue({ data: { file_path: 'course-materials/video.mp4', storage_provider: 'b2' }, error: null });
  mocks.b2.mockReturnValue('https://storage.example/video?signature=fresh');
});
describe('enlace de reproducción', () => {
  it('exige una sesión antes de generar un enlace', async () => {
    mocks.auth.mockResolvedValue({ data: { user: null } });
    expect((await GET(new Request('https://example.test'), { params })).status).toBe(401);
    expect(mocks.b2).not.toHaveBeenCalled();
  });
  it('redirige al almacenamiento sin cachear ni descargar el cuerpo del video', async () => {
    const response = await GET(new Request('https://example.test'), { params });
    expect(response.status).toBe(307);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('location')).toBe('https://storage.example/video?signature=fresh');
    expect(mocks.b2).toHaveBeenCalledWith('GET', 'course-materials/video.mp4', 14400);
    expect(await response.text()).toBe('');
  });
  it('no firma archivos que ya no existen', async () => {
    mocks.file.mockResolvedValue({ data: null, error: null });
    expect((await GET(new Request('https://example.test'), { params })).status).toBe(404);
    expect(mocks.b2).not.toHaveBeenCalled();
  });
});
