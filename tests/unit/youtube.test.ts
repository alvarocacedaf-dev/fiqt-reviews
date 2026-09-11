import { describe, expect, it } from 'vitest';
import { getYouTubeEmbedUrl, getYouTubeVideoId } from '@/lib/youtube';

describe('enlaces de YouTube para materiales', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtube.com/embed/dQw4w9WgXcQ',
    'https://m.youtube.com/shorts/dQw4w9WgXcQ',
    'https://youtube.com/live/dQw4w9WgXcQ',
  ])('reconoce %s', url => {
    expect(getYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('usa el dominio de reproducción con privacidad mejorada', () => {
    expect(getYouTubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it.each([
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'javascript:alert(1)',
    'https://youtube.com/watch?v=demasiado-corto',
  ])('rechaza %s', url => {
    expect(getYouTubeVideoId(url)).toBeNull();
  });
});
