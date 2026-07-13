import { getConfig, supabase, normalizePhone, toInternational, buscarClientePorTelefone } from '../_lib/notify.js';

function formatarCotacao(c, idx, total) {
  const volumes = c.volumes || [];
  const totalPeso = volumes.reduce((s, v) => s + (parseFloat(v.peso_kg) || 0), 0);

  let destinoLine;
  if (c.local_entrega_tipo === 'aeroporto') {
    destinoLine = `✈️ Retirada na Base | ${c.aeroporto_sigla} — ${c.aeroporto_cidade}`;
  } else {
    const partes = [
      c.logradouro_destino,
      c.numero_destino ? `nº ${c.numero_destino}` : '',
      c.complemento_destino,
      c.bairro_destino,
      c.cidade_destino,
      c.cep_destino ? `CEP ${c.cep_destino}` : '',
    ].filter(Boolean).join(', ');
    destinoLine = `🏠 Entrega a Domicílio | ${partes || 'Não informado'}`;
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
  const { unidade = '', com_coleta, cep_origem, logradouro_origem, numero_origem, complemento_origem, bairro_origem, cidade_origem } = globalData || {};
  const coletaStr = com_coleta ? '🚚 Com coleta' : '🏢 Sem coleta';
  let origemStr = '';
  if (com_coleta && (cidade_origem || cep_origem)) {
    const partes = [
      logradouro_origem,
      numero_origem ? `nº ${numero_origem}` : '',
      complemento_origem,
      bairro_origem,
      cidade_origem,
      cep_origem ? `CEP ${cep_origem}` : '',
    ].filter(Boolean).join(', ');
    origemStr = `📦 Origem: ${partes}`;
  }
  const header = [coletaStr, origemStr].filter(Boolean).join('\n');
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

    // Resolve o cliente pelo telefone (usado para vincular a cotação e para
    // devolver o nome real ao BotConversa).
    let cliente = null;
    try {
      cliente = await buscarClientePorTelefone(phone);
    } catch (e) {
      console.error('Falha ao buscar cliente por telefone:', e.message);
    }

    // Rede de segurança: vincula as cotações deste telefone a um cliente
    // (caso o lookup do frontend tenha falhado). Casa pelo telefone salvo em metadata.
    let cotacoesVinculadas = 0;
    try {
      const foneSem55 = normalizePhone(phone);
      if (cliente && foneSem55) {
        const { data: upd } = await supabase
          .from('cotacoes')
          .update({ cliente_id: cliente.id })
          .is('cliente_id', null)
          .eq('metadata->>telefone', foneSem55)
          .select('id');
        cotacoesVinculadas = upd?.length || 0;
      }
    } catch (e) {
      console.error('Falha ao vincular cotações ao cliente:', e.message);
    }

    const bcWebhook = cfg.botconversa_cotacao_webhook_url;
    let bcWebhookOk = false;
    let bcWebhookStatus = null;

    if (bcWebhook) {
      try {
        const phoneClean = toInternational(phone);
        const bcPayload = {
            phone: phoneClean,
            cotacao_resumo: resumo,
            cotacao_status: 'enviada',
          };
          // Nome autoritativo: primeiro o cadastro (clientes), senão o que veio do form.
          // Devolve primeiro_nome/nome_completo para o BotConversa gravar o nome real —
          // nunca envia vazio ou "none" (evita apagar/sobrescrever o cadastro).
          const nomeClean = (cliente?.nome || globalData?.nome || '').trim();
          if (nomeClean && nomeClean.toLowerCase() !== 'none') {
            bcPayload.name = nomeClean;                       // compat
            bcPayload.nome_completo = nomeClean;
            bcPayload.primeiro_nome = nomeClean.split(/\s+/)[0];
          }

        const bcRes = await fetch(bcWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bcPayload),
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
      cotacoes_vinculadas: cotacoesVinculadas,
      bc_webhook: { ok: bcWebhookOk, status: bcWebhookStatus },
    });

  } catch (error) {
    console.error('Notify cotacao error:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
