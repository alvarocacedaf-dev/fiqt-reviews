const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function getYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id = '';

    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? '';
    else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v') ?? '';
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split('/')[2] ?? '';
    }

    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function getYouTubeEmbedUrl(value: string): string | null {
  const id = getYouTubeVideoId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
