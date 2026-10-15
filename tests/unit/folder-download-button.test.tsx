import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FolderDownloadButton } from '@/components/FolderDownloadButton';

afterEach(() => {
  vi.useRealTimers();
});

describe('FolderDownloadButton', () => {
  it('muestra progreso inmediato y evita que el usuario repita la descarga', () => {
    vi.useFakeTimers();
    render(<FolderDownloadButton url="/api/carpeta.zip" />);

    const link = screen.getByRole('link', { name: 'Descargar carpeta ZIP' });
    fireEvent.click(link);

    expect(screen.getByRole('link', { name: 'Preparando ZIP…' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No necesitas volver a presionar');

    const repeatedClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    screen.getByRole('link', { name: 'Preparando ZIP…' }).dispatchEvent(repeatedClick);
    expect(repeatedClick.defaultPrevented).toBe(true);

    act(() => vi.advanceTimersByTime(2500));
    expect(screen.getByRole('link', { name: 'Descarga iniciada ✓' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(7500));
    expect(screen.getByRole('link', { name: 'Descargar carpeta ZIP' })).toHaveAttribute('aria-disabled', 'false');
  });
});
