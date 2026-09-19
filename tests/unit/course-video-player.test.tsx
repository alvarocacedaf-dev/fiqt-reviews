import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CourseMaterialFolders } from '@/components/CourseMaterialFolders';
import { CourseVideoPlayer } from '@/components/CourseVideoPlayer';

function mediaMocks() {
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
}

describe('reproducción de clases', () => {
  it('no carga videos hasta elegir uno y libera el anterior al cambiar de clase', async () => {
    mediaMocks();
    const files = [1, 2].map(n => ({ id: String(n), title: `Clase ${n}`, material_type: 'videos' as const,
      academic_term: null, file_name: `${n}.mp4`, mime_type: 'video/mp4', file_size: 100,
      created_at: '', signed_url: `/api/course-materials/${n}/play` }));
    const { container } = render(<CourseMaterialFolders files={files} />);
    const details = container.querySelectorAll('details')[3];
    details.open = true;
    expect(container.querySelectorAll('video')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir Clase 1' }));
    const first = container.querySelector('video')!;
    await waitFor(() => expect(first.getAttribute('src')).toContain('/1/play'));
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir Clase 2' }));
    await waitFor(() => expect(first.hasAttribute('src')).toBe(false));
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(container.querySelector('video')?.getAttribute('src')).toContain('/2/play');
    details.open = false;
    fireEvent(details, new Event('toggle'));
    await waitFor(() => expect(container.querySelector('video')).toBeNull());
  });

  it('permite reintentar con una nueva solicitud después de un error', async () => {
    mediaMocks();
    const { container, unmount } = render(<CourseVideoPlayer id="a" title="Clase" src="/api/course-materials/a/play" active onActivate={() => {}} />);
    const video = container.querySelector('video')!;
    const original = video.getAttribute('src');
    fireEvent.error(video);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar video' }));
    await waitFor(() => expect(video.getAttribute('src')).not.toBe(original));
    fireEvent.canPlay(video);
    expect(screen.queryByRole('button', { name: 'Reintentar video' })).toBeNull();
    unmount();
    expect(video.hasAttribute('src')).toBe(false);
  });
});
