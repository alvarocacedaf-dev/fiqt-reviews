import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const CAMPAIGN_CODE = 'parciales-2026-10';
const EVENT_KEY = 'historical-full-access-announcement-v1';

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .filter(line => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map(line => {
        const separator = line.indexOf('=');
        return [
          line.slice(0, separator),
          line.slice(separator + 1).replace(/^['"]|['"]$/g, ''),
        ];
      }),
  );
}

function emailHtml() {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#071126;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Tu cuenta ya tiene acceso completo a más de 1,900 planchas de FIQT Reviews.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#071126;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#0b2148;border:1px solid #d9aa35;border-radius:24px;overflow:hidden;box-shadow:0 16px 44px rgba(0,0,0,.35);">
          <tr><td style="padding:30px 34px 24px;border-bottom:1px solid rgba(255,255,255,.12);">
            <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#f4c342;">Beneficio especial por parciales</div>
            <h1 style="margin:8px 0 0;font-size:29px;line-height:1.18;color:#ffffff;">Acceso completo a todas las planchas</h1>
          </td></tr>
          <tr><td style="padding:26px 34px 8px;">
            <div style="background:#202d43;border:1px solid #d9aa35;border-radius:16px;padding:22px;color:#ffffff;font-size:16px;line-height:1.65;">
              <p style="margin:0 0 16px;">Por los exámenes parciales, hemos decidido ser más flexibles con <strong style="color:#f4c342;">Tu ruta de recompensas</strong>.</p>
              <p style="margin:0;">Tu cuenta ya cumple con los requisitos de esta promoción, por lo que hemos habilitado tu <strong style="color:#f4c342;">acceso completo a la página y a sus más de 1,900 planchas</strong>.</p>
            </div>
          </td></tr>
          <tr><td align="center" style="padding:22px 34px 8px;font-size:20px;font-weight:800;color:#f4c342;">¡Muchos éxitos en tus parciales!</td></tr>
          <tr><td align="center" style="padding:18px 34px 34px;">
            <a href="https://www.fiqtreviews.com/ciclos" style="display:block;background:#1d4fa3;border-radius:12px;padding:15px 22px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;">Ingresar a FIQT Reviews</a>
          </td></tr>
        </table>
        <p style="margin:18px auto 0;max-width:620px;color:#9fb0cb;font-size:12px;line-height:1.5;">Recibiste este mensaje porque tu cuenta completó los dos primeros pasos de Tu ruta de recompensas.</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  if (!response.ok) {
    throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
  }
  return body;
}

async function main() {
  throw new Error('La campaña de parciales finalizó; el envío de anuncios está deshabilitado.');
  const root = path.resolve(import.meta.dirname, '..');
  const env = parseEnv(await fs.readFile(path.join(root, '.env.local'), 'utf8'));
  const resendKeyPath = process.argv[2];
  const previewTo = process.argv
    .find(argument => argument.startsWith('--preview-to='))
    ?.slice('--preview-to='.length)
    .trim();
  if (!resendKeyPath) throw new Error('Falta la ruta de la clave temporal de Resend.');

  const resendKey = (await fs.readFile(resendKeyPath, 'utf8')).trim();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !resendKey) throw new Error('Faltan credenciales de envío.');

  if (previewTo) {
    const sent = await jsonRequest('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FIQT Reviews <no-reply@auth.fiqtreviews.com>',
        to: [previewTo],
        subject: '[PRUEBA] 🎉 Ya tienes acceso completo a más de 1,900 planchas',
        html: emailHtml(),
        text: 'Por los exámenes parciales, hemos decidido ser más flexibles con Tu ruta de recompensas. Tu cuenta ya cumple con los requisitos de esta promoción, por lo que hemos habilitado tu acceso completo a la página y a sus más de 1,900 planchas. ¡Muchos éxitos en tus parciales! Ingresa en https://www.fiqtreviews.com/ciclos',
      }),
    });
    process.stdout.write(`${JSON.stringify({ preview: true, sent: Boolean(sent.id) })}\n`);
    return;
  }

  const supabaseHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
  const grants = await jsonRequest(
    `${supabaseUrl}/rest/v1/reward_campaign_full_access?select=user_id&campaign_code=eq.${CAMPAIGN_CODE}&source=eq.preexisting&order=qualified_at.asc`,
    { headers: supabaseHeaders },
  );

  const result = { eligible: grants.length, sent: 0, skipped: 0, failed: 0 };
  for (const grant of grants) {
    const existing = await jsonRequest(
      `${supabaseUrl}/rest/v1/reward_campaign_email_deliveries?select=status&campaign_code=eq.${CAMPAIGN_CODE}&user_id=eq.${grant.user_id}&event_key=eq.${EVENT_KEY}&limit=1`,
      { headers: supabaseHeaders },
    );
    if (existing[0]?.status === 'sent') {
      result.skipped += 1;
      continue;
    }

    const user = await jsonRequest(`${supabaseUrl}/auth/v1/admin/users/${grant.user_id}`, {
      headers: supabaseHeaders,
    });
    if (!user.email) {
      result.failed += 1;
      continue;
    }

    await jsonRequest(
      `${supabaseUrl}/rest/v1/reward_campaign_email_deliveries?on_conflict=campaign_code,user_id,event_key`,
      {
        method: 'POST',
        headers: {
          ...supabaseHeaders,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          campaign_code: CAMPAIGN_CODE,
          user_id: grant.user_id,
          event_key: EVENT_KEY,
          status: 'sending',
          attempted_at: new Date().toISOString(),
          last_error: null,
        }),
      },
    );

    try {
      const sent = await jsonRequest('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `${CAMPAIGN_CODE}-${EVENT_KEY}-${grant.user_id}`,
        },
        body: JSON.stringify({
          from: 'FIQT Reviews <no-reply@auth.fiqtreviews.com>',
          to: [user.email],
          subject: '🎉 Ya tienes acceso completo a más de 1,900 planchas',
          html: emailHtml(),
          text: 'Por los exámenes parciales, hemos decidido ser más flexibles con Tu ruta de recompensas. Tu cuenta ya cumple con los requisitos de esta promoción, por lo que hemos habilitado tu acceso completo a la página y a sus más de 1,900 planchas. ¡Muchos éxitos en tus parciales! Ingresa en https://www.fiqtreviews.com/ciclos',
        }),
      });

      await jsonRequest(
        `${supabaseUrl}/rest/v1/reward_campaign_email_deliveries?campaign_code=eq.${CAMPAIGN_CODE}&user_id=eq.${grant.user_id}&event_key=eq.${EVENT_KEY}`,
        {
          method: 'PATCH',
          headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify({
            status: 'sent',
            resend_email_id: sent.id,
            sent_at: new Date().toISOString(),
            last_error: null,
          }),
        },
      );
      result.sent += 1;
    } catch (error) {
      await jsonRequest(
        `${supabaseUrl}/rest/v1/reward_campaign_email_deliveries?campaign_code=eq.${CAMPAIGN_CODE}&user_id=eq.${grant.user_id}&event_key=eq.${EVENT_KEY}`,
        {
          method: 'PATCH',
          headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'failed', last_error: String(error.message).slice(0, 500) }),
        },
      );
      result.failed += 1;
    }
  }

  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.failed > 0) process.exitCode = 1;
}

await main();
