import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn(async () => ({ db: { rpc: mocks.rpc }, user: { id: 'admin-id' } })),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import { moderateVerification } from '@/app/admin/actions';

function verificationForm(status: 'approved' | 'rejected') {
  const form = new FormData();
  form.set('id', '11111111-1111-4111-8111-111111111111');
  form.set('status', status);
  form.set('action_code', 'codigo-prueba');
  form.set('academic_term', '2026-I');
  form.set('section', 'A');
  form.set('notes', 'Revisión de prueba');
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('moderación transaccional de verificaciones', () => {
  it('envía aprobación, parejas y código en una sola llamada RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ ok: true, message: 'Cursos y profesores aprobados correctamente.' }],
      error: null,
    });
    const form = verificationForm('approved');
    form.append(
      'professor_course_ids',
      '22222222-2222-4222-8222-222222222222|33333333-3333-4333-8333-333333333333',
    );

    const result = await moderateVerification({ ok: false, message: '' }, form);

    expect(result.ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('moderate_verification_submission', {
      p_submission_id: '11111111-1111-4111-8111-111111111111',
      p_status: 'approved',
      p_pairs: [{
        course_id: '22222222-2222-4222-8222-222222222222',
        professor_id: '33333333-3333-4333-8333-333333333333',
      }],
      p_academic_term: '2026-I',
      p_section: 'A',
      p_notes: 'Revisión de prueba',
      p_action_code: 'codigo-prueba',
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/verificaciones');
  });

  it('no permite aprobar sin seleccionar curso y profesor', async () => {
    const result = await moderateVerification(
      { ok: false, message: '' },
      verificationForm('approved'),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Selecciona al menos un curso');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('permite rechazar sin parejas y conserva la nota', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ ok: true, message: 'Evidencia rechazada.' }],
      error: null,
    });
    const result = await moderateVerification(
      { ok: false, message: '' },
      verificationForm('rejected'),
    );
    expect(result).toEqual({ ok: true, message: 'Evidencia rechazada.' });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'moderate_verification_submission',
      expect.objectContaining({ p_status: 'rejected', p_pairs: [] }),
    );
  });

  it('muestra el error de base de datos sin afirmar que se completó', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'fallo transaccional' } });
    const result = await moderateVerification(
      { ok: false, message: '' },
      verificationForm('rejected'),
    );
    expect(result).toEqual({
      ok: false,
      message: 'No se pudo completar la verificación: fallo transaccional',
    });
  });
});
