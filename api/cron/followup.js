import { supabase, getConfig, sendWhatsApp, sendEmail, emailTemplate } from '../_lib/notify.js';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function dayWindow(daysBack, windowHours = 26) {
  const end = new Date();
  end.setDate(end.getDate() - daysBack);
  const start = new Date(end);
  start.setHours(start.getHours() - windowHours);
  return { gte: start.toISOString(), lte: end.toISOString() };
}

// Verifica se já foi enviado follow-up deste tipo para esta referência
async function jaEnviado(tipo, clienteId, referenciaId = null) {
  let q = supabase
    .from('followups')
    .select('id')
    .eq('tipo', tipo)
    .eq('cliente_id', clienteId)
    .in('status', ['enviado', 'pendente']);
  if (referenciaId) q = q.eq('referencia_id', referenciaId);
  const { data } = await q;
  return data && data.length > 0;
}

async function registrarEnvio(tipo, clienteId, referenciaId, referenciaT, mensagem, metadata = {}) {
  await supabase.from('followups').insert([{
    tipo,
    cliente_id: clienteId,
    referencia_id: referenciaId || null,
    referencia_tipo: referenciaT || null,
    status: 'enviado',
    canal: 'whatsapp',
    mensagem,
    scheduled_for: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    metadata,
  }]);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const config = await getConfig();
  const baseUrl = config.app_base_url || 'https://gollog-1.vercel.app';
  const results = { cotacoes: 0, cadastros: 0, inativos: 0, coletas: 0, relatorio: 0 };

  // ─── BLOCO 1: Cotações não contratadas ───────────────────────────────
  if (config.followup_cotacao_ativo === 'true') {
    const stages = [
      { key: 'cotacao_perdida_d1', days: 1, label: 'D+1', cfg: 'followup_cotacao_d1',
        msg: (c) => `👋 Olá! Vimos que você fez uma cotação de *${c.cidade_origem || c.cep_origem} → ${c.cidade_destino || c.cep_destino}* ontem.\n\n` +
          `💰 Valor: *R$ ${(c.valor_cotado || 0).toFixed(2)}* (${c.tipo_servico})\n\n` +
          `Ainda está pensando? Posso te ajudar a fechar ou calcular uma nova opção!\n\n` +
          `📲 Responda aqui pelo WhatsApp ou faça uma nova cotação: ${baseUrl}/cotacao` },
      { key: 'cotacao_perdida_d3', days: 3, label: 'D+3', cfg: 'followup_cotacao_d3',
        msg: (c) => `📦 Lembrete GOLLOG!\n\nSua cotação *${c.cidade_origem || c.cep_origem} → ${c.cidade_destino || c.cep_destino}* ainda está disponível.\n\n` +
          `⏰ Os valores podem variar a qualquer momento. Garanta já!\n\n` +
          `🔗 Fale conosco ou refaça a cotação: ${baseUrl}/cotacao` },
      { key: 'cotacao_perdida_d7', days: 7, label: 'D+7', cfg: 'followup_cotacao_d7',
        msg: (c) => `🚚 Última mensagem da GOLLOG sobre sua cotação!\n\n` +
          `Percebemos que você ainda não finalizou o envio de *${c.cidade_origem || c.cep_origem} → ${c.cidade_destino || c.cep_destino}*.\n\n` +
          `Se precisar de ajuda ou quiser negociar condições especiais, é só chamar! 😊\n\n` +
          `📲 ${baseUrl}/cotacao` },
    ];

    for (const stage of stages) {
      if (config[stage.cfg] !== 'true') continue;
      const w = dayWindow(stage.days);
      const { data: cotacoes } = await supabase
        .from('cotacoes')
        .select('*, clientes(telefone, nome_razao_social)')
        .eq('status', 'enviada')
        .gte('created_at', w.gte)
        .lte('created_at', w.lte)
        .not('cliente_id', 'is', null);

      for (const cot of cotacoes || []) {
        if (await jaEnviado(stage.key, cot.cliente_id, cot.id)) continue;
        const phone = cot.clientes?.telefone;
        if (!phone) continue;
        const msg = stage.msg(cot);
        const ok = await sendWhatsApp(phone, msg, config);
        if (ok) {
          await registrarEnvio(stage.key, cot.cliente_id, cot.id, 'cotacao', msg, { valor: cot.valor_cotado });
          results.cotacoes++;
        }
      }
    }
  }

  // ─── BLOCO 2: Cadastros sem cotação ──────────────────────────────────
  if (config.followup_cadastro_ativo === 'true') {
    const stages = [
      { key: 'cadastro_sem_cotacao_d1', days: 1, cfg: 'followup_cadastro_d1',
        msg: (c) => `Olá, *${c.nome_razao_social?.split(' ')[0]}*! 👋\n\n` +
          `Bem-vindo à GOLLOG! Notamos que você se cadastrou mas ainda não fez nenhuma cotação.\n\n` +
          `📦 Que tal ver quanto custa enviar sua encomenda?\n\n` +
          `🔗 ${baseUrl}/cotacao` },
      { key: 'cadastro_sem_cotacao_d3', days: 3, cfg: 'followup_cadastro_d3',
        msg: (c) => `Oi *${c.nome_razao_social?.split(' ')[0]}*! 😊\n\n` +
          `A GOLLOG tem as melhores opções de frete para todo o Brasil.\n\n` +
          `📍 Atendemos com coleta em Osasco e Barueri.\n` +
          `⚡ Entrega expressa, econômica ou urgente.\n\n` +
          `Faça uma cotação grátis: ${baseUrl}/cotacao` },
      { key: 'cadastro_sem_cotacao_d7', days: 7, cfg: 'followup_cadastro_d7',
        msg: (c) => `*${c.nome_razao_social?.split(' ')[0]}*, precisa enviar alguma coisa? 📦\n\n` +
          `Nossa equipe está pronta para te atender!\n\n` +
          `🚚 Cotação rápida: ${baseUrl}/cotacao\n` +
          `📅 Agendar coleta: ${baseUrl}/coleta\n\n` +
          `Qualquer dúvida, é só chamar aqui! 😊` },
    ];

    for (const stage of stages) {
      if (config[stage.cfg] !== 'true') continue;
      const w = dayWindow(stage.days);

      // Clientes sem nenhuma cotação
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome_razao_social, telefone')
        .gte('created_at', w.gte)
        .lte('created_at', w.lte)
        .not('telefone', 'is', null);

      for (const cli of clientes || []) {
        // Verifica se tem cotações
        const { count } = await supabase
          .from('cotacoes')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', cli.id);
        if (count > 0) continue;

        if (await jaEnviado(stage.key, cli.id)) continue;
        const msg = stage.msg(cli);
        const ok = await sendWhatsApp(cli.telefone, msg, config);
        if (ok) {
          await registrarEnvio(stage.key, cli.id, null, null, msg);
          results.cadastros++;
        }
      }
    }
  }

  // ─── BLOCO 3: Clientes inativos (RFM simplificado) ───────────────────
  if (config.followup_inativo_ativo === 'true') {
    const segments = [
      { key: 'inativo_30d', days: 30, cfg: 'followup_inativo_30d',
        msg: (c) => `Olá, *${c.nome_razao_social?.split(' ')[0]}*! 👋\n\n` +
          `Faz um tempinho que não nos vemos por aqui!\n\n` +
          `🚚 Tem algum envio planejado? Estamos prontos para ajudar!\n\n` +
          `📦 Cotação rápida: ${baseUrl}/cotacao` },
      { key: 'inativo_60d', days: 60, cfg: 'followup_inativo_60d',
        msg: (c) => `*${c.nome_razao_social?.split(' ')[0]}*, sentimos sua falta! 😊\n\n` +
          `Já faz 2 meses desde o seu último envio com a GOLLOG.\n\n` +
          `💡 Lembre: temos coleta em domicílio, rastreamento em tempo real e atendimento personalizado.\n\n` +
          `🔗 Fale conosco ou faça uma cotação: ${baseUrl}/cotacao` },
      { key: 'inativo_90d', days: 90, cfg: 'followup_inativo_90d',
        msg: (c) => `Oi, *${c.nome_razao_social?.split(' ')[0]}*! 📦\n\n` +
          `Queremos te reconquistar! Há 3 meses você não faz envios com a GOLLOG.\n\n` +
          `🎁 Entre em contato e pergunte sobre nossas condições especiais para clientes que retornam!\n\n` +
          `📲 Responda aqui ou acesse: ${baseUrl}/cotacao` },
    ];

    for (const seg of segments) {
      if (config[seg.cfg] !== 'true') continue;
      const w = dayWindow(seg.days, 12);

      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome_razao_social, telefone')
        .gte('ultimo_contato', w.gte)
        .lte('ultimo_contato', w.lte)
        .eq('status', 'ativo')
        .not('telefone', 'is', null);

      for (const cli of clientes || []) {
        if (await jaEnviado(seg.key, cli.id)) continue;
        const msg = seg.msg(cli);
        const ok = await sendWhatsApp(cli.telefone, msg, config);
        if (ok) {
          await registrarEnvio(seg.key, cli.id, null, null, msg, { dias_inativo: seg.days });
          results.inativos++;
        }
      }
    }
  }

  // ─── BLOCO 4: Alerta de coleta do dia ────────────────────────────────
  if (config.followup_coleta_alerta_ativo === 'true') {
    const hoje = new Date().toISOString().split('T')[0];

    const { data: coletas } = await supabase
      .from('coletas')
      .select('*, clientes(telefone, nome_razao_social)')
      .eq('data_solicitada', hoje)
      .in('status', ['solicitada', 'agendada'])
      .eq('alerta_enviado', false);

    for (const col of coletas || []) {
      const phone = col.clientes?.telefone;
      const nome = col.clientes?.nome_razao_social?.split(' ')[0] || 'Cliente';
      if (!phone) continue;

      const msg = `🚚 *Lembrete de Coleta — GOLLOG*\n\n` +
        `Olá, *${nome}*!\n\n` +
        `Sua coleta está agendada para *hoje*:\n` +
        `📍 ${col.endereco_coleta || 'Endereço confirmado'}\n` +
        `⏰ Horário: ${col.horario_preferido || 'A confirmar'}\n` +
        `📦 ${col.quantidade_volumes || 1} volume(s)\n\n` +
        `Nossa equipe entrará em contato antes da chegada. Qualquer dúvida, responda aqui!`;

      const ok = await sendWhatsApp(phone, msg, config);
      if (ok) {
        await supabase.from('coletas').update({ alerta_enviado: true }).eq('id', col.id);
        results.coletas++;
      }
    }
  }

  // ─── BLOCO 5: Relatório mensal (apenas dia 1) ─────────────────────────
  if (config.followup_relatorio_mensal === 'true') {
    const hoje = new Date();
    if (hoje.getDate() === 1) {
      const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome_razao_social, telefone, total_envios, valor_total_gasto')
        .eq('status', 'ativo')
        .gt('total_envios', 0);

      for (const cli of clientes || []) {
        const { count: enviosMes } = await supabase
          .from('rastreamentos')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', cli.id)
          .gte('created_at', mesPassado.toISOString())
          .lte('created_at', fimMesPassado.toISOString());

        if (!enviosMes || enviosMes === 0) continue;
        if (!cli.telefone) continue;

        const mesNome = mesPassado.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const msg = `📊 *Seu resumo GOLLOG — ${mesNome}*\n\n` +
          `Olá, *${cli.nome_razao_social?.split(' ')[0]}*!\n\n` +
          `📦 Envios no mês: *${enviosMes}*\n` +
          `📈 Total acumulado: *${cli.total_envios}* envios\n\n` +
          `Obrigado pela confiança! Continue enviando com a GOLLOG. 🚀\n\n` +
          `📲 Nova cotação: ${baseUrl}/cotacao`;

        const ok = await sendWhatsApp(cli.telefone, msg, config);
        if (ok) results.relatorio++;
      }
    }
  }

  return res.status(200).json({ success: true, results });
}
