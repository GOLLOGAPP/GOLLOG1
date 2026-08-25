import { supabase } from '../_lib/notify.js';

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── cotacao-token ───────────────────────────────────────────────────────────
async function handleCotacaoToken(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { phone, name = '', unidade = 'Osasco' } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone é obrigatório' });

  let token;
  for (let i = 0; i < 10; i++) {
    token = generateToken();
    const { data } = await supabase.from('cotacao_tokens').select('token').eq('token', token).maybeSingle();
    if (!data) break;
  }

  const { error } = await supabase.from('cotacao_tokens').insert({ token, phone, name, unidade });
  if (error) return res.status(500).json({ error: 'Erro ao salvar token', details: error.message });

  return res.status(200).json({ token, url: `https://www.golcargo.com.br/c/${token}` });
}

// ─── link-token ──────────────────────────────────────────────────────────────
async function handleLinkToken(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { redirect_url, expires_hours = 720 } = req.body || {};
  if (!redirect_url) return res.status(400).json({ error: 'redirect_url é obrigatório' });

  let token;
  for (let i = 0; i < 10; i++) {
    token = generateToken();
    const { data } = await supabase.from('link_tokens').select('token').eq('token', token).maybeSingle();
    if (!data) break;
  }

  const expires_at = new Date(Date.now() + expires_hours * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from('link_tokens').insert({ token, redirect_url, expires_at });
  if (error) return res.status(500).json({ error: 'Erro ao salvar token', details: error.message });

  return res.status(200).json({ token, url: `https://www.golcargo.com.br/l/${token}` });
}

// ─── malha ───────────────────────────────────────────────────────────────────
async function handleMalha(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { origem, destino, weekday, apenas_carga } = req.query;

  let q = supabase.from('malha_aerea').select('*');
  if (origem) q = q.ilike('dept_station', `%${origem}%`);
  if (destino) q = q.ilike('arrival_station', `%${destino}%`);
  if (weekday) q = q.ilike('weekday', `%${weekday}%`);
  if (apenas_carga === 'true') q = q.eq('pode_enviar_carga', 'SIM');

  // Ordena: day_date primeiro (nulls primeiro para não serem cortados pelo limit), depois por horário
  const { data: voos, error } = await q
    .order('day_date', { ascending: true, nullsFirst: true })
    .order('dept_time', { ascending: true })
    .limit(5000);

  if (error) return res.status(500).json({ error: error.message });

  const { data: upload } = await supabase
    .from('malha_uploads').select('filename, storage_path, uploaded_at, total_voos')
    .eq('ativo', true).maybeSingle();

  let download_url = null;
  if (upload?.storage_path) {
    const { data: urlData } = supabase.storage.from('malha-aerea').getPublicUrl(upload.storage_path);
    download_url = urlData?.publicUrl || null;
  }

  return res.status(200).json({ voos: voos || [], upload, download_url });
}

// ─── cotacao-avancada-token ──────────────────────────────────────────────────
async function handleCotacaoAvancadaToken(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { phone = '', name = '', unidade = 'Osasco' } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone é obrigatório' });

  let token;
  for (let i = 0; i < 10; i++) {
    token = generateToken();
    const { data } = await supabase.from('cotacao_tokens').select('token').eq('token', token).maybeSingle();
    if (!data) break;
  }

  const { error } = await supabase.from('cotacao_tokens').insert({ token, phone, name, unidade });
  if (error) return res.status(500).json({ error: 'Erro ao salvar token', details: error.message });

  return res.status(200).json({ token, url: `https://www.golcargo.com.br/ca/${token}` });
}

// ─── Router ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const slug = req.query.slug;

  try {
    if (slug === 'cotacao-token')          return await handleCotacaoToken(req, res);
    if (slug === 'cotacao-avancada-token') return await handleCotacaoAvancadaToken(req, res);
    if (slug === 'ca-token')               return await handleCotacaoAvancadaToken(req, res);
    if (slug === 'link-token')             return await handleLinkToken(req, res);
    if (slug === 'malha')                  return await handleMalha(req, res);
    return res.status(404).json({ error: `Rota não encontrada: /api/public/${slug}` });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno', details: err.message });
  }
}
