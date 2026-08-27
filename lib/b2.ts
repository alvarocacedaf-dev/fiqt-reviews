import { createHash, createHmac } from 'node:crypto';
import { getRequestId, observeError, observeInfo } from '@/lib/observability';

type B2Method = 'GET' | 'HEAD' | 'PUT' | 'DELETE';

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, character => (
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  ));
}

function encodeObjectKey(key: string) {
  return key.split('/').map(encodeRfc3986).join('/');
}

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function requireB2Config() {
  const endpoint = process.env.B2_ENDPOINT;
  const region = process.env.B2_REGION;
  const bucket = process.env.B2_BUCKET_NAME;
  const keyId = process.env.B2_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;

  if (!endpoint || !region || !bucket || !keyId || !applicationKey) {
    throw new Error('Faltan B2_ENDPOINT, B2_REGION, B2_BUCKET_NAME, B2_KEY_ID o B2_APPLICATION_KEY.');
  }

  const endpointUrl = new URL(endpoint);
  if (endpointUrl.protocol !== 'https:' || (endpointUrl.pathname !== '/' && endpointUrl.pathname !== '')) {
    throw new Error('B2_ENDPOINT debe ser una URL HTTPS sin rutas adicionales.');
  }

  return { host: endpointUrl.host, region, bucket, keyId, applicationKey };
}

export function isB2Configured() {
  return Boolean(
    process.env.B2_ENDPOINT
      && process.env.B2_REGION
      && process.env.B2_BUCKET_NAME
      && process.env.B2_KEY_ID
      && process.env.B2_APPLICATION_KEY,
  );
}

export function createB2PresignedUrl(method: B2Method, key: string, expiresInSeconds = 900) {
  const { host, region, bucket, keyId, applicationKey } = requireB2Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const service = 's3';
  const canonicalUri = `/${encodeRfc3986(bucket)}/${encodeObjectKey(key)}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const parameters: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${keyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(Math.min(Math.max(expiresInSeconds, 1), 604800)),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${encodeRfc3986(name)}=${encodeRfc3986(value)}`)
    .join('&');
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');
  const dateKey = hmac(`AWS4${applicationKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export async function deleteB2Object(key: string) {
  const requestId = getRequestId();
  const startedAt = Date.now();
  const response = await fetch(createB2PresignedUrl('DELETE', key), { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    const error = new Error(`Backblaze B2 rechazó la eliminación del archivo (${response.status}).`);
    observeError('storage.b2.delete_failed', error, {
      requestId,
      provider: 'b2',
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
  observeInfo('storage.b2.delete_completed', {
    requestId,
    provider: 'b2',
    status: response.status,
    durationMs: Date.now() - startedAt,
  });
}
