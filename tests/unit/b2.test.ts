import { afterEach, describe, expect, it } from 'vitest';
import { createB2PresignedUrl, isB2Configured } from '@/lib/b2';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('Backblaze B2 signing', () => {
  it('detects the complete configuration and signs a path-style S3 URL', () => {
    process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
    process.env.B2_REGION = 'us-east-005';
    process.env.B2_BUCKET_NAME = 'fiqt-materiales';
    process.env.B2_KEY_ID = 'test-key-id';
    process.env.B2_APPLICATION_KEY = 'test-application-key';

    expect(isB2Configured()).toBe(true);
    const signed = new URL(createB2PresignedUrl('PUT', 'course-materials/curso/archivo con espacio.pdf', 900));

    expect(signed.hostname).toBe('s3.us-east-005.backblazeb2.com');
    expect(signed.pathname).toBe('/fiqt-materiales/course-materials/curso/archivo%20con%20espacio.pdf');
    expect(signed.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(signed.searchParams.get('X-Amz-Credential')).toContain('/us-east-005/s3/aws4_request');
    expect(signed.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(signed.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('reports an incomplete configuration', () => {
    delete process.env.B2_APPLICATION_KEY;
    expect(isB2Configured()).toBe(false);
  });
});
