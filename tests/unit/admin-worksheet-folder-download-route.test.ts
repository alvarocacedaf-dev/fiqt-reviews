import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ zip: vi.fn(), unlock: vi.fn(), role: 'owner' }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) } }) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (table: string) => {
  const query = {
    select: () => query, eq: () => query,
    single: async () => ({ data: table === 'profiles' ? { role: mocks.role } : { id: 'course', name: 'Física I' } }),
    maybeSingle: mocks.unlock,
    order: async () => ({ data: [1, 2, 1].map((n, i) => ({ id: String(i), created_at: '2026-01-01', title: 'Práctica calificada ' + n, file_name: 'original.pdf', file_path: '/test-' + i + '.pdf', storage_provider: 'public' })) }),
  }; return query;
} }) }));
vi.mock('@/lib/rewardProgress', () => ({ getRewardProgress: async () => ({ total: 0 }) }));
vi.mock('@/lib/rewardCampaignAccess', () => ({ hasRewardCampaignFullAccess: async () => false }));
vi.mock('@/lib/bundledAdminWorksheets', () => ({ resolveBundledAdminWorksheets: () => [] }));
vi.mock('@/lib/zipStream', () => ({ createStoredZipStream: mocks.zip }));
import { GET } from '@/app/api/admin-worksheets/folder-download/route';
const request = (suffix = '') => new Request('https://example.test/api/admin-worksheets/folder-download?courseId=course&examType=practice' + suffix);
beforeEach(() => { vi.clearAllMocks(); mocks.role = 'owner'; mocks.zip.mockReturnValue('zip'); mocks.unlock.mockResolvedValue({ data: null }); });
describe('ZIP de subcarpetas de prácticas', () => {
  it('incluye solo los archivos del número elegido y lo indica en el nombre', async () => {
    const response = await GET(request('&practiceNumber=1'));
    expect(response.status).toBe(200);
    expect(mocks.zip.mock.calls[0][0].map((s: { url: string }) => s.url).sort()).toEqual(['https://example.test/test-0.pdf', 'https://example.test/test-2.pdf']);
    expect(response.headers.get('content-disposition')).toContain('calificada%201');
  });
  it('conserva la descarga de todas las prácticas', async () => {
    expect((await GET(request())).status).toBe(200);
    expect(mocks.zip.mock.calls[0][0]).toHaveLength(3);
  });
  it('no descarga otra carpeta cuando la selección está vacía o no es válida', async () => {
    expect((await GET(request('&practiceNumber=7'))).status).toBe(404);
    expect((await GET(request('&practiceNumber=unknown'))).status).toBe(404);
    expect((await GET(request('&practiceNumber=8'))).status).toBe(400);
    expect(mocks.zip).not.toHaveBeenCalled();
  });
  it('mantiene los permisos del curso al seleccionar una práctica', async () => {
    mocks.role = 'student';
    expect((await GET(request('&practiceNumber=1'))).status).toBe(403);
    expect(mocks.zip).not.toHaveBeenCalled();
  });
});
