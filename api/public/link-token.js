import { supabase } from '../_lib/notify.js';

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
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

  return res.status(200).json({
    token,
    url: `https://golcargo.com.br/l/${token}`,
  });
}
