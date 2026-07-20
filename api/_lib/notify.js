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

// Formato exigido pelo BotConversa: 55 + DDD + número. Sem o 55 ele não resolve
// o subscriber — responde 200 no webhook e não dispara nada.
export function toInternational(raw) {
  const d = (raw || '').replace(/\D/g, '');
  if (!d) return '';
  return d.startsWith('55') && d.length >= 12 ? d : `55${d}`;
}

// O webhook de entrada do BotConversa responde 200 mesmo quando não conhece o
// contato — e não entrega nada. Ou seja: o status do webhook NÃO é sinal de
// entrega. A única forma de saber é perguntar se o subscriber existe.
export async function subscriberExisteBC(phoneInternacional, config = null) {
  const cfg = config || await getConfig();
  const apiKey = cfg.botconversa_api_key;
  if (!apiKey) return { existe: false, motivo: 'botconversa_api_key não configurada' };
  if (!phoneInternacional) return { existe: false, motivo: 'telefone vazio' };
  try {
    const r = await fetch(
      `https://backend.botconversa.com.br/api/v1/webhook/subscriber/get_by_phone/${phoneInternacional}/`,
      { headers: { 'API-KEY': apiKey } }
    );
    if (r.ok) return { existe: true, motivo: null };
    if (r.status === 404) return { existe: false, motivo: 'contato não existe no BotConversa' };
    return { existe: false, motivo: `BotConversa respondeu HTTP ${r.status}` };
  } catch (e) {
    return { existe: false, motivo: `erro de rede: ${e.message}` };
  }
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

// Padrão de nome do contato no BotConversa — regra em shared/nomeBotConversa.js.
// Reexportado aqui para não quebrar quem já importa deste módulo.
export { nomeBotConversa } from '../../shared/nomeBotConversa.js';

// Resolve o cliente pelo telefone comparando só os dígitos. Retorna { id, nome } ou null.
// `nome` já vem no padrão BotConversa (PJ = "Responsável - Empresa").
export async function buscarClientePorTelefone(metaPhone) {
  const local = normalizePhone(metaPhone);
  if (!local || local.length < 8) return null;
  const last4 = local.slice(-4);
  const { data } = await supabase
    .from('clientes')
    .select('id, tipo, nome_razao_social, nome_contato, telefone, telefone2')
    .or(`telefone.ilike.%${last4},telefone2.ilike.%${last4}`);
  const cli = (data || []).find(
    c => normalizePhone(c.telefone) === local || normalizePhone(c.telefone2) === local
  );
  return cli ? { id: cli.id, nome: nomeBotConversa(cli) } : null;
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

// Busca o nome ATUAL do contato no BotConversa. Usado para ecoar o nome de
// volta em toda notificação: a automação do webhook tem mapeamento de campos
// e sobrescreve o nome do contato com o que vier no payload — se vier vazio,
// APAGA o nome. Ecoar o nome existente torna a sobrescrita inofensiva.
export async function nomeSubscriberBC(phoneInternacional, config = null) {
  const cfg = config || await getConfig();
  const apiKey = cfg.botconversa_api_key;
  if (!apiKey || !phoneInternacional) return '';
  try {
    const r = await fetch(
      `https://backend.botconversa.com.br/api/v1/webhook/subscriber/get_by_phone/${phoneInternacional}/`,
      { headers: { 'API-KEY': apiKey } }
    );
    if (!r.ok) return '';
    const sub = await r.json().catch(() => null);
    const nome = (
      sub?.full_name
      || [sub?.first_name, sub?.last_name].filter(Boolean).join(' ')
      || sub?.name
      || ''
    ).trim();
    return nome.toLowerCase() === 'none' ? '' : nome;
  } catch {
    return '';
  }
}

// Filtra nomes que não podem ir pro BotConversa: vazio, "none" e o placeholder
// "Cliente" (sobrescreveriam o nome real do contato).
export function nomeValidoBC(nome) {
  const n = (nome || '').trim();
  if (!n) return '';
  const lower = n.toLowerCase();
  return (lower === 'none' || lower === 'cliente') ? '' : n;
}

// Automação "NOMES" do BotConversa: ação única "Criar/Atualizar Nome do Contato",
// sem bloco de mensagem. É o ÚNICO caminho que deve escrever nome de contato —
// a API REST do BotConversa é somente-leitura para subscribers (POST /subscriber/
// é "get or create" e ignora os campos de nome).
//
// Nunca dispara sem nome válido: campo vazio faz a automação gravar o literal
// "none" por cima do cadastro. Melhor não sincronizar do que apagar.
export async function syncNomeBotConversa(phone, nome, config = null) {
  const cfg = config || await getConfig();
  const webhook = process.env.BOTCONVERSA_WEBHOOK_NOMES || cfg.botconversa_webhook_nomes;
  if (!webhook) return { ok: false, motivo: 'webhook de nomes não configurado' };

  const phoneBC = toInternational(phone);
  if (!phoneBC) return { ok: false, motivo: 'telefone vazio' };

  const nomeFinal = nomeValidoBC(nome);
  if (!nomeFinal) return { ok: false, motivo: 'nome vazio ou inválido — sync abortado' };

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneBC, nome: nomeFinal }),
    });
    return { ok: res.ok, motivo: res.ok ? null : `HTTP ${res.status}`, nome: nomeFinal };
  } catch (e) {
    return { ok: false, motivo: `erro de rede: ${e.message}` };
  }
}

export async function sendWhatsApp(phone, mensagem, config = null, nome = '') {
  const cfg = config || await getConfig();
  const webhook = cfg.botconversa_webhook_notificacoes;
  if (!webhook || !phone) return false;

  // BotConversa exige 55 + DDD + número para resolver o subscriber.
  const phoneBC = toInternational(phone);

  // Nunca enviar payload sem nome: a automação do BotConversa sobrescreve o
  // cadastro do contato com o campo mapeado — ausente/vazio = nome apagado.
  // Prioridade: nome do nosso banco (parâmetro, já no padrão "Responsável -
  // Empresa" para PJ — atualiza ativamente o BotConversa) → nome que JÁ está
  // no BotConversa (preserva quando não conhecemos o cliente) → omite.
  const nomeFinal = nomeValidoBC(nome) || await nomeSubscriberBC(phoneBC, cfg);

  const payload = { phone: phoneBC, mensagem };
  if (nomeFinal) {
    payload.nome = nomeFinal;
    payload.name = nomeFinal;                          // compat com mapeamentos antigos
    payload.nome_completo = nomeFinal;
    payload.primeiro_nome = nomeFinal.split(/\s+/)[0];
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
