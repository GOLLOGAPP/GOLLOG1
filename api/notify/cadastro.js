import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://bkljbfqvlepmmwwylfdv.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// Strips formatting and ensures 55 + DDD + number (12-13 digits)
const toInternational = (phone) => {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) return d;
  return `55${d}`;
};

// Adds "Cliente" tag to a Botconversa subscriber after registration
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone é obrigatório' });

    const { data: configKey } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'botconversa_api_key')
      .single();

    const apiKey = configKey?.valor;
    if (!apiKey) {
      return res.status(200).json({ success: false, message: 'API key do Botconversa não configurada' });
    }

    const formattedPhone = toInternational(phone);

    const response = await fetch('https://app.botconversa.com.br/api/v1/subscriber/add_tag/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({ phone: formattedPhone, tag: 'Cliente' }),
    });

    const result = await response.json().catch(() => null);

    return res.status(200).json({
      success: response.ok,
      phone: formattedPhone,
      botconversa_status: response.status,
      botconversa_response: result,
    });

  } catch (error) {
    console.error('Erro ao adicionar tag Cliente:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
