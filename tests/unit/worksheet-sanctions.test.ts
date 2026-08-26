import { describe, expect, it, vi } from 'vitest';
import { getWorksheetSanctionState } from '@/lib/worksheetSanctions';

function databaseReturning(data: unknown, error: { message: string } | null = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data, error }),
  } as never;
}

describe('sanciones de planchas', () => {
  it('bloquea permanentemente al alcanzar dos reportes fundados de una categoría', async () => {
    const result = await getWorksheetSanctionState(databaseReturning([
      { report_type: 'fraud', founded_count: '2', latest_reviewed_at: '2026-08-25T00:00:00Z' },
    ]));

    expect(result.isPermanentlyBlocked).toBe(true);
    expect(result.sanctions[0].founded_count).toBe(2);
  });

  it('no bloquea por una sola incidencia', async () => {
    const result = await getWorksheetSanctionState(databaseReturning([
      { report_type: 'harassment', founded_count: 1, latest_reviewed_at: null },
    ]));
    expect(result.isPermanentlyBlocked).toBe(false);
  });

  it('devuelve un estado seguro cuando falla la consulta', async () => {
    const result = await getWorksheetSanctionState(databaseReturning(null, { message: 'Sin conexión' }));
    expect(result).toEqual({ sanctions: [], isPermanentlyBlocked: false, error: 'Sin conexión' });
  });
});
