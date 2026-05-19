import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://bkljbfqvlepmmwwylfdv.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

const toInternational = (phone) => {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) return d;
  return `55${d}`;
};

// GET /api/test/add-tag?phone=5548996459791&tag=Novo
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const phone = req.query.phone || req.body?.phone;
  const tag   = req.query.tag   || req.body?.tag || 'Novo';

  if (!phone) return res.status(400).json({ error: 'phone é obrigatório (?phone=55...)' });

  const { data: keyRow } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'botconversa_api_key')
    .single();

  const apiKey = keyRow?.valor;
  if (!apiKey) return res.status(500).json({ error: 'API key não configurada' });

  const formattedPhone = toInternational(phone);

  const r = await fetch('https://app.botconversa.com.br/api/v1/subscriber/add_tag/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ phone: formattedPhone, tag }),
  });

  let body = null;
  try { body = await r.json(); } catch { body = await r.text().catch(() => null); }

  console.log(`[test/add-tag] phone=${formattedPhone} tag=${tag} status=${r.status}`, body);

  return res.status(200).json({
    phone: formattedPhone,
    tag,
    http_status: r.status,
    response_body: body,
  });
}
