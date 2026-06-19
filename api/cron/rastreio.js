import { supabase, getConfig, sendWhatsApp, sendEmail, emailTemplate } from '../_lib/notify.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const config = await getConfig();
  if (config.followup_rastreio_ativo !== 'true') {
    return res.status(200).json({ skipped: true, reason: 'polling disabled' });
  }

  const baseUrl = config.app_base_url || 'https://www.golcargo.com.br';

  // Busca rastreamentos ativos dos últimos 60 dias
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);

  const { data: rastreamentos } = await supabase
    .from('rastreamentos')
    .select('*, clientes(nome_razao_social, telefone, email)')
    .gte('created_at', cutoff.toISOString())
    .eq('notificado_entregue', false)
    .eq('notificar_atualizacoes', true)
    .not('status_atual', 'in', '("Não encontrado","Erro na consulta","Consultando...")');

  if (!rastreamentos || rastreamentos.length === 0) {
    return res.status(200).json({ total: 0, updated: 0, notified: 0 });
  }

  let updated = 0;
  let notified = 0;

  for (const rast of rastreamentos) {
    try {
      const gollogRes = await fetch('https://api-golcargo.gollog.com.br/api/sales/transportorder/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CompanyKey': process.env.GOLLOG_COMPANY_KEY || 'G3',
          'language': 'pt-BR',
        },
        body: JSON.stringify({ type: 'documentnumber', value: rast.codigo_rastreio }),
      });

      if (!gollogRes.ok) continue;

      const gollogData = await gollogRes.json();
      const detail = gollogData.detail?.awbInfo || {};
      const events = gollogData.events || [];
      const lastEvt = events[events.length - 1];
      const novoStatus = detail.operationalStatusDescription
        || lastEvt?.status?.codeDescription
        || rast.status_atual;

      // Sem mudança de status — pula
      if (novoStatus === rast.status_atual) continue;

      const isEntregue = /entregue/i.test(novoStatus);
      const phone = rast.clientes?.telefone || rast.telefone_notificacao;
      const email = rast.clientes?.email;
      const nome = rast.clientes?.nome_razao_social || 'Cliente';
      const nomeFirst = nome.split(' ')[0];
      const origem = detail.routing?.origin?.station || '';
      const destino = detail.routing?.destination?.station || '';
      const rota = origem && destino ? `✈️ Rota: ${origem} → ${destino}\n` : '';

      // Mensagem WhatsApp
      let msgWpp;
      if (isEntregue) {
        msgWpp = `✅ *Encomenda Entregue!*\n\n` +
          `📦 Código: *${rast.codigo_rastreio}*\n` +
          `🎉 Status: *${novoStatus}*\n\n` +
          `Obrigado por confiar na GOLLOG, ${nomeFirst}! 🚀\n\n` +
          `⭐ Como foi sua experiência?\n${baseUrl}/avaliar/${rast.id}`;
      } else {
        msgWpp = `📦 *Atualização de Rastreio*\n\n` +
          `Código: *${rast.codigo_rastreio}*\n` +
          `🔄 Novo status: *${novoStatus}*\n` +
          rota +
          `\n🔗 Acompanhar: ${baseUrl}/rastreamento?doc=${rast.codigo_rastreio}`;
      }

      if (phone) {
        const sent = await sendWhatsApp(phone, msgWpp, config);
        if (sent) notified++;
      }

      // Email apenas na entrega
      if (isEntregue && email) {
        const html = emailTemplate(
          '✅ Sua encomenda foi entregue!',
          `<p>Olá, <strong>${nome}</strong>!</p>
           <p>Sua encomenda com código <strong>${rast.codigo_rastreio}</strong> foi entregue com sucesso.</p>
           <p>Status: <strong>${novoStatus}</strong></p>
           <p>Ficamos felizes em ter participado desta entrega. Sua opinião é muito importante para nós!</p>`,
          `${baseUrl}/avaliar/${rast.id}`,
          '⭐ Avaliar o serviço'
        );
        await sendEmail(email, `✅ Encomenda ${rast.codigo_rastreio} entregue!`, html, config);
      }

      // Atualiza rastreamento
      const updateData = {
        status_anterior: rast.status_atual,
        status_atual: novoStatus,
        ultima_consulta: new Date().toISOString(),
        historico_status: events.map(e => ({
          status: e.status?.codeDescription,
          data: e.eventDateTimeLT,
          local: `${e.station} - ${e.status?.stationName || ''}`,
          code: e.status?.code,
        })),
      };
      if (isEntregue) {
        updateData.notificado_entregue = true;
        updateData.avaliacao_enviada = true;
      }

      await supabase.from('rastreamentos').update(updateData).eq('id', rast.id);
      updated++;

      if (rast.cliente_id) {
        await supabase.from('atividades_log').insert([{
          cliente_id: rast.cliente_id,
          tipo: 'rastreamento',
          descricao: `Status atualizado: ${rast.status_atual} → ${novoStatus}`,
          canal: 'sistema',
        }]);
      }

    } catch (err) {
      console.error(`Erro rastreamento ${rast.codigo_rastreio}:`, err.message);
    }
  }

  return res.status(200).json({ total: rastreamentos.length, updated, notified });
}
