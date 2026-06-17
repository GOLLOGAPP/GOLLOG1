import { sendWhatsApp } from '../_lib/notify.js';

function formatarCotacao(c, idx, total) {
  const destino = c.local_entrega_tipo === 'aeroporto'
    ? `✈️ Retirada no aeroporto (${c.estado_aeroporto})`
    : c.cidade_destino || c.cep_destino || 'Destino não informado';

  const medidas = [c.comprimento_cm, c.altura_cm, c.largura_cm]
    .map(v => parseFloat(v) || 0)
    .filter(v => v > 0);
  const medidasStr = medidas.length === 3
    ? `📐 ${c.comprimento_cm}cm × ${c.altura_cm}cm × ${c.largura_cm}cm`
    : '';

  const pesoStr = c.peso_kg ? `⚖️ Peso: ${c.peso_kg}kg` : '';

  const lines = [
    total > 1 ? `*📦 Cotação ${idx + 1}/${total}*` : `*📦 Dados da Cotação*`,
    `🚀 Serviço: ${c.tipo_servico}`,
    `💳 Pagamento: ${c.modalidade_pagamento}`,
    `📍 Destino: ${destino}`,
    `🛡️ Seguro: ${c.seguro}`,
    c.descricao_carga ? `📋 Carga: ${c.descricao_carga}` : '',
    c.valor_nota ? `🧾 Valor NF: R$ ${parseFloat(c.valor_nota).toFixed(2)}` : '',
    medidasStr,
    pesoStr,
  ].filter(Boolean);

  return lines.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, global: globalData, cotacoes } = req.body;

    if (!phone || !cotacoes?.length) {
      return res.status(400).json({ error: 'phone e cotacoes são obrigatórios' });
    }

    const { unidade = '', com_coleta } = globalData || {};
    const coletaStr = com_coleta ? '🚚 Com coleta' : '🏢 Sem coleta (cliente entrega na base)';
    const total = cotacoes.length;

    const header = [
      `📬 *Nova Solicitação de Cotação*`,
      `🏢 Unidade: ${unidade}`,
      `${coletaStr}`,
    ].join('\n');

    const corposCotacoes = cotacoes.map((c, idx) => formatarCotacao(c, idx, total)).join('\n\n─────────────\n\n');

    const footer = `_Nossa equipe entrará em contato com os valores em breve._`;

    const mensagem = `${header}\n\n${corposCotacoes}\n\n${footer}`;

    const sent = await sendWhatsApp(phone, mensagem);

    return res.status(200).json({ success: true, sent, total });

  } catch (error) {
    console.error('Notify cotacao error:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
