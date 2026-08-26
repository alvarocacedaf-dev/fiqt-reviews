import { randomUUID } from 'node:crypto';

type LogLevel = 'info' | 'warn' | 'error';
type LogFields = Record<string, unknown>;

const SENSITIVE_KEY = /(authorization|cookie|password|secret|token|action_code|api[_-]?key|credential)/i;

function sanitize(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key)) return '[REDACTED]';
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(process.env.NODE_ENV === 'development' ? { stack: value.stack } : {}),
    };
  }
  if (value instanceof URL) return `${value.origin}${value.pathname}`;
  if (Array.isArray(value)) return value.map(item => sanitize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => (
        [childKey, sanitize(childValue, childKey)]
      )),
    );
  }
  return value;
}

function write(level: LogLevel, event: string, fields: LogFields = {}) {
  const entry = JSON.stringify(sanitize({
    timestamp: new Date().toISOString(),
    level,
    event,
    service: 'fiqt-reviews',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    ...fields,
  }));

  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.info(entry);
}

export function getRequestId(request?: Request) {
  const supplied = request?.headers.get('x-request-id')?.trim();
  return supplied && /^[A-Za-z0-9._-]{8,128}$/.test(supplied) ? supplied : randomUUID();
}

export function requestIdHeaders(requestId: string) {
  return { 'X-Request-Id': requestId };
}

export function observeInfo(event: string, fields?: LogFields) {
  write('info', event, fields);
}

export function observeWarning(event: string, fields?: LogFields) {
  write('warn', event, fields);
}

export function observeError(event: string, error: unknown, fields?: LogFields) {
  write('error', event, { ...fields, error });
}
