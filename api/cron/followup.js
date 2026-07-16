import { supabase, getConfig, sendWhatsApp, sendEmail, emailTemplate, clienteJaCadastrado } from '../_lib/notify.js';

function dayWindow(daysBack, windowHours = 26) {
  const end = new Date();
  end.setDate(end.getDate() - daysBack);
  const start = new Date(end);
  start.setHours(start.getHours() - windowHours);
  return { gte: start.toISOString(), lte: end.toISOString() };
}

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

async function jaEnviadoPorTelefone(tipo, telefone) {
  const { data } = await supabase
    .from('followups')
    .select('id')
    .eq('tipo', tipo)
    .contains('metadata', { telefone })
    .in('status', ['enviado', 'pendente']);
  return data && data.length > 0;
}

async function registrarEnvio(tipo, clienteId, referenciaId, referenciaT, mensagem, canais = 'whatsapp', metadata = {}) {
  await supabase.from('followups').insert([{
    tipo,
    cliente_id: clienteId,
    referencia_id: referenciaId || null,
    referencia_tipo: referenciaT || null,
    status: 'enviado',
    canal: canais,
    mensagem,
    scheduled_for: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    metadata,
  }]);
}

// Envia WhatsApp + Email e retorna canais usados.
// `nome` é o nome real do cadastro — ecoado no payload do BotConversa para
// não apagar o nome do contato (nunca passar o fallback 'Cliente').
async function notificar(phone, email, wppMsg, emailSubject, emailHtml, config, nome = '') {
  let canais = [];
  if (phone) {
    const ok = await sendWhatsApp(phone, wppMsg, config, nome);
    if (ok) canais.push('whatsapp');
  }
  if (email && emailSubject && emailHtml) {
    const { ok } = await sendEmail(email, emailSubject, emailHtml, config);
    if (ok) canais.push('email');
  }
  return canais;
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
  const baseUrl = config.app_base_url || 'https://www.golcargo.com.br';
  const results = { abandonados: 0, cotacoes: 0, cadastros: 0, inativos: 0, coletas: 0, relatorio: 0, aniversarios: 0 };

  // ─── BLOCO 0: Cadastros iniciados mas não finalizados ────────────────
  if (config.followup_cadastro_abandonado_ativo === 'true') {
    const stages = [
      {
        key: 'cadastro_abandonado_d1',
        minMin: 30,       // mínimo 30min (evita disparar imediatamente)
        maxMin: 1440,     // até 24h — cobre quem abriu no dia anterior
        cfg: 'followup_cadastro_abandonado_30min',
        wpp: () =>
          `📋 *Olá! Vimos que você começou seu cadastro na GOLLOG* mas não finalizou.\n\n` +
          `É rápido! Leva menos de 2 minutos. 😊\n\n` +
          `Posso te ajudar com alguma dúvida antes de finalizar?\n\n` +
          `🔗 Continuar cadastro: ${baseUrl}/cadastro`,
      },
      {
        key: 'cadastro_abandonado_d2',
        minMin: 1440,     // entre 24h e 48h — cron do dia seguinte
        maxMin: 2880,
        cfg: 'followup_cadastro_abandonado_2h',
        wpp: () =>
          `🚚 *GOLLOG* — Ainda posso te ajudar!\n\n` +
          `Percebemos que você visitou nosso cadastro ontem mas não concluiu.\n\n` +
          `Com o cadastro completo você pode:\n` +
          `✅ Cotar fretes online\n` +
          `✅ Solicitar coleta em domicílio\n` +
          `✅ Rastrear encomendas em tempo real\n\n` +
          `🔗 Finalizar agora: ${baseUrl}/cadastro`,
      },
    ];


    const { data: iniciados } = await supabase
      .from('followups')
      .select('*')
      .eq('tipo', 'cadastro_iniciado')
      .eq('status', 'pendente');

    for (const ini of iniciados || []) {
      const phone = ini.metadata?.telefone;
      if (!phone) continue;

      // Verifica se o cliente já finalizou o cadastro (comparação só por dígitos)
      if (await clienteJaCadastrado(phone)) {
        await supabase
          .from('followups')
          .update({ status: 'convertido', sent_at: new Date().toISOString() })
          .eq('id', ini.id);
        continue;
      }

      const elapsedMin = (Date.now() - new Date(ini.created_at).getTime()) / 60000;

      // Expira registros com mais de 24h
      if (elapsedMin > 1440) {
        await supabase.from('followups').update({ status: 'cancelado' }).eq('id', ini.id);
        continue;
      }

      for (const stage of stages) {
        if (config[stage.cfg] !== 'true') continue;
        if (elapsedMin < stage.minMin || elapsedMin > stage.maxMin) continue;
        if (await jaEnviadoPorTelefone(stage.key, phone)) continue;

        const wppMsg = stage.wpp();
        const ok = await sendWhatsApp(phone, wppMsg, config);

        if (ok) {
          await supabase.from('followups').insert([{
            tipo: stage.key,
            status: 'enviado',
            canal: 'whatsapp',
            mensagem: wppMsg,
            scheduled_for: new Date().toISOString(),
            sent_at: new Date().toISOString(),
            metadata: { telefone: phone, iniciado_id: ini.id },
          }]);
          results.abandonados++;
        }
      }
    }
  }

  // ─── BLOCO 1: Cotações não contratadas ───────────────────────────────
  if (config.followup_cotacao_ativo === 'true') {
    const stages = [
      {
        key: 'cotacao_perdida_d1', days: 1, cfg: 'followup_cotacao_d1',
        wpp: (c) =>
          `👋 Olá! Vimos que você fez uma cotação de *${c.cidade_origem || c.cep_origem} → ${c.cidade_destino || c.cep_destino}* ontem.\n\n` +
          `💰 Valor: *R$ ${(c.valor_cotado || 0).toFixed(2)}* (${c.tipo_servico})\n\n` +
          `Ainda está pensando? Posso te ajudar a fechar ou calcular uma nova opção!\n\n` +
          `📲 ${baseUrl}/cotacao`,
        emailSubject: 'Sua cotação GOLLOG ainda está disponível',
        emailBody: (c, nome) =>
          `<p>Olá, <strong>${nome}</strong>!</p>
           <p>Notamos que você fez uma cotação de <strong>${c.cidade_origem || c.cep_origem} → ${c.cidade_destino || c.cep_destino}</strong> ontem e ainda não finalizou o envio.</p>
           <p><strong>Resumo da sua cotação:</strong></p>
           <ul>
             <li>Rota: ${c.cidade_origem || c.cep_origem} → ${c.cidade_destino || c.cep_destino}</li>
             <li>Peso: ${c.peso_kg || '?'}kg</li>
             <li>Serviço: GOLLOG ${c.tipo_servico}</li>
             <li><strong>Valor: R$ ${(c.valor_cotado || 0).toFixed(2)}</strong></li>
           </ul>
           <p>Ainda está pensando? Podemos ajudar a fechar ou calcular uma nova opção!</p>`,
      },
      {
        key: 'cotacao_perdida_d3', days: 3, cfg: 'followup_cotacao_d3',
        wpp: (c) =>
          `📦 Lembrete GOLLOG!\n\nSua cotação *${c.cidade_origem || c.cep_origem} → ${c.cidade_destino || c.cep_destino}* ainda está disponível.\n\n` +
          `⏰ Os valores podem variar a qualquer momento. Garanta já!\n\n` +
          `🔗 ${baseUrl}/cotacao`,
        emailSubject: 'Que tal fechar seu envio hoje? 📦',
        emailBody: (c, nome) =>
          `<p>Olá, <strong>${nome}</strong>!</p>
           <p>Sua cotação de <strong>${c.cidade_origem || c.cep_origem} → ${c.cidade_destino || c.cep_destino}</strong> ainda está disponível, mas os valores podem mudar a qualquer momento.</p>
           <p>Não deixe para depois — garanta seu envio hoje mesmo!</p>`,
      },
      {
        key: 'cotacao_perdida_d7', days: 7, cfg: 'followup_cotacao_d7',
        wpp: (c) =>
          `🚚 Última mensagem da GOLLOG sobre sua cotação!\n\n` +
          `Percebemos que você ainda não finalizou o envio de *${c.cidade_origem || c.cep_origem} → ${c.cidade_destino || c.cep_destino}*.\n\n` +
          `Se precisar de ajuda ou quiser negociar condições especiais, é só chamar! 😊\n\n` +
          `📲 ${baseUrl}/cotacao`,
        emailSubject: '⚠️ Última chance — cotação GOLLOG expirando',
        emailBody: (c, nome) =>
          `<p>Olá, <strong>${nome}</strong>!</p>
           <p>Esta é nossa última mensagem sobre a cotação de <strong>${c.cidade_origem || c.cep_origem} → ${c.cidade_destino || c.cep_destino}</strong>.</p>
           <p>Se precisar de ajuda, condições especiais ou quiser renegociar, nossa equipe está à disposição!</p>`,
      },
    ];

    for (const stage of stages) {
      if (config[stage.cfg] !== 'true') continue;
      const w = dayWindow(stage.days);
      const { data: cotacoes } = await supabase
        .from('cotacoes')
        .select('*, clientes(id, telefone, email, nome_razao_social)')
        .eq('status', 'enviada')
        .gte('created_at', w.gte)
        .lte('created_at', w.lte)
        .not('cliente_id', 'is', null);

      for (const cot of cotacoes || []) {
        if (await jaEnviado(stage.key, cot.cliente_id, cot.id)) continue;
        const phone = cot.clientes?.telefone;
        const email = cot.clientes?.email;
        const nome = cot.clientes?.nome_razao_social?.split(' ')[0] || 'Cliente';
        if (!phone && !email) continue;

        const wppMsg = stage.wpp(cot);
        const htmlEmail = emailTemplate(stage.emailSubject, stage.emailBody(cot, nome), `${baseUrl}/cotacao`, 'Fazer nova cotação');
        const canais = await notificar(phone, email, wppMsg, stage.emailSubject, htmlEmail, config, cot.clientes?.nome_razao_social || '');

        if (canais.length > 0) {
          await registrarEnvio(stage.key, cot.cliente_id, cot.id, 'cotacao', wppMsg, canais.join('+'), { valor: cot.valor_cotado });
          results.cotacoes++;
        }
      }
    }
  }

  // ─── BLOCO 2: Cadastros sem cotação ──────────────────────────────────
  if (config.followup_cadastro_ativo === 'true') {
    const stages = [
      {
        key: 'cadastro_sem_cotacao_d1', days: 1, cfg: 'followup_cadastro_d1',
        wpp: (c) =>
          `Olá, *${c.nome_razao_social?.split(' ')[0]}*! 👋\n\n` +
          `Bem-vindo à GOLLOG! Notamos que você se cadastrou mas ainda não fez nenhuma cotação.\n\n` +
          `📦 Que tal ver quanto custa enviar sua encomenda?\n\n` +
          `🔗 ${baseUrl}/cotacao`,
        emailSubject: 'Bem-vindo à GOLLOG! Faça sua primeira cotação grátis',
        emailBody: (nome) =>
          `<p>Olá, <strong>${nome}</strong>! 👋</p>
           <p>Ficamos felizes com seu cadastro na GOLLOG!</p>
           <p>Notamos que você ainda não fez nenhuma cotação. Que tal descobrir quanto custa enviar sua encomenda?</p>
           <ul>
             <li>✅ Cotação gratuita e sem compromisso</li>
             <li>✅ Coleta em domicílio em Osasco e Barueri</li>
             <li>✅ Rastreamento em tempo real</li>
           </ul>`,
      },
      {
        key: 'cadastro_sem_cotacao_d3', days: 3, cfg: 'followup_cadastro_d3',
        wpp: (c) =>
          `Oi *${c.nome_razao_social?.split(' ')[0]}*! 😊\n\n` +
          `A GOLLOG tem as melhores opções de frete para todo o Brasil.\n\n` +
          `📍 Atendemos com coleta em Osasco e Barueri.\n` +
          `⚡ Entrega expressa, econômica ou urgente.\n\n` +
          `Faça uma cotação grátis: ${baseUrl}/cotacao`,
        emailSubject: 'GOLLOG — frete expresso para todo o Brasil 🚀',
        emailBody: (nome) =>
          `<p>Oi, <strong>${nome}</strong>!</p>
           <p>A GOLLOG oferece as melhores opções de frete para todo o Brasil:</p>
           <ul>
             <li>🚀 <strong>GOLLOG Rápido</strong> — 1 a 2 dias úteis</li>
             <li>⚡ <strong>GOLLOG Urgente</strong> — 1 dia útil</li>
             <li>💰 <strong>GOLLOG Econômico</strong> — 3 a 7 dias úteis</li>
           </ul>
           <p>Coleta em domicílio disponível em Osasco e Barueri.</p>`,
      },
      {
        key: 'cadastro_sem_cotacao_d7', days: 7, cfg: 'followup_cadastro_d7',
        wpp: (c) =>
          `*${c.nome_razao_social?.split(' ')[0]}*, precisa enviar alguma coisa? 📦\n\n` +
          `Nossa equipe está pronta para te atender!\n\n` +
          `🚚 Cotação rápida: ${baseUrl}/cotacao\n` +
          `📅 Agendar coleta: ${baseUrl}/coleta\n\n` +
          `Qualquer dúvida, é só chamar aqui! 😊`,
        emailSubject: 'Nossa equipe quer te ajudar — GOLLOG',
        emailBody: (nome) =>
          `<p>Olá, <strong>${nome}</strong>!</p>
           <p>Percebemos que você ainda não realizou nenhum envio com a GOLLOG.</p>
           <p>Nossa equipe está pronta para ajudar você com tudo o que precisar:</p>
           <ul>
             <li>📦 Cotação gratuita online</li>
             <li>🚚 Agendamento de coleta</li>
             <li>📞 Atendimento personalizado</li>
           </ul>`,
      },
    ];

    for (const stage of stages) {
      if (config[stage.cfg] !== 'true') continue;
      const w = dayWindow(stage.days);
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome_razao_social, telefone, email')
        .gte('created_at', w.gte)
        .lte('created_at', w.lte);

      for (const cli of clientes || []) {
        if (!cli.telefone && !cli.email) continue;
        const { count } = await supabase
          .from('cotacoes')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', cli.id);
        if (count > 0) continue;
        if (await jaEnviado(stage.key, cli.id)) continue;

        const nome = cli.nome_razao_social?.split(' ')[0] || 'Cliente';
        const wppMsg = stage.wpp(cli);
        const htmlEmail = emailTemplate(stage.emailSubject, stage.emailBody(nome), `${baseUrl}/cotacao`, 'Fazer cotação grátis');
        const canais = await notificar(cli.telefone, cli.email, wppMsg, stage.emailSubject, htmlEmail, config, cli.nome_razao_social || '');

        if (canais.length > 0) {
          await registrarEnvio(stage.key, cli.id, null, null, wppMsg, canais.join('+'));
          results.cadastros++;
        }
      }
    }
  }

  // ─── BLOCO 3: Clientes inativos (RFM) ────────────────────────────────
  if (config.followup_inativo_ativo === 'true') {
    const segments = [
      {
        key: 'inativo_30d', days: 30, cfg: 'followup_inativo_30d',
        wpp: (c) =>
          `Olá, *${c.nome_razao_social?.split(' ')[0]}*! 👋\n\n` +
          `Faz um tempinho que não nos vemos por aqui!\n\n` +
          `🚚 Tem algum envio planejado? Estamos prontos para ajudar!\n\n` +
          `📦 Cotação rápida: ${baseUrl}/cotacao`,
        emailSubject: 'Sentimos sua falta! Novo envio com GOLLOG? 📦',
        emailBody: (nome) =>
          `<p>Olá, <strong>${nome}</strong>!</p>
           <p>Faz um tempinho que não fazemos um envio juntos. Tem algum frete planejado?</p>
           <p>Estamos prontos para atender você com a mesma qualidade de sempre!</p>`,
      },
      {
        key: 'inativo_60d', days: 60, cfg: 'followup_inativo_60d',
        wpp: (c) =>
          `*${c.nome_razao_social?.split(' ')[0]}*, sentimos sua falta! 😊\n\n` +
          `Já faz 2 meses desde o seu último envio com a GOLLOG.\n\n` +
          `💡 Lembre: temos coleta em domicílio, rastreamento em tempo real e atendimento personalizado.\n\n` +
          `🔗 ${baseUrl}/cotacao`,
        emailSubject: '2 meses sem envios — estamos aqui quando precisar',
        emailBody: (nome) =>
          `<p>Olá, <strong>${nome}</strong>!</p>
           <p>Já faz 2 meses desde o seu último envio com a GOLLOG. Esperamos que esteja tudo bem!</p>
           <p>Quando você precisar de frete, estamos aqui com:</p>
           <ul>
             <li>🏠 Coleta em domicílio</li>
             <li>📍 Rastreamento em tempo real</li>
             <li>💬 Atendimento personalizado via WhatsApp</li>
           </ul>`,
      },
      {
        key: 'inativo_90d', days: 90, cfg: 'followup_inativo_90d',
        wpp: (c) =>
          `Oi, *${c.nome_razao_social?.split(' ')[0]}*! 📦\n\n` +
          `Queremos te reconquistar! Há 3 meses você não faz envios com a GOLLOG.\n\n` +
          `🎁 Entre em contato e pergunte sobre nossas condições especiais para clientes que retornam!\n\n` +
          `📲 ${baseUrl}/cotacao`,
        emailSubject: '🎁 Condições especiais para você retornar — GOLLOG',
        emailBody: (nome) =>
          `<p>Olá, <strong>${nome}</strong>!</p>
           <p>Queremos muito te ter de volta! Já faz 3 meses desde o seu último envio com a GOLLOG.</p>
           <p><strong>Entre em contato e pergunte sobre as condições especiais para clientes que retornam.</strong></p>
           <p>Nossa equipe está pronta para receber você com o melhor atendimento!</p>`,
      },
    ];

    for (const seg of segments) {
      if (config[seg.cfg] !== 'true') continue;
      const w = dayWindow(seg.days, 12);
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome_razao_social, telefone, email')
        .gte('ultimo_contato', w.gte)
        .lte('ultimo_contato', w.lte)
        .eq('status', 'ativo');

      for (const cli of clientes || []) {
        if (!cli.telefone && !cli.email) continue;
        if (await jaEnviado(seg.key, cli.id)) continue;

        const nome = cli.nome_razao_social?.split(' ')[0] || 'Cliente';
        const wppMsg = seg.wpp(cli);
        const htmlEmail = emailTemplate(seg.emailSubject, seg.emailBody(nome), `${baseUrl}/cotacao`, 'Fazer cotação');
        const canais = await notificar(cli.telefone, cli.email, wppMsg, seg.emailSubject, htmlEmail, config, cli.nome_razao_social || '');

        if (canais.length > 0) {
          await registrarEnvio(seg.key, cli.id, null, null, wppMsg, canais.join('+'), { dias_inativo: seg.days });
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
      .select('*, clientes(telefone, email, nome_razao_social)')
      .eq('data_solicitada', hoje)
      .in('status', ['solicitada', 'agendada'])
      .eq('alerta_enviado', false);

    for (const col of coletas || []) {
      const phone = col.clientes?.telefone;
      const email = col.clientes?.email;
      const nome = col.clientes?.nome_razao_social?.split(' ')[0] || 'Cliente';
      if (!phone && !email) continue;

      const wppMsg =
        `🚚 *Lembrete de Coleta — GOLLOG*\n\n` +
        `Olá, *${nome}*!\n\n` +
        `Sua coleta está agendada para *hoje*:\n` +
        `📍 ${col.endereco_coleta || 'Endereço confirmado'}\n` +
        `⏰ Horário: ${col.horario_preferido || 'A confirmar'}\n` +
        `📦 ${col.quantidade_volumes || 1} volume(s)\n\n` +
        `Nossa equipe entrará em contato antes da chegada. Qualquer dúvida, responda aqui!`;

      const emailBody =
        `<p>Olá, <strong>${nome}</strong>!</p>
         <p>Sua coleta está agendada para <strong>hoje</strong>:</p>
         <ul>
           <li>📍 Endereço: ${col.endereco_coleta || 'A confirmar'}</li>
           <li>⏰ Horário previsto: ${col.horario_preferido || 'A confirmar'}</li>
           <li>📦 Volumes: ${col.quantidade_volumes || 1}</li>
           ${col.observacoes ? `<li>📝 Obs: ${col.observacoes}</li>` : ''}
         </ul>
         <p>Nossa equipe entrará em contato antes da chegada. Prepare sua encomenda!</p>`;

      const subject = '🚚 Lembrete: sua coleta GOLLOG é hoje!';
      const htmlEmail = emailTemplate(subject, emailBody);
      const canais = await notificar(phone, email, wppMsg, subject, htmlEmail, config, col.clientes?.nome_razao_social || '');

      if (canais.length > 0) {
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
      const mesNome = mesPassado.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome_razao_social, telefone, email, total_envios, valor_total_gasto')
        .eq('status', 'ativo')
        .gt('total_envios', 0);

      for (const cli of clientes || []) {
        if (!cli.telefone && !cli.email) continue;
        const { count: enviosMes } = await supabase
          .from('rastreamentos')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', cli.id)
          .gte('created_at', mesPassado.toISOString())
          .lte('created_at', fimMesPassado.toISOString());

        if (!enviosMes || enviosMes === 0) continue;

        const nome = cli.nome_razao_social?.split(' ')[0] || 'Cliente';
        const wppMsg =
          `📊 *Seu resumo GOLLOG — ${mesNome}*\n\n` +
          `Olá, *${nome}*!\n\n` +
          `📦 Envios no mês: *${enviosMes}*\n` +
          `📈 Total acumulado: *${cli.total_envios}* envios\n\n` +
          `Obrigado pela confiança! Continue enviando com a GOLLOG. 🚀\n\n` +
          `📲 Nova cotação: ${baseUrl}/cotacao`;

        const subject = `📊 Seu resumo GOLLOG — ${mesNome}`;
        const emailBody =
          `<p>Olá, <strong>${nome}</strong>!</p>
           <p>Aqui está o seu resumo de envios de <strong>${mesNome}</strong>:</p>
           <table style="width:100%;border-collapse:collapse;margin:16px 0">
             <tr style="background:#f4f4f4">
               <td style="padding:10px 14px;font-weight:600">📦 Envios no mês</td>
               <td style="padding:10px 14px;font-size:20px;font-weight:800;color:#F37021">${enviosMes}</td>
             </tr>
             <tr>
               <td style="padding:10px 14px;font-weight:600">📈 Total acumulado</td>
               <td style="padding:10px 14px;font-size:20px;font-weight:800;color:#F37021">${cli.total_envios}</td>
             </tr>
             ${cli.valor_total_gasto ? `<tr style="background:#f4f4f4">
               <td style="padding:10px 14px;font-weight:600">💰 Valor total gasto</td>
               <td style="padding:10px 14px;font-size:18px;font-weight:800;color:#00C853">R$ ${(cli.valor_total_gasto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
             </tr>` : ''}
           </table>
           <p>Obrigado pela confiança! Esperamos continuar fazendo parte do seu negócio. 🚀</p>`;

        const htmlEmail = emailTemplate(subject, emailBody, `${baseUrl}/cotacao`, 'Nova cotação');
        const canais = await notificar(cli.telefone, cli.email, wppMsg, subject, htmlEmail, config, cli.nome_razao_social || '');
        if (canais.length > 0) results.relatorio++;
      }
    }
  }

  // ─── BLOCO 6: Aniversariantes do dia ─────────────────────────────────
  if (config.followup_aniversario_ativo === 'true') {
    const hoje = new Date();
    const mesHoje  = String(hoje.getMonth() + 1).padStart(2, '0');
    const diaHoje  = String(hoje.getDate()).padStart(2, '0');
    const anoHoje  = String(hoje.getFullYear());

    // Busca clientes PF cujo mês/dia de nascimento é hoje
    const { data: aniversariantes } = await supabase
      .from('clientes')
      .select('id, nome_razao_social, telefone, data_nascimento')
      .eq('tipo', 'PF')
      .not('data_nascimento', 'is', null)
      .not('telefone', 'is', null);

    const msgTemplate = config.followup_aniversario_msg ||
      '🎂 Feliz Aniversário, *{nome}*! 🎉\n\nA equipe GOLLOG deseja um dia incrível para você!\n\nConte sempre com a gente! 😊';

    for (const cli of aniversariantes || []) {
      if (!cli.data_nascimento) continue;
      const [, mesCli, diaCli] = cli.data_nascimento.split('-');
      if (mesCli !== mesHoje || diaCli !== diaHoje) continue;

      // Evita mandar mais de uma vez por ano (verifica se já enviou em 2024 ou ano atual)
      const anoInicio = `${anoHoje}-01-01T00:00:00Z`;
      if (await jaEnviado('aniversario', cli.id)) continue;
      const { data: jaEnviouEsteAno } = await supabase
        .from('followups')
        .select('id')
        .eq('tipo', 'aniversario')
        .eq('cliente_id', cli.id)
        .gte('created_at', anoInicio)
        .maybeSingle();
      if (jaEnviouEsteAno) continue;

      const nome = cli.nome_razao_social?.split(' ')[0] || 'Cliente';
      const wppMsg = msgTemplate.replace(/\{nome\}/g, nome);

      const ok = await sendWhatsApp(cli.telefone, wppMsg, config, cli.nome_razao_social || '');
      if (ok) {
        await supabase.from('followups').insert([{
          tipo: 'aniversario',
          cliente_id: cli.id,
          status: 'enviado',
          canal: 'whatsapp',
          mensagem: wppMsg,
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          metadata: { data_nascimento: cli.data_nascimento },
        }]);
        results.aniversarios++;
      }
    }
  }

  return res.status(200).json({ success: true, results });
}
