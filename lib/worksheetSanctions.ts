import { createClient } from '@/lib/supabase/server';

type AppDb = Awaited<ReturnType<typeof createClient>>;

export type SeriousReportCategory = 'harassment' | 'fraud';

export type WorksheetSanction = {
  report_type: SeriousReportCategory;
  founded_count: number;
  latest_reviewed_at: string | null;
};

export type WorksheetSanctionState = {
  sanctions: WorksheetSanction[];
  isPermanentlyBlocked: boolean;
  error: string | null;
};

export const seriousReportCategoryLabels: Record<SeriousReportCategory, string> = {
  harassment: 'Acoso',
  fraud: 'Fraude',
};

export async function getWorksheetSanctionState(
  db: AppDb,
): Promise<WorksheetSanctionState> {
  const { data, error } = await db.rpc('get_my_worksheet_sanctions');

  if (error) {
    return {
      sanctions: [],
      isPermanentlyBlocked: false,
      error: error.message,
    };
  }

  const sanctions = ((data ?? []) as Array<{
    report_type: SeriousReportCategory;
    founded_count: number | string;
    latest_reviewed_at: string | null;
  }>).map(row => ({
    report_type: row.report_type,
    founded_count: Number(row.founded_count),
    latest_reviewed_at: row.latest_reviewed_at,
  }));

  return {
    sanctions,
    isPermanentlyBlocked: sanctions.some(sanction => sanction.founded_count >= 2),
    error: null,
  };
}
