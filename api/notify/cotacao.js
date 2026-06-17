import { sendWhatsApp, getConfig } from '../_lib/notify.js';

const BC_BASE = 'https://new-backend.botconversa.com.br/api/v1';

async function bcRequest(method, path, body, apiKey) {
  const url = `${BC_BASE}${path}`;
  let responseBody = null;
  let status = null;
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'API-KEY': apiKey },
      body: body ? JSON.stringify(body) : undefined,
    });
    status = res.status;
    try { responseBody = await res.json(); } catch { responseBody = await res.text().catch(() => null); }
    console.log(`[BC API] ${method} ${url} → ${status}`, JSON.stringify(responseBody));
    return { ok: res.ok, status, body: responseBody };
  } catch (err) {
    console.error(`[BC API] ${method} ${url} → ERRO`, err.message);
    return { ok: false, status: null, body: null, error: err.message };
  }
}

// BotConversa pode exigir telefone com código do país (55) ou sem
// Tentamos com e sem prefixo, retornando o que funcionar
async function bcPatchSubscriber(phoneClean, body, apiKey) {
  // Tenta sem prefixo primeiro
  let result = await bcRequest('PATCH', `/subscriber/${phoneClean}/`, body, apiKey);
  if (result.ok) return { ok: true, phone: phoneClean, result };

  // Tenta com prefixo 55
  const phoneWith55 = phoneClean.startsWith('55') ? phoneClean : `55${phoneClean}`;
  if (phoneWith55 !== phoneClean) {
    result = await bcRequest('PATCH', `/subscriber/${phoneWith55}/`, body, apiKey);
    if (result.ok) return { ok: true, phone: phoneWith55, result };
  }

  return { ok: false, phone: phoneClean, result };
}

async function bcTriggerFlow(phone, flowId, apiKey) {
  return bcRequest('POST', `/subscriber/${phone}/send-flow/`, { flow_id: Number(flowId) }, apiKey);
}

function formatarCotacao(c, idx, total) {
  const volumes = c.volumes || [];
  const totalPeso = volumes.reduce((s, v) => s + (parseFloat(v.peso_kg) || 0), 0);

  let destinoLine;
  if (c.local_entrega_tipo === 'aeroporto') {
    destinoLine = `✈️ Retirada: ${c.aeroporto_sigla} — ${c.aeroporto_cidade}`;
  } else {
    const cidade = c.cidade_destino ? `${c.cidade_destino}` : '';
    const cep = c.cep_destino ? `CEP ${c.cep_destino}` : '';
    destinoLine = `📍 Destino: ${[cidade, cep].filter(Boolean).join(' — ') || 'Não informado'}`;
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
  const total = cotacoes.length;

  const origemStr = com_coleta && (cidade_origem || cep_origem)
    ? `📦 Origem: ${[cidade_origem, cep_origem ? `CEP ${cep_origem}` : ''].filter(Boolean).join(' — ')}`
    : '';

  const header = [`🏢 Unidade: ${unidade}`, coletaStr, origemStr].filter(Boolean).join('\n');
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
    const bcApiKey = cfg.botconversa_api_key || '';
    const confirmarFlowId = cfg.botconversa_confirmar_flow_id || '9022833';

    const resumo = buildResumo(globalData, cotacoes);
    const mensagemWpp = `📬 *Solicitação de Cotação Recebida!*\n\n${resumo}\n\n_Em breve você receberá uma mensagem para confirmar os dados._`;

    // 1. Envia resumo por WhatsApp
    const sent = await sendWhatsApp(phone, mensagemWpp, cfg);

    // 2. Atualiza campos personalizados e dispara fluxo no BotConversa
    let bcDebug = { api_key_present: !!bcApiKey, phone_raw: phone };

    if (bcApiKey) {
      const phoneClean = phone.replace(/\D/g, '');
      bcDebug.phone_clean = phoneClean;

      // Atualiza cotacao_status e cotacao_resumo
      const patchResult = await bcPatchSubscriber(phoneClean, {
        custom_fields: {
          cotacao_status: 'enviada',
          cotacao_resumo: resumo,
        },
      }, bcApiKey);

      bcDebug.patch = { ok: patchResult.ok, phone_used: patchResult.phone, status: patchResult.result?.status, body: patchResult.result?.body };

      if (patchResult.ok) {
        await new Promise(r => setTimeout(r, 1500));
        const flowResult = await bcTriggerFlow(patchResult.phone, confirmarFlowId, bcApiKey);
        bcDebug.flow = { ok: flowResult.ok, status: flowResult.status, body: flowResult.body };
      } else {
        bcDebug.flow = { skipped: true, reason: 'patch falhou' };
      }
    } else {
      bcDebug.skipped = true;
      bcDebug.reason = 'botconversa_api_key não configurada no Supabase';
    }

    console.log('[cotacao] debug:', JSON.stringify(bcDebug));

    return res.status(200).json({
      success: true,
      sent,
      total: cotacoes.length,
      debug: bcDebug,
    });

  } catch (error) {
    console.error('Notify cotacao error:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
