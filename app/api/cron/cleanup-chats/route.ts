import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;
const CHAT_RETENTION_DAYS = 14;
const REPORT_RETENTION_DAYS = 30;
const BATCH_SIZE = 100;

type ThreadRow = {
  id: string;
  ended_at: string;
};

type ReportRow = {
  id: string;
  thread_id: string;
  reviewed_at: string | null;
};

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function removeStorageFiles(
  db: ReturnType<typeof createAdminClient>,
  bucket: string,
  paths: string[],
) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  for (const batch of chunks(uniquePaths, 1000)) {
    const { error } = await db.storage.from(bucket).remove(batch);
    if (error) throw new Error(`${bucket}: ${error.message}`);
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const now = Date.now();
  const endedBefore = new Date(now - CHAT_RETENTION_DAYS * DAY_MS).toISOString();
  const reviewedBefore = now - REPORT_RETENTION_DAYS * DAY_MS;

  const { data: rawThreads, error: threadsError } = await db
    .from('chat_threads')
    .select('id,ended_at')
    .eq('status', 'ended')
    .not('ended_at', 'is', null)
    .lte('ended_at', endedBefore)
    .order('ended_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (threadsError) {
    return Response.json({ ok: false, error: threadsError.message }, { status: 500 });
  }

  const threads = (rawThreads ?? []) as ThreadRow[];
  if (!threads.length) {
    return Response.json({ ok: true, deletedThreads: 0, skippedThreads: 0 });
  }

  const threadIds = threads.map(thread => thread.id);
  const { data: rawReports, error: reportsError } = await db
    .from('chat_reports')
    .select('id,thread_id,reviewed_at')
    .in('thread_id', threadIds);

  if (reportsError) {
    return Response.json({ ok: false, error: reportsError.message }, { status: 500 });
  }

  const reports = (rawReports ?? []) as ReportRow[];
  const reportsByThread = new Map<string, ReportRow[]>();
  for (const report of reports) {
    reportsByThread.set(report.thread_id, [...(reportsByThread.get(report.thread_id) ?? []), report]);
  }

  let deletedThreads = 0;
  let skippedThreads = 0;
  const failures: Array<{ threadId: string; error: string }> = [];

  for (const thread of threads) {
    const threadReports = reportsByThread.get(thread.id) ?? [];
    const reportMustBeRetained = threadReports.some(report => (
      !report.reviewed_at || new Date(report.reviewed_at).getTime() > reviewedBefore
    ));

    if (reportMustBeRetained) {
      skippedThreads += 1;
      continue;
    }

    try {
      const reportIds = threadReports.map(report => report.id);
      const [
        { data: messages, error: messagesError },
        { data: exchangeFiles, error: exchangeError },
        reportAttachmentsResult,
      ] = await Promise.all([
        db.from('chat_messages').select('attachment_path').eq('thread_id', thread.id),
        db.from('chat_exchange_files').select('file_path').eq('thread_id', thread.id),
        reportIds.length
          ? db.from('chat_report_attachments').select('storage_path').in('report_id', reportIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const lookupError = messagesError || exchangeError || reportAttachmentsResult.error;
      if (lookupError) throw new Error(lookupError.message);

      await removeStorageFiles(db, 'chat-attachments', [
        ...(messages ?? []).map(item => item.attachment_path as string),
        ...(exchangeFiles ?? []).map(item => item.file_path as string),
      ]);
      await removeStorageFiles(
        db,
        'chat-report-evidence',
        (reportAttachmentsResult.data ?? []).map(item => item.storage_path as string),
      );

      const { error: deleteError } = await db.from('chat_threads').delete().eq('id', thread.id);
      if (deleteError) throw new Error(deleteError.message);
      deletedThreads += 1;
    } catch (error) {
      failures.push({
        threadId: thread.id,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  return Response.json(
    { ok: failures.length === 0, deletedThreads, skippedThreads, failures },
    { status: failures.length ? 500 : 200 },
  );
}
