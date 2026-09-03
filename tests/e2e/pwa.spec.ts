import { expect, test } from '@playwright/test';

const safari17 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1';

test('Safari 17 receives installation metadata inside the initial HTML head', async ({ request }) => {
  const response = await request.get('/', { headers: { 'user-agent': safari17 } });
  expect(response.status()).toBe(200);
  const html = await response.text();
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';

  // Inspect the HTTP response, not a hydrated DOM that may relocate late tags.
  expect(head).toContain('<title>FIQT</title>');
  expect(head).toMatch(/<link\b[^>]*rel="manifest"[^>]*href="\/manifest\.webmanifest"/);
  expect(head).toMatch(/<meta\b[^>]*name="apple-mobile-web-app-capable"[^>]*content="yes"/);
  expect(head).toMatch(/<meta\b[^>]*name="apple-mobile-web-app-title"[^>]*content="FIQT"/);
  expect(head).toMatch(/<link\b[^>]*rel="apple-touch-icon"/);

  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.status()).toBe(200);
  expect(await manifestResponse.json()).toMatchObject({
    name: 'FIQT', short_name: 'FIQT', display: 'standalone', start_url: '/', scope: '/',
  });
});
