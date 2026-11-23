import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ access: vi.fn(), download: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/liveExamBank', async () => {
  const { getExamBank } = await import('@/lib/examQuestionBank');
  return { getLiveExamBank: async (key: Parameters<typeof getExamBank>[0]) => getExamBank(key) };
});
vi.mock('@/lib/physicsExamAccess', () => ({ physicsExamAccess: mocks.access }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: mocks.rpc, storage: { from: () => ({ download: mocks.download }) } }) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) } }) }));
import { POST as generate } from '@/app/api/practice-exams/physics-pc1/route';
import { POST as pdf } from '@/app/api/practice-exams/physics-pc1/pdf/route';
import { GET as image } from '@/app/api/practice-exams/physics-pc1/question/route';
import { physicsPC1Bank } from '@/lib/examQuestionBank';
import organicFinal from '@/data/question-banks/qu328-final.json';
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

describe('finales de Química Orgánica I', () => {
  const organicRequest = (body: unknown) => new Request('https://example.test/api?bank=qu328-final', {
    method: 'POST', body: JSON.stringify(body),
  });
  it('usa permisos del curso de química e historial independiente', async () => {
    const response = await generate(organicRequest({ count: 6 }));
    expect(response.status).toBe(200);
    const { questions } = await response.json();
    expect(questions).toHaveLength(6);
    expect(new Set(questions.map((q: { id: string }) => q.id)).size).toBe(6);
    for (const q of questions) expect(q.id).toMatch(/^qu328-final-/);
    expect(mocks.access).toHaveBeenCalledWith(organicFinal.courseId);
    expect(mocks.rpc).toHaveBeenCalledWith('reserve_live_exam_combination',
      expect.objectContaining({ p_bank_key: 'qu328-final', p_count: 6 }));
    expect((await generate(organicRequest({ count: 7 }))).status).toBe(400);
  });
  it.each([401, 403])('protege generación, PDF y recortes: %s', async status => {
    mocks.access.mockResolvedValue(status);
    const id = organicFinal.questions[0].id;
    expect((await generate(organicRequest({ count: 2 }))).status).toBe(status);
    expect((await pdf(organicRequest({ ids: [id] }))).status).toBe(status);
    expect((await image(new Request('https://example.test/?bank=qu328-final&id=' + id))).status).toBe(status);
    expect(mocks.access).toHaveBeenCalledTimes(3);
    for (const args of mocks.access.mock.calls) expect(args).toEqual([organicFinal.courseId]);
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('rechaza preguntas de otros cursos y bancos desconocidos', async () => {
    expect((await pdf(organicRequest({ ids: [physicsPC1Bank.questions[0].id] }))).status).toBe(400);
    expect((await pdf(request({ ids: [organicFinal.questions[0].id] }))).status).toBe(400);
    expect((await image(new Request('https://example.test/?bank=qu328-final&id=' + physicsPC1Bank.questions[0].id))).status).toBe(404);
    const unknown = new Request('https://example.test/?bank=unknown', { method: 'POST', body: '{"count":2}' });
    expect((await generate(unknown)).status).toBe(400);
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

it('reserva seis preguntas de PC2 con historial propio y rechaza IDs de PC1 en su PDF', async () => {
  const pc2Request = (body: unknown) => new Request('https://example.test/api?practice=2', {
    method: 'POST', body: JSON.stringify(body),
  });
  const response = await generate(pc2Request({ count: 6 }));
  expect(response.status).toBe(200);
  const { questions } = await response.json();
  expect(questions).toHaveLength(6);
  for (const question of questions) expect(question.id).toMatch(/^bfi01-pc2-/);
  expect(mocks.rpc).toHaveBeenCalledWith('reserve_live_exam_combination',
    expect.objectContaining({ p_bank_key: 'bfi01-pc2', p_count: 6 }));
  expect((await pdf(pc2Request({ ids: [physicsPC1Bank.questions[0].id] }))).status).toBe(400);
  expect((await pdf(request({ ids: [questions[0].id] }))).status).toBe(400);
});
