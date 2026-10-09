import { afterEach, describe, expect, it, vi } from 'vitest';
import { createR2PresignedUrl } from '@/lib/r2';

afterEach(() => vi.unstubAllEnvs());

describe('URL firmada de R2', () => {
  it('firma la disposición y el nombre visible solicitados para el visor', () => {
    vi.stubEnv('R2_ACCOUNT_ID', 'account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'access-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret-key');
    vi.stubEnv('R2_BUCKET_NAME', 'worksheets');

    const disposition = "inline; filename=\"Practica.jpg\"; filename*=UTF-8''Pr%C3%A1ctica.jpg";
    const url = new URL(createR2PresignedUrl('GET', 'folder/file.jpg', 300, {
      responseContentDisposition: disposition,
    }));

    expect(url.searchParams.get('response-content-disposition')).toBe(disposition);
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/);
  });
});
