import { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createStoredZipStream } from '@/lib/zipStream';

beforeAll(() => {
  vi.stubGlobal('ReadableStream', NodeReadableStream);
});

async function readStream(stream: ReadableStream<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.byteLength;
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

describe('createStoredZipStream', () => {
  it('genera un ZIP descargable con todos los archivos y nombres duplicados seguros', async () => {
    const zip = await readStream(createStoredZipStream([
      { name: 'PC 1.pdf', url: 'data:application/pdf;base64,JVBERi0xLjQ=' },
      { name: 'PC 1.pdf', url: 'data:text/plain;base64,c29sdWNpb24=' },
    ]));
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    const text = new TextDecoder().decode(zip);

    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(zip.byteLength - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(zip.byteLength - 12, true)).toBe(2);
    expect(text).toContain('PC 1.pdf');
    expect(text).toContain('PC 1 (2).pdf');
    expect(text).toContain('%PDF-1.4');
    expect(text).toContain('solucion');
  });
});
