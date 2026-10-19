import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewForm } from '@/components/ReviewForm';
import { VerificationForm } from '@/components/VerificationForm';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  insertReview: vi.fn(),
  insertVerification: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
  digest: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    storage: {
      from: () => ({ upload: mocks.upload, remove: mocks.remove }),
    },
    from: (table: string) => {
      if (table === 'reviews') return { insert: mocks.insertReview };
      if (table === 'verification_submissions') return { insert: mocks.insertVerification };

      const verificationQuery = {
        select: () => verificationQuery,
        eq: () => verificationQuery,
        limit: vi.fn().mockResolvedValue({ data: [{ id: 'verified-1' }] }),
      };
      return verificationQuery;
    },
  }),
}));

describe('respuesta inmediata de acciones principales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-uuid'),
      subtle: { digest: mocks.digest },
    });
    mocks.digest.mockResolvedValue(new Uint8Array(32).buffer);
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.insertReview.mockResolvedValue({ error: null });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.insertVerification.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
  });

  it('bloquea el botón y evita dos envíos rápidos de una reseña', async () => {
    let finishInsert: ((value: { error: null }) => void) | undefined;
    mocks.insertReview.mockImplementation(() => new Promise(resolve => { finishInsert = resolve; }));

    render(<ReviewForm courseId="course-1" professorId="professor-1" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2026-1' } });
    for (const name of [
      'clarity_rating',
      'difficulty_rating',
      'fairness_rating',
      'workload_rating',
      'treatment_rating',
      'course_demand_rating',
    ]) {
      const input = document.querySelector<HTMLInputElement>(`input[name="${name}"][value="8"]`)!;
      fireEvent.click(input);
    }
    fireEvent.click(document.querySelector<HTMLInputElement>('input[name="recommendation"][value="like"]')!);
    fireEvent.change(screen.getByPlaceholderText('Escribe aquí tu experiencia académica.'), {
      target: { value: 'Explicó claramente los temas del curso.' },
    });

    const form = screen.getByRole('button', { name: 'Enviar a moderación' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(await screen.findByRole('button', { name: 'Enviando reseña…' })).toBeDisabled();
    await waitFor(() => expect(mocks.insertReview).toHaveBeenCalledTimes(1));
    finishInsert?.({ error: null });
    expect(await screen.findByText(/Gracias por tu reseña/i)).toBeVisible();
  });

  it('muestra progreso y evita dos envíos rápidos de una evidencia', async () => {
    const user = userEvent.setup();
    let finishUpload: ((value: { error: null }) => void) | undefined;
    mocks.upload.mockImplementation(() => new Promise(resolve => { finishUpload = resolve; }));

    render(<VerificationForm />);
    await user.upload(
      screen.getByLabelText('Evidencia académica'),
      new File(['evidencia'], 'carnet.png', { type: 'image/png' }),
    );

    const form = screen.getByRole('button', { name: 'Enviar para revisión' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(await screen.findByRole('button', { name: 'Enviando evidencia…' })).toBeDisabled();
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(1));
    finishUpload?.({ error: null });
    expect(await screen.findByText('Evidencia enviada. Quedó pendiente de revisión.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Evidencia enviada' })).toBeDisabled();
    fireEvent.submit(form);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });

  it('elimina la segunda subida y explica que el mismo archivo ya está pendiente', async () => {
    const user = userEvent.setup();
    mocks.insertVerification.mockResolvedValue({
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    render(<VerificationForm />);
    await user.upload(
      screen.getByLabelText('Evidencia académica'),
      new File(['duplicada'], 'boleta.pdf', { type: 'application/pdf' }),
    );
    const form = screen.getByRole('button', { name: 'Enviar para revisión' }).closest('form')!;
    fireEvent.submit(form);

    expect(await screen.findByText(/Este mismo archivo ya fue enviado/i)).toBeVisible();
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Evidencia enviada' })).toBeDisabled();
  });

  it('permite iniciar el envío de una evidencia diferente después de la primera', async () => {
    const user = userEvent.setup();
    render(<VerificationForm />);

    await user.upload(
      screen.getByLabelText('Evidencia académica'),
      new File(['primera'], 'primera.pdf', { type: 'application/pdf' }),
    );
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar para revisión' }).closest('form')!);
    expect(await screen.findByText('Evidencia enviada. Quedó pendiente de revisión.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Enviar otra evidencia' }));
    await user.upload(
      screen.getByLabelText('Evidencia académica'),
      new File(['segunda'], 'segunda.pdf', { type: 'application/pdf' }),
    );
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar para revisión' }).closest('form')!);

    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(2));
    expect(mocks.insertVerification).toHaveBeenCalledTimes(2);
  });
});
