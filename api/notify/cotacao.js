import { sendWhatsApp, getConfig } from '../_lib/notify.js';

const BC_BASE = 'https://backend.botconversa.com.br/api/v1';

async function bcPatch(phone, body, apiKey) {
  try {
    const res = await fetch(`${BC_BASE}/subscriber/${phone}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'API-KEY': apiKey },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch { return false; }
}

async function bcTriggerFlow(phone, flowId, apiKey) {
  try {
    const res = await fetch(`${BC_BASE}/subscriber/${phone}/send-flow/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'API-KEY': apiKey },
      body: JSON.stringify({ flow_id: Number(flowId) }),
    });
    return res.ok;
  } catch { return false; }
}

function formatarCotacao(c, idx, total) {
  const destino = c.local_entrega_tipo === 'aeroporto'
    ? `✈️ Retirada no aeroporto (${c.estado_aeroporto})`
    : c.cidade_destino || c.cep_destino || 'Destino não informado';

  const medidas = (c.comprimento_cm && c.altura_cm && c.largura_cm)
    ? `📐 ${c.comprimento_cm}cm × ${c.altura_cm}cm × ${c.largura_cm}cm`
    : '';

  return [
    total > 1 ? `*Cotação ${idx + 1}/${total}*` : `*Dados da Cotação*`,
    `🚀 Serviço: ${c.tipo_servico}`,
    `💳 Pagamento: ${c.modalidade_pagamento}`,
    `📍 Destino: ${destino}`,
    `🛡️ Seguro: ${c.seguro}`,
    c.descricao_carga ? `📋 Carga: ${c.descricao_carga}` : '',
    c.valor_nota ? `🧾 Valor NF: R$ ${parseFloat(c.valor_nota).toFixed(2)}` : '',
    medidas,
    c.peso_kg ? `⚖️ Peso: ${c.peso_kg}kg` : '',
  ].filter(Boolean).join('\n');
}

function buildResumo(globalData, cotacoes) {
  const { unidade = '', com_coleta } = globalData || {};
  const coletaStr = com_coleta ? '🚚 Com coleta' : '🏢 Sem coleta';
  const total = cotacoes.length;

  const header = [`🏢 Unidade: ${unidade}`, coletaStr].join('\n');
  const corpo = cotacoes
    .map((c, idx) => formatarCotacao(c, idx, total))
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
    const bcApiKey   = cfg.botconversa_api_key   || '';
    const confirmarFlowId = cfg.botconversa_confirmar_flow_id || '9022833';

    const resumo = buildResumo(globalData, cotacoes);
    const mensagemWpp = `📬 *Solicitação de Cotação Recebida!*\n\n${resumo}\n\n_Em breve você receberá uma mensagem para confirmar os dados._`;

    // 1. Envia resumo por WhatsApp
    const sent = await sendWhatsApp(phone, mensagemWpp, cfg);

    // 2. Atualiza campos personalizados no BotConversa
    let bcFieldsOk = false;
    let bcFlowOk   = false;

    if (bcApiKey) {
      const phoneClean = phone.replace(/\D/g, '');

      bcFieldsOk = await bcPatch(phoneClean, {
        custom_fields: {
          cotacao_status: 'enviada',
          cotacao_resumo: resumo,
        },
      }, bcApiKey);

      // 3. Dispara fluxo de confirmação
      if (bcFieldsOk) {
        // Pequeno delay para garantir que o campo foi salvo antes do fluxo disparar
        await new Promise(r => setTimeout(r, 1500));
        bcFlowOk = await bcTriggerFlow(phoneClean, confirmarFlowId, bcApiKey);
      }
    }

    return res.status(200).json({
      success: true,
      sent,
      bc_fields: bcFieldsOk,
      bc_flow: bcFlowOk,
      total: cotacoes.length,
    });

  } catch (error) {
    console.error('Notify cotacao error:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
