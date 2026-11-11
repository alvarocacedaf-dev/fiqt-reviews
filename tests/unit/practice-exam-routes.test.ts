import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ access: vi.fn(), download: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/physicsExamAccess', () => ({ physicsExamAccess: mocks.access }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: mocks.rpc, storage: { from: () => ({ download: mocks.download }) } }) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) } }) }));
import { POST as generate } from '@/app/api/practice-exams/physics-pc1/route';
import { POST as pdf } from '@/app/api/practice-exams/physics-pc1/pdf/route';
import { GET as image } from '@/app/api/practice-exams/physics-pc1/question/route';
import { physicsPC1Bank } from '@/lib/examQuestionBank';
const request = (body: unknown) => new Request('https://example.test/api', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.access.mockResolvedValue(200); mocks.rpc.mockResolvedValue({ data: [{ combination_rank: 0, restarted: false }], error: null }); });
describe('generador privado', () => {
  it.each([401, 403])('bloquea todas las salidas sin permiso: %s', async status => {
    mocks.access.mockResolvedValue(status);
    expect((await generate(request({ count: 5 }))).status).toBe(status);
    expect((await pdf(request({ ids: [physicsPC1Bank.questions[0].id] }))).status).toBe(status);
    expect((await image(new Request('https://example.test/?id=' + physicsPC1Bank.questions[0].id))).status).toBe(status);
    expect(mocks.download).not.toHaveBeenCalled();
  });
  it('genera sin exponer claves de almacenamiento y rechaza cantidades inválidas', async () => {
    const response = await generate(request({ count: 5 }));
    const data = await response.json();
    expect(data.questions).toHaveLength(5);
    expect(data.questions[0]).not.toHaveProperty('assetPath');
    expect((await generate(request({ count: '5' }))).status).toBe(400);
    expect((await generate(request({ count: 7 }))).status).toBe(400);
    expect((await pdf(request({ ids: physicsPC1Bank.questions.slice(0, 7).map(q => q.id) }))).status).toBe(400);
  });
  it('no genera sin guardar el historial', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'offline' }, data: null });
    expect((await generate(request({ count: 5 }))).status).toBe(503);
  });
  it('rechaza IDs desconocidos y repetidos antes de acceder al almacenamiento', async () => {
    const id = physicsPC1Bank.questions[0].id;
    for (const ids of [[], ['unknown'], [id, id]]) expect((await pdf(request({ ids }))).status).toBe(400);
    expect((await image(new Request('https://example.test/?id=unknown'))).status).toBe(404);
    expect(mocks.download).not.toHaveBeenCalled();
  });
});
