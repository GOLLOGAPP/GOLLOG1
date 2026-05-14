import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://bkljbfqvlepmmwwylfdv.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

let _config = null;

export async function getConfig() {
  if (_config) return _config;
  const { data } = await supabase.from('configuracoes').select('chave, valor');
  _config = Object.fromEntries((data || []).map(r => [r.chave, r.valor || '']));
  return _config;
}

export function clearConfigCache() {
  _config = null;
}

export async function sendWhatsApp(phone, mensagem, config = null) {
  const cfg = config || await getConfig();
  const webhook = cfg.botconversa_webhook_notificacoes;
  if (!webhook || !phone) return false;
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, mensagem }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendEmail(to, subject, html, config = null) {
  const cfg = config || await getConfig();
  const apiKey = cfg.resend_api_key;
  const from = cfg.resend_from_email || 'GOLLOG <noreply@gollog.com.br>';
  if (!apiKey || !to) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function emailTemplate(titulo, corpo, ctaUrl = '', ctaLabel = '') {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
        <tr>
          <td style="background:#F37021;padding:20px 32px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:1px">GOLLOG</h1>
            <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px">Logística com qualidade</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:20px">${titulo}</h2>
            <div style="color:#444;font-size:15px;line-height:1.6">${corpo}</div>
            ${ctaUrl ? `
            <div style="text-align:center;margin:28px 0 8px">
              <a href="${ctaUrl}" style="background:#F37021;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block">${ctaLabel}</a>
            </div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #eee">
            <p style="color:#999;font-size:12px;margin:0">© 2026 GOLLOG · Todos os direitos reservados</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
