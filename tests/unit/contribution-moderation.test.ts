import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  update: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn(async () => ({
    db: {
      rpc: mocks.rpc,
      from: () => {
        const query = {
          update: mocks.update,
          eq: () => query,
          select: () => query,
          single: vi.fn(async () => ({ data: { id: 'contribution-id' }, error: null })),
        };
        mocks.update.mockReturnValue(query);
        return query;
      },
    },
    user: { id: 'admin-id' },
  })),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import { approveContribution, rejectContribution } from '@/app/admin/yapes/actions';

function contributionForm() {
  const form = new FormData();
  form.set('id', 'contribution-id');
  form.set('action_code', 'codigo-prueba');
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({
    data: [{ code_id: 'code-id', actor_label: 'Asistente' }],
    error: null,
  });
});

describe('moderación de aportes por Yape', () => {
  it('aprueba explícitamente sin depender del valor de un botón submit', async () => {
    await approveContribution(contributionForm());

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
    expect(mocks.redirect).toHaveBeenLastCalledWith('/admin/yapes?success=Comprobante%20aprobado.');
  });

  it('rechaza explícitamente sin depender del valor de un botón submit', async () => {
    await rejectContribution(contributionForm());

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }));
    expect(mocks.redirect).toHaveBeenLastCalledWith('/admin/yapes?success=Comprobante%20rechazado.');
  });
});
