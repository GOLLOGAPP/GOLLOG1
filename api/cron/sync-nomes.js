import { supabase, getConfig, normalizePhone, nomeBotConversa, syncNomeBotConversa } from '../_lib/notify.js';

// Re-sincroniza nomes de contatos do BotConversa que estão SEM nome (vazio,
// " " ou "None") mas TÊM cadastro no sistema. Nunca toca em quem já tem nome —
// preserva o nome de perfil do WhatsApp e as edições manuais dos atendentes.
// Rede de segurança para o caso de uma notificação escapar e apagar um nome.
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const config = await getConfig();
  const apiKey = config.botconversa_api_key;
  if (!apiKey) return res.status(200).json({ ok: false, motivo: 'botconversa_api_key não configurada' });

  // 1. Lista todos os subscribers do BotConversa (paginado)
  const subs = [];
  let url = 'https://backend.botconversa.com.br/api/v1/webhook/subscribers/';
  try {
    while (url) {
      const r = await fetch(url, { headers: { 'API-KEY': apiKey } });
      if (!r.ok) break;
      const j = await r.json();
      subs.push(...(j.results || []));
      url = j.next;
    }
  } catch (e) {
    return res.status(200).json({ ok: false, motivo: `falha ao listar subscribers: ${e.message}` });
  }

  // 2. Indexa clientes por telefone normalizado (só dígitos, sem DDI)
  const { data: clientes } = await supabase
    .from('clientes')
    .select('tipo, nome_razao_social, nome_contato, telefone, telefone2');
  const idx = {};
  for (const c of clientes || []) {
    for (const t of [normalizePhone(c.telefone), normalizePhone(c.telefone2)]) {
      if (t && t.length >= 8) (idx[t] ||= []).push(c);
    }
  }

  // 3. Só os SEM nome (vazio, espaço ou "none") que tenham cadastro com nome único
  const semNome = subs.filter(s => {
    const n = (s.full_name || '').trim().toLowerCase();
    return !n || n === 'none' || /\bnone\b/.test(n);
  });

  let corrigidos = 0, semCadastro = 0, ambiguos = 0;
  for (const s of semNome) {
    const match = idx[normalizePhone(s.phone)];
    if (!match) { semCadastro++; continue; }
    const nomes = [...new Set(match.map(nomeBotConversa).filter(Boolean))];
    if (nomes.length !== 1) { ambiguos++; continue; }
    const r = await syncNomeBotConversa(s.phone, nomes[0], config);
    if (r.ok) corrigidos++;
  }

  return res.status(200).json({
    ok: true,
    subscribers: subs.length,
    sem_nome: semNome.length,
    corrigidos,
    sem_cadastro: semCadastro,
    ambiguos,
  });
}
