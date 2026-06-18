import { getConfig } from '../_lib/notify.js';

function formatarCotacao(c, idx, total) {
  const volumes = c.volumes || [];
  const totalPeso = volumes.reduce((s, v) => s + (parseFloat(v.peso_kg) || 0), 0);

  let destinoLine;
  if (c.local_entrega_tipo === 'aeroporto') {
    destinoLine = `✈️ Retirada na Base | ${c.aeroporto_sigla} — ${c.aeroporto_cidade}`;
  } else {
    const cidade = c.cidade_destino || '';
    const cep = c.cep_destino ? `CEP ${c.cep_destino}` : '';
    destinoLine = `🏠 Entrega a Domicílio | ${[cidade, cep].filter(Boolean).join(' — ') || 'Não informado'}`;
  }

  const volumeLines = volumes.length > 1
    ? volumes.map((v, i) =>
        `  Vol.${i + 1}: ${v.comprimento_cm || '?'}×${v.altura_cm || '?'}×${v.largura_cm || '?'} cm | ${v.peso_kg || '?'} kg`
      )
    : volumes.length === 1 && (volumes[0].comprimento_cm || volumes[0].peso_kg)
      ? [`📐 ${volumes[0].comprimento_cm}×${volumes[0].altura_cm}×${volumes[0].largura_cm} cm`]
      : [];

  return [
    total > 1 ? `*Cotação ${idx + 1}/${total}*` : `*Dados da Cotação*`,
    `🚀 Serviço: ${c.tipo_servico}`,
    `💳 Pagamento: ${c.modalidade_pagamento}`,
    destinoLine,
    `🛡️ Seguro: ${c.seguro}`,
    c.descricao_carga ? `📋 Carga: ${c.descricao_carga}` : '',
    c.valor_nota ? `🧾 Valor NF: R$ ${parseFloat(c.valor_nota).toFixed(2)}` : '',
    volumes.length > 1 ? `📦 ${volumes.length} volumes:` : '',
    ...volumeLines,
    totalPeso > 0 ? `⚖️ Peso total: ${totalPeso} kg` : '',
  ].filter(Boolean).join('\n');
}

function buildResumo(globalData, cotacoes) {
  const { unidade = '', com_coleta, cep_origem, cidade_origem } = globalData || {};
  const coletaStr = com_coleta ? '🚚 Com coleta' : '🏢 Sem coleta';
  const origemStr = com_coleta && (cidade_origem || cep_origem)
    ? `📦 Origem: ${[cidade_origem, cep_origem ? `CEP ${cep_origem}` : ''].filter(Boolean).join(' — ')}`
    : '';
  const header = [`🏢 Unidade: ${unidade}`, coletaStr, origemStr].filter(Boolean).join('\n');
  const corpo = cotacoes
    .map((c, idx) => formatarCotacao(c, idx, cotacoes.length))
    .join('\n\n─────────────\n\n');
  return `${header}\n\n${corpo}`;
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

    const cfg = await getConfig();
    const resumo = buildResumo(globalData, cotacoes);

    const bcWebhook = cfg.botconversa_cotacao_webhook_url;
    let bcWebhookOk = false;
    let bcWebhookStatus = null;

    if (bcWebhook) {
      try {
        const phoneClean = phone.replace(/\D/g, '');
        const bcRes = await fetch(bcWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phoneClean,
            name: globalData?.nome || '',
            cotacao_resumo: resumo,
            cotacao_status: 'enviada',
          }),
        });
        bcWebhookStatus = bcRes.status;
        bcWebhookOk = bcRes.ok;
        console.log(`[BC Webhook] → ${bcWebhookStatus} | ok=${bcWebhookOk}`);
      } catch (err) {
        console.error('[BC Webhook] erro:', err.message);
      }
    } else {
      console.warn('[BC Webhook] botconversa_cotacao_webhook_url não configurada');
    }

    return res.status(200).json({
      success: true,
      total: cotacoes.length,
      bc_webhook: { ok: bcWebhookOk, status: bcWebhookStatus },
    });

  } catch (error) {
    console.error('Notify cotacao error:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
