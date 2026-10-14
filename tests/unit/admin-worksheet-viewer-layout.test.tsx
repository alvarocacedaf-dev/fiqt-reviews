import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminWorksheetViewer } from '@/components/AdminWorksheetViewer';

describe('disposición del visor de planchas', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no centra el contenido desplazable para que un PDF multipágina sea recorrible completo', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));

    render(
      <AdminWorksheetViewer
        fileId="archivo-1"
        fileName="practica.pdf"
        mimeType="application/pdf"
        title="Práctica de prueba"
      />,
    );

    const loadingMessage = screen.getByText('Preparando archivo…');
    const scrollContainer = loadingMessage.closest('section');

    expect(scrollContainer).toHaveClass('overflow-auto');
    expect(scrollContainer).not.toHaveClass('items-center');
    expect(scrollContainer).not.toHaveClass('justify-center');
    expect(loadingMessage.parentElement).toHaveClass('items-center', 'justify-center');
  });
});
