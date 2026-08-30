import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContributionModal } from '@/components/ContributionModal';

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: supabaseMocks.getUser },
    storage: { from: () => ({ upload: supabaseMocks.upload, remove: supabaseMocks.remove }) },
    from: () => ({ insert: supabaseMocks.insert }),
  }),
}));

describe('ContributionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    supabaseMocks.upload.mockResolvedValue({ error: null });
    supabaseMocks.remove.mockResolvedValue({ error: null });
    supabaseMocks.insert.mockResolvedValue({ error: null });
  });

  function prepareSubmission() {
    render(<ContributionModal initialStatus={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Aporte a la página/i }));
    const fileInput = screen.getByLabelText(/Sube aquí tu comprobante/i);
    fireEvent.change(fileInput, { target: { files: [new File(['imagen'], 'yape.png', { type: 'image/png' })] } });
    const form = screen.getByRole('button', { name: 'Enviar' }).closest('form');
    expect(form).not.toBeNull();
    return form!;
  }

  it('envía una sola carga ante dos submissions rápidos', async () => {
    const form = prepareSubmission();
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
    await waitFor(() => expect(supabaseMocks.upload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(supabaseMocks.insert).toHaveBeenCalledTimes(1));
  });

  it('confirma visualmente que el comprobante quedó pendiente', async () => {
    fireEvent.submit(prepareSubmission());

    expect(await screen.findByText('Comprobante enviado. Quedó pendiente de revisión.')).toBeVisible();
    expect(screen.getByText('Tu comprobante está pendiente de revisión. No necesitas enviarlo nuevamente.')).toBeVisible();
  });

  it('muestra el error y vuelve a habilitar el botón si falla la carga', async () => {
    supabaseMocks.upload.mockResolvedValue({ error: { message: 'Bucket no disponible' } });
    fireEvent.submit(prepareSubmission());

    expect(await screen.findByText('No se pudo subir la imagen: Bucket no disponible')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });
});
