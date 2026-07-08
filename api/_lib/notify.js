import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://bkljbfqvlepmmwwylfdv.supabase.co',
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbGpiZnF2bGVwbW13d3lsZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTIzMjksImV4cCI6MjA5NDE4ODMyOX0.H9AI_tTC00T_Oidd9gKkwyNi08xLjSq9sqqo50TItsU'
);

let _config = null;

// Normaliza telefone para apenas dígitos, sem o prefixo 55 (formato "sem55").
// Tolera qualquer formatação: "(11) 98765-4321", "5511987654321", "11987654321" → "11987654321"
export function normalizePhone(raw) {
  const d = (raw || '').replace(/\D/g, '');
  return d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
}

// Verifica se já existe cliente com este telefone, comparando SÓ os dígitos.
// Busca candidatos pelos últimos 4 dígitos (contíguos em qualquer formato) e
// confirma o match no JS — imune a diferenças de máscara/parênteses/prefixo 55.
export async function clienteJaCadastrado(metaPhone) {
  const local = normalizePhone(metaPhone);
  if (!local || local.length < 8) return false;
  const last4 = local.slice(-4);
  const { data } = await supabase
    .from('clientes')
    .select('id, telefone, telefone2')
    .or(`telefone.ilike.%${last4},telefone2.ilike.%${last4}`);
  return (data || []).some(
    c => normalizePhone(c.telefone) === local || normalizePhone(c.telefone2) === local
  );
}

// Resolve o cliente pelo telefone comparando só os dígitos. Retorna { id, nome } ou null.
export async function buscarClientePorTelefone(metaPhone) {
  const local = normalizePhone(metaPhone);
  if (!local || local.length < 8) return null;
  const last4 = local.slice(-4);
  const { data } = await supabase
    .from('clientes')
    .select('id, nome_razao_social, telefone, telefone2')
    .or(`telefone.ilike.%${last4},telefone2.ilike.%${last4}`);
  const cli = (data || []).find(
    c => normalizePhone(c.telefone) === local || normalizePhone(c.telefone2) === local
  );
  return cli ? { id: cli.id, nome: cli.nome_razao_social } : null;
}

// Rede de segurança: marca como "convertido" qualquer cadastro_iniciado pendente
// deste telefone, independente da sessão do navegador onde o cadastro foi feito.
export async function marcarCadastroConvertido(metaPhone) {
  const local = normalizePhone(metaPhone);
  if (!local || local.length < 8) return 0;
  const { data } = await supabase
    .from('followups')
    .select('id, metadata')
    .eq('tipo', 'cadastro_iniciado')
    .eq('status', 'pendente');
  const ids = (data || [])
    .filter(f => normalizePhone(f.metadata?.telefone) === local)
    .map(f => f.id);
  if (ids.length) {
    await supabase
      .from('followups')
      .update({ status: 'convertido', sent_at: new Date().toISOString() })
      .in('id', ids);
  }
  return ids.length;
}

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
  const from = cfg.resend_from_email || 'GOLLOG <noreply@golcargo.com.br>';
  if (!apiKey) return { ok: false, error: 'resend_api_key não configurada' };
  if (!to) return { ok: false, error: 'destinatário não informado' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (res.ok) return { ok: true, error: null };
    let body = {};
    try { body = await res.json(); } catch { /* ignore */ }
    return { ok: false, error: body.message || body.error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e.message };
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
