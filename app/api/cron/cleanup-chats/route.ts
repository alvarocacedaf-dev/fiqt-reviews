import type { NextRequest } from 'next/server';
import {
  getRequestId,
  observeError,
  observeInfo,
  observeWarning,
  requestIdHeaders,
} from '@/lib/observability';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CHAT_RETENTION_DAYS = 14;
const REPORT_RETENTION_DAYS = 30;
const BATCH_SIZE = 100;

type CleanupJob = {
  id: string;
  thread_id: string;
  status: 'pending' | 'failed';
  chat_attachment_paths: string[];
  report_attachment_paths: string[];
  attempt_count: number;
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
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  const respond = (body: Record<string, unknown>, status = 200) => Response.json(
    { ...body, requestId },
    { status, headers: requestIdHeaders(requestId) },
  );
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    observeWarning('cron.chat_cleanup.unauthorized', { requestId });
    return respond({ ok: false, error: 'Unauthorized' }, 401);
  }

  observeInfo('cron.chat_cleanup.started', { requestId });

  const db = createAdminClient();
  const { data: rawJobs, error: preparationError } = await db.rpc('prepare_chat_cleanup', {
    p_chat_retention_days: CHAT_RETENTION_DAYS,
    p_report_retention_days: REPORT_RETENTION_DAYS,
    p_limit: BATCH_SIZE,
  });

  if (preparationError) {
    observeError('cron.chat_cleanup.preparation_failed', preparationError, {
      requestId,
      provider: 'supabase',
      durationMs: Date.now() - startedAt,
    });
    return respond({ ok: false, error: preparationError.message }, 500);
  }

  const jobs = (rawJobs ?? []) as CleanupJob[];
  if (!jobs.length) {
    observeInfo('cron.chat_cleanup.completed', {
      requestId,
      processedJobs: 0,
      completedJobs: 0,
      failureCount: 0,
      durationMs: Date.now() - startedAt,
    });
    return respond({ ok: true, processedJobs: 0, completedJobs: 0, retriedJobs: 0, failures: [] });
  }

  let completedJobs = 0;
  let retriedJobs = 0;
  const failures: Array<{ threadId: string; error: string }> = [];

  for (const job of jobs) {
    if (job.attempt_count > 0) retriedJobs += 1;
    try {
      await removeStorageFiles(db, 'chat-attachments', job.chat_attachment_paths);
      await removeStorageFiles(db, 'chat-report-evidence', job.report_attachment_paths);

      const { error: completionError } = await db
        .from('chat_cleanup_jobs')
        .update({
          status: 'completed',
          attempt_count: job.attempt_count + 1,
          last_error: null,
          last_attempt_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      if (completionError) throw new Error(`No se registró la finalización: ${completionError.message}`);
      completedJobs += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      await db
        .from('chat_cleanup_jobs')
        .update({
          status: 'failed',
          attempt_count: job.attempt_count + 1,
          last_error: message.slice(0, 1000),
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      observeError('cron.chat_cleanup.thread_failed', error, {
        requestId,
        provider: 'supabase-storage',
        threadId: job.thread_id,
        attemptCount: job.attempt_count + 1,
      });
      failures.push({ threadId: job.thread_id, error: message });
    }
  }

  const result = {
    ok: failures.length === 0,
    processedJobs: jobs.length,
    completedJobs,
    retriedJobs,
    failures,
  };
  const metrics = {
    requestId,
    processedJobs: jobs.length,
    completedJobs,
    retriedJobs,
    failureCount: failures.length,
    durationMs: Date.now() - startedAt,
  };
  if (failures.length) observeError('cron.chat_cleanup.failed', new Error('La limpieza terminó con fallos.'), metrics);
  else observeInfo('cron.chat_cleanup.completed', metrics);

  return respond(result, failures.length ? 500 : 200);
}
