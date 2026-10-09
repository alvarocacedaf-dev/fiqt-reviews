import { createHash, createHmac } from 'node:crypto';
import { getRequestId, observeError, observeInfo } from '@/lib/observability';

type R2Method = 'GET' | 'HEAD' | 'PUT' | 'DELETE';

function requireR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      'Faltan R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY o R2_BUCKET_NAME.',
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket };
}

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

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID
      && process.env.R2_ACCESS_KEY_ID
      && process.env.R2_SECRET_ACCESS_KEY
      && process.env.R2_BUCKET_NAME,
  );
}

export function createR2PresignedUrl(
  method: R2Method,
  key: string,
  expiresInSeconds = 900,
) {
  const { accountId, accessKeyId, secretAccessKey, bucket } = requireR2Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeRfc3986(bucket)}/${encodeObjectKey(key)}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const parameters: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
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
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export async function deleteR2Object(key: string) {
  const requestId = getRequestId();
  const startedAt = Date.now();
  const response = await fetch(createR2PresignedUrl('DELETE', key), { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    const error = new Error(`R2 rechazó la eliminación del archivo (${response.status}).`);
    observeError('storage.r2.delete_failed', error, {
      requestId,
      provider: 'r2',
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
  observeInfo('storage.r2.delete_completed', {
    requestId,
    provider: 'r2',
    status: response.status,
    durationMs: Date.now() - startedAt,
  });
}
