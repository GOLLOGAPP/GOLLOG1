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
    const { phone, nome } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone é obrigatório' });

    const [configKey, configWebhook] = await Promise.all([
      supabase.from('configuracoes').select('valor').eq('chave', 'botconversa_api_key').single(),
      supabase.from('configuracoes').select('valor').eq('chave', 'botconversa_webhook_url').single(),
    ]);

    const apiKey = configKey?.data?.valor;
    const webhookUrl = configWebhook?.data?.valor;

    if (!apiKey) {
      return res.status(200).json({ success: false, message: 'API key do Botconversa não configurada' });
    }

    const formattedPhone = toInternational(phone);

    // 1. Adiciona tags sequencialmente — Botconversa rejeita chamadas simultâneas pro mesmo assinante
    const addTag = async (tag) => {
      try {
        const r = await fetch('https://app.botconversa.com.br/api/v1/subscriber/add_tag/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
          body: JSON.stringify({ phone: formattedPhone, tag }),
        });
        const body = await r.json().catch(() => null);
        return { tag, status: r.status, body };
      } catch (e) {
        return { tag, error: e.message };
      }
    };

    const tagResults = [];
    tagResults.push(await addTag('Cliente'));
    tagResults.push(await addTag('Novo'));

    // 2. Dispara fluxo do menu via webhook — awaited para não ser morto pelo Vercel
    let menuTriggered = false;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formattedPhone, nome: nome || '' }),
        });
        menuTriggered = true;
      } catch (e) {
        console.error('Webhook menu falhou:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      phone: formattedPhone,
      tags: tagResults,
      menu_triggered: menuTriggered,
    });

  } catch (error) {
    console.error('Erro ao processar cadastro:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
