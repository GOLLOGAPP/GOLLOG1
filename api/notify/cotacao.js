import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://bkljbfqvlepmmwwylfdv.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// Envia mensagem de volta para o BotConversa após cotação ser gerada no site
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, cotacao } = req.body;

    if (!phone || !cotacao) {
      return res.status(400).json({ error: 'Phone e cotacao são obrigatórios' });
    }

    // Buscar configuração do BotConversa no banco
    const { data: configWebhook } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'botconversa_webhook_url')
      .single();

    const { data: configKey } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'botconversa_api_key')
      .single();

    const webhookUrl = configWebhook?.valor;
    const apiKey = configKey?.valor;

    // Montar mensagem formatada
    const mensagem = `💰 *Cotação GOLLOG*\n\n📍 Origem: ${cotacao.cidade_origem || cotacao.cep_origem}\n📍 Destino: ${cotacao.cidade_destino || cotacao.cep_destino}\n📦 Peso: ${cotacao.peso_kg}kg\n🚀 Serviço: GOLLOG ${cotacao.tipo_servico}\n\n💲 *Valor Estimado: R$ ${cotacao.valor}*\n⏱ Prazo: ${cotacao.prazo}\n\n_* Valores sujeitos à confirmação na unidade._`;

    let botconversaResponse = null;

    // Se o webhook do BotConversa está configurado, envia a mensagem
    if (webhookUrl && apiKey) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'API-KEY': apiKey,
          },
          body: JSON.stringify({
            phone: phone,
            custom_fields: {
              resposta_cotacao: mensagem,
              valor_cotacao: cotacao.valor,
              prazo_cotacao: cotacao.prazo,
              servico_cotacao: cotacao.tipo_servico,
            },
          }),
        });
        botconversaResponse = await response.json().catch(() => null);
      } catch (err) {
        console.error('Erro ao enviar para BotConversa:', err);
      }
    }

    return res.status(200).json({
      success: true,
      message: mensagem,
      botconversa_sent: !!webhookUrl,
      botconversa_response: botconversaResponse,
    });

  } catch (error) {
    console.error('Notify error:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
