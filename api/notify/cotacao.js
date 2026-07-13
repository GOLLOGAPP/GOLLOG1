import { getConfig, supabase, normalizePhone, toInternational, subscriberExisteBC, buscarClientePorTelefone } from '../_lib/notify.js';

// Carimba nas cotações recém-criadas se o aviso no WhatsApp saiu ou não.
// Sem isso, uma cotação não entregue é indistinguível de uma entregue.
async function registrarEntrega(ids, entrega) {
  if (!ids?.length) return;
  const { data: rows } = await supabase.from('cotacoes').select('id, metadata').in('id', ids);
  for (const row of rows || []) {
    await supabase
      .from('cotacoes')
      .update({ metadata: { ...(row.metadata || {}), notificacao: entrega } })
      .eq('id', row.id);
  }
}

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
    const { phone, global: globalData, cotacoes, cotacao_ids: cotacaoIds } = req.body;

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

    // ── Aviso no WhatsApp ────────────────────────────────────────────────────
    // "entregue" só é true quando o contato existe no BotConversa E o webhook
    // aceitou. O 200 do webhook sozinho não prova nada: ele responde 200 para
    // telefone desconhecido e simplesmente não dispara o fluxo.
    const phoneBC = toInternational(phone);
    const bcWebhook = cfg.botconversa_cotacao_webhook_url;

    let entregue = false;
    let motivo = null;
    let bcWebhookStatus = null;

    if (!bcWebhook) {
      motivo = 'botconversa_cotacao_webhook_url não configurada';
    } else {
      const sub = await subscriberExisteBC(phoneBC, cfg);
      if (!sub.existe) {
        // Disparar aqui seria inútil: o webhook responderia 200 e não entregaria nada.
        motivo = sub.motivo;
      } else {
        try {
          const bcPayload = {
            phone: phoneBC,
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
          entregue = bcRes.ok;
          if (!entregue) motivo = `webhook respondeu HTTP ${bcRes.status}`;
        } catch (err) {
          motivo = `erro ao chamar o webhook: ${err.message}`;
        }
      }
    }

    const entrega = {
      entregue,
      motivo,
      phone: phoneBC,
      webhook_status: bcWebhookStatus,
      at: new Date().toISOString(),
    };

    if (!entregue) {
      // Falha ruidosa: aparece no log da Vercel e fica gravada na cotação.
      console.error(`[BC] cotação NÃO avisada no WhatsApp | ${phoneBC} | ${motivo}`);
    }

    try {
      await registrarEntrega(cotacaoIds, entrega);
    } catch (e) {
      console.error('Falha ao registrar status de entrega:', e.message);
    }

    return res.status(200).json({
      success: true,
      entregue,
      motivo,
      total: cotacoes.length,
      cotacoes_vinculadas: cotacoesVinculadas,
    });

  } catch (error) {
    console.error('Notify cotacao error:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
