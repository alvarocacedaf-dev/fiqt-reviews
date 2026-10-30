# Owner activity dashboard

- Route: `/admin/actividad`. Only `owner` may load the page, query the API or read telemetry through RLS/RPC. Delegated `admin` users are denied.
- Apply migration `059_owner_activity.sql` before deploying. It was applied to the current Supabase project during implementation. No new environment variables are required.
- The browser submits coarse section names, page views and download clicks every 30 seconds while visible. Server-side session validation supplies the account ID; request bodies cannot impersonate users. Signed HttpOnly cookies identify anonymous browsers; HMAC-derived tab IDs prevent overwriting another session.
- Presence is active after interaction within 120 seconds and expires after 75 seconds without a signal. This is approximate, not proof of attention. Multiple tabs/devices of a signed-in account are grouped.
- Real review, verification and contribution inserts produce operational events through database triggers. Download clicks do not prove completed downloads.
- Navigation tracking excludes administration, auth callback URLs, arbitrary paths, queries, form values and chat contents. It respects Do Not Track and the per-browser opt-out. See `/privacidad`.
- Raw events have 30-day retention; presence rows have 2-day retention. One ingestion request per hour performs cleanup. If there is no traffic, cleanup runs on the next ingestion. Each visible tab sends about 120 requests/hour; heartbeat updates reuse rows rather than creating event records.
- Dashboard queries use rolling 24-hour/7-day/30-day periods; daily grouping uses America/Lima. Anonymous-to-account transitions and cleared cookies can inflate unique visitor estimates.
- The owner-role protection trigger also prevents delegated administrators from granting themselves owner permissions.
- Regression checks: `npm.cmd run typecheck`, `npm.cmd run test:unit`. Run `work/verify-owner-activity.sql` in SQL Editor for a rollback-only database permission and ingestion check. It needs existing owner and delegated-admin accounts and leaves no persistent test changes.
