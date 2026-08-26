// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRequestId, observeError, requestIdHeaders } from '@/lib/observability';

describe('observabilidad estructurada', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reutiliza identificadores válidos y rechaza valores inseguros', () => {
    const validRequest = new Request('http://localhost', {
      headers: { 'x-request-id': 'request-seguro-123' },
    });
    const unsafeRequest = new Request('http://localhost', {
      headers: { 'x-request-id': 'corto' },
    });

    expect(getRequestId(validRequest)).toBe('request-seguro-123');
    expect(getRequestId(unsafeRequest)).toMatch(/^[0-9a-f-]{36}$/);
    expect(requestIdHeaders('request-seguro-123')).toEqual({ 'X-Request-Id': 'request-seguro-123' });
  });

  it('registra errores como JSON sin exponer secretos', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    observeError('test.failed', new Error('fallo controlado'), {
      requestId: 'request-seguro-123',
      password: 'no-debe-aparecer',
      authorization: 'Bearer secreto',
      nested: { action_code: '123456' },
    });

    const entry = JSON.parse(String(consoleError.mock.calls[0][0]));
    expect(entry.event).toBe('test.failed');
    expect(entry.requestId).toBe('request-seguro-123');
    expect(entry.password).toBe('[REDACTED]');
    expect(entry.authorization).toBe('[REDACTED]');
    expect(entry.nested.action_code).toBe('[REDACTED]');
    expect(entry.error.message).toBe('fallo controlado');
  });
});
