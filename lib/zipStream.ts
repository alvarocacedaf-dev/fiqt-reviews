type ZipSource = {
  name: string;
  url: string;
};

const encoder = new TextEncoder();
const crcTable = new Uint32Array(256);

for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  crcTable[index] = value >>> 0;
}

function updateCrc32(crc: number, chunk: Uint8Array) {
  let value = crc;
  for (const byte of chunk) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return value >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function binary(length: number, write: (view: DataView) => void) {
  const bytes = new Uint8Array(length);
  write(new DataView(bytes.buffer));
  return bytes;
}

function safeZipName(name: string, position: number) {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').trim();
  return cleaned || `archivo-${position + 1}`;
}

export function createStoredZipStream(sources: ZipSource[]) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const centralEntries: Uint8Array[] = [];
      const usedNames = new Map<string, number>();
      let offset = 0;

      const enqueue = (chunk: Uint8Array) => {
        controller.enqueue(chunk);
        offset += chunk.byteLength;
      };

      try {
        for (const [position, source] of sources.entries()) {
          const baseName = safeZipName(source.name, position);
          const duplicate = usedNames.get(baseName) ?? 0;
          usedNames.set(baseName, duplicate + 1);
          const dot = baseName.lastIndexOf('.');
          const uniqueName = duplicate === 0
            ? baseName
            : dot > 0
              ? `${baseName.slice(0, dot)} (${duplicate + 1})${baseName.slice(dot)}`
              : `${baseName} (${duplicate + 1})`;
          const name = encoder.encode(uniqueName);
          const localOffset = offset;
          const timestamp = dosDateTime();
          const localHeader = binary(30, view => {
            view.setUint32(0, 0x04034b50, true);
            view.setUint16(4, 20, true);
            view.setUint16(6, 0x0808, true);
            view.setUint16(8, 0, true);
            view.setUint16(10, timestamp.time, true);
            view.setUint16(12, timestamp.date, true);
            view.setUint16(26, name.byteLength, true);
          });
          enqueue(localHeader);
          enqueue(name);

          const response = await fetch(source.url, { cache: 'no-store' });
          if (!response.ok || !response.body) throw new Error(`No se pudo incluir ${uniqueName} en el ZIP.`);

          let size = 0;
          let crc = 0xffffffff;
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 0xffffffff) throw new Error('Uno de los archivos supera el tamaño admitido por el ZIP.');
            crc = updateCrc32(crc, value);
            enqueue(value);
          }
          crc = (crc ^ 0xffffffff) >>> 0;

          enqueue(binary(16, view => {
            view.setUint32(0, 0x08074b50, true);
            view.setUint32(4, crc, true);
            view.setUint32(8, size, true);
            view.setUint32(12, size, true);
          }));

          const centralHeader = binary(46, view => {
            view.setUint32(0, 0x02014b50, true);
            view.setUint16(4, 20, true);
            view.setUint16(6, 20, true);
            view.setUint16(8, 0x0808, true);
            view.setUint16(10, 0, true);
            view.setUint16(12, timestamp.time, true);
            view.setUint16(14, timestamp.date, true);
            view.setUint32(16, crc, true);
            view.setUint32(20, size, true);
            view.setUint32(24, size, true);
            view.setUint16(28, name.byteLength, true);
            view.setUint32(42, localOffset, true);
          });
          const centralEntry = new Uint8Array(centralHeader.byteLength + name.byteLength);
          centralEntry.set(centralHeader);
          centralEntry.set(name, centralHeader.byteLength);
          centralEntries.push(centralEntry);
        }

        const centralOffset = offset;
        for (const entry of centralEntries) enqueue(entry);
        const centralSize = offset - centralOffset;
        enqueue(binary(22, view => {
          view.setUint32(0, 0x06054b50, true);
          view.setUint16(8, centralEntries.length, true);
          view.setUint16(10, centralEntries.length, true);
          view.setUint32(12, centralSize, true);
          view.setUint32(16, centralOffset, true);
        }));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
