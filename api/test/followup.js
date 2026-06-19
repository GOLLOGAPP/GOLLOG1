import { getConfig, clearConfigCache, sendWhatsApp, sendEmail, emailTemplate } from '../_lib/notify.js';

const TIPOS = {
  cotacao_d1: {
    emailSubject: 'Sua cotação GOLLOG ainda está disponível',
    wpp: ({ nome, origem, destino, valor, servico, baseUrl }) =>
      `👋 Olá! Vimos que você fez uma cotação de *${origem} → ${destino}* ontem.\n\n` +
      `💰 Valor: *R$ ${valor}* (${servico})\n\n` +
      `Ainda está pensando? Posso te ajudar a fechar ou calcular uma nova opção!\n\n` +
      `📲 ${baseUrl}/cotacao`,
    emailBody: ({ nome, origem, destino, valor, servico }) =>
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Notamos que você fez uma cotação de <strong>${origem} → ${destino}</strong> ontem e ainda não finalizou o envio.</p>
       <p><strong>Resumo da sua cotação:</strong></p>
       <ul>
         <li>Rota: ${origem} → ${destino}</li>
         <li>Serviço: GOLLOG ${servico}</li>
         <li><strong>Valor: R$ ${valor}</strong></li>
       </ul>
       <p>Ainda está pensando? Podemos ajudar a fechar ou calcular uma nova opção!</p>`,
  },

  cotacao_d3: {
    emailSubject: 'Que tal fechar seu envio hoje? 📦',
    wpp: ({ nome, origem, destino, baseUrl }) =>
      `📦 Lembrete GOLLOG!\n\nSua cotação *${origem} → ${destino}* ainda está disponível.\n\n` +
      `⏰ Os valores podem variar a qualquer momento. Garanta já!\n\n` +
      `🔗 ${baseUrl}/cotacao`,
    emailBody: ({ nome, origem, destino }) =>
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Sua cotação de <strong>${origem} → ${destino}</strong> ainda está disponível, mas os valores podem mudar a qualquer momento.</p>
       <p>Não deixe para depois — garanta seu envio hoje mesmo!</p>`,
  },

  cotacao_d7: {
    emailSubject: '⚠️ Última chance — cotação GOLLOG expirando',
    wpp: ({ nome, origem, destino, baseUrl }) =>
      `🚚 Última mensagem da GOLLOG sobre sua cotação!\n\n` +
      `Percebemos que você ainda não finalizou o envio de *${origem} → ${destino}*.\n\n` +
      `Se precisar de ajuda ou quiser negociar condições especiais, é só chamar! 😊\n\n` +
      `📲 ${baseUrl}/cotacao`,
    emailBody: ({ nome, origem, destino }) =>
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Esta é nossa última mensagem sobre a cotação de <strong>${origem} → ${destino}</strong>.</p>
       <p>Se precisar de ajuda, condições especiais ou quiser renegociar, nossa equipe está à disposição!</p>`,
  },

  cadastro_d1: {
    emailSubject: 'Bem-vindo à GOLLOG! Faça sua primeira cotação grátis',
    wpp: ({ nome, baseUrl }) =>
      `Olá, *${nome}*! 👋\n\n` +
      `Bem-vindo à GOLLOG! Notamos que você se cadastrou mas ainda não fez nenhuma cotação.\n\n` +
      `📦 Que tal ver quanto custa enviar sua encomenda?\n\n` +
      `🔗 ${baseUrl}/cotacao`,
    emailBody: ({ nome }) =>
      `<p>Olá, <strong>${nome}</strong>! 👋</p>
       <p>Ficamos felizes com seu cadastro na GOLLOG!</p>
       <p>Notamos que você ainda não fez nenhuma cotação. Que tal descobrir quanto custa enviar sua encomenda?</p>
       <ul>
         <li>✅ Cotação gratuita e sem compromisso</li>
         <li>✅ Coleta em domicílio em Osasco e Barueri</li>
         <li>✅ Rastreamento em tempo real</li>
       </ul>`,
  },

  cadastro_d3: {
    emailSubject: 'GOLLOG — frete expresso para todo o Brasil 🚀',
    wpp: ({ nome, baseUrl }) =>
      `Oi *${nome}*! 😊\n\n` +
      `A GOLLOG tem as melhores opções de frete para todo o Brasil.\n\n` +
      `📍 Atendemos com coleta em Osasco e Barueri.\n` +
      `⚡ Entrega expressa, econômica ou urgente.\n\n` +
      `Faça uma cotação grátis: ${baseUrl}/cotacao`,
    emailBody: ({ nome }) =>
      `<p>Oi, <strong>${nome}</strong>!</p>
       <p>A GOLLOG oferece as melhores opções de frete para todo o Brasil:</p>
       <ul>
         <li>🚀 <strong>GOLLOG Rápido</strong> — 1 a 2 dias úteis</li>
         <li>⚡ <strong>GOLLOG Urgente</strong> — 1 dia útil</li>
         <li>💰 <strong>GOLLOG Econômico</strong> — 3 a 7 dias úteis</li>
       </ul>
       <p>Coleta em domicílio disponível em Osasco e Barueri.</p>`,
  },

  cadastro_d7: {
    emailSubject: 'Nossa equipe quer te ajudar — GOLLOG',
    wpp: ({ nome, baseUrl }) =>
      `*${nome}*, precisa enviar alguma coisa? 📦\n\n` +
      `Nossa equipe está pronta para te atender!\n\n` +
      `🚚 Cotação rápida: ${baseUrl}/cotacao\n` +
      `📅 Agendar coleta: ${baseUrl}/coleta\n\n` +
      `Qualquer dúvida, é só chamar aqui! 😊`,
    emailBody: ({ nome }) =>
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Percebemos que você ainda não realizou nenhum envio com a GOLLOG.</p>
       <p>Nossa equipe está pronta para ajudar você com tudo o que precisar:</p>
       <ul>
         <li>📦 Cotação gratuita online</li>
         <li>🚚 Agendamento de coleta em domicílio</li>
         <li>📞 Atendimento personalizado via WhatsApp</li>
       </ul>`,
  },

  inativo_30d: {
    emailSubject: 'Sentimos sua falta! Novo envio com GOLLOG? 📦',
    wpp: ({ nome, baseUrl }) =>
      `Olá, *${nome}*! 👋\n\n` +
      `Faz um tempinho que não nos vemos por aqui!\n\n` +
      `🚚 Tem algum envio planejado? Estamos prontos para ajudar!\n\n` +
      `📦 Cotação rápida: ${baseUrl}/cotacao`,
    emailBody: ({ nome }) =>
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Faz um tempinho que não fazemos um envio juntos. Tem algum frete planejado?</p>
       <p>Estamos prontos para atender você com a mesma qualidade de sempre!</p>`,
  },

  inativo_60d: {
    emailSubject: '2 meses sem envios — estamos aqui quando precisar',
    wpp: ({ nome, baseUrl }) =>
      `*${nome}*, sentimos sua falta! 😊\n\n` +
      `Já faz 2 meses desde o seu último envio com a GOLLOG.\n\n` +
      `💡 Lembre: temos coleta em domicílio, rastreamento em tempo real e atendimento personalizado.\n\n` +
      `🔗 ${baseUrl}/cotacao`,
    emailBody: ({ nome }) =>
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Já faz 2 meses desde o seu último envio com a GOLLOG. Esperamos que esteja tudo bem!</p>
       <p>Quando você precisar de frete, estamos aqui com coleta em domicílio, rastreamento em tempo real e atendimento personalizado.</p>`,
  },

  inativo_90d: {
    emailSubject: '🎁 Condições especiais para você retornar — GOLLOG',
    wpp: ({ nome, baseUrl }) =>
      `Oi, *${nome}*! 📦\n\n` +
      `Queremos te reconquistar! Há 3 meses você não faz envios com a GOLLOG.\n\n` +
      `🎁 Entre em contato e pergunte sobre nossas condições especiais para clientes que retornam!\n\n` +
      `📲 ${baseUrl}/cotacao`,
    emailBody: ({ nome }) =>
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Queremos muito te ter de volta! Já faz 3 meses desde o seu último envio com a GOLLOG.</p>
       <p><strong>Entre em contato e pergunte sobre as condições especiais para clientes que retornam.</strong></p>`,
  },

  coleta_hoje: {
    emailSubject: '🚚 Lembrete: sua coleta GOLLOG é hoje!',
    wpp: ({ nome, endereco, horario, volumes }) =>
      `🚚 *Lembrete de Coleta — GOLLOG*\n\n` +
      `Olá, *${nome}*!\n\n` +
      `Sua coleta está agendada para *hoje*:\n` +
      `📍 ${endereco}\n` +
      `⏰ Horário: ${horario}\n` +
      `📦 ${volumes} volume(s)\n\n` +
      `Nossa equipe entrará em contato antes da chegada. Qualquer dúvida, responda aqui!`,
    emailBody: ({ nome, endereco, horario, volumes }) =>
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Sua coleta está agendada para <strong>hoje</strong>:</p>
       <ul>
         <li>📍 Endereço: ${endereco}</li>
         <li>⏰ Horário previsto: ${horario}</li>
         <li>📦 Volumes: ${volumes}</li>
       </ul>
       <p>Nossa equipe entrará em contato antes da chegada. Prepare sua encomenda!</p>`,
  },

  rastreio_atualizacao: {
    emailSubject: '📦 Atualização do seu rastreamento — GOLLOG',
    wpp: ({ nome, codigo, status, origem, destino, baseUrl }) =>
      `📦 *Atualização de Rastreio*\n\n` +
      `Código: *${codigo}*\n` +
      `🔄 Novo status: *${status}*\n` +
      `✈️ Rota: ${origem} → ${destino}\n\n` +
      `🔗 Acompanhar: ${baseUrl}/rastreamento?doc=${codigo}`,
    emailBody: ({ nome, codigo, status, origem, destino, baseUrl }) =>
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Seu rastreamento foi atualizado:</p>
       <ul>
         <li>📦 Código: <strong>${codigo}</strong></li>
         <li>🔄 Novo status: <strong>${status}</strong></li>
         <li>✈️ Rota: ${origem} → ${destino}</li>
       </ul>
       <p><a href="${baseUrl}/rastreamento?doc=${codigo}">Acompanhar rastreamento completo →</a></p>`,
  },

  rastreio_entregue: {
    emailSubject: '✅ Sua encomenda foi entregue! Avalie o serviço',
    wpp: ({ nome, codigo, status, rastId, baseUrl }) =>
      `✅ *Encomenda Entregue!*\n\n` +
      `📦 Código: *${codigo}*\n` +
      `🎉 Status: *${status}*\n\n` +
      `Obrigado por confiar na GOLLOG, ${nome}! 🚀\n\n` +
      `⭐ Como foi sua experiência?\n${baseUrl}/avaliar/${rastId}`,
    emailBody: ({ nome, codigo, status, rastId, baseUrl }) =>
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Sua encomenda com código <strong>${codigo}</strong> foi entregue com sucesso!</p>
       <p>Status: <strong>${status}</strong></p>
       <p>Ficamos felizes em ter participado desta entrega. Sua opinião é muito importante para nós!</p>`,
    ctaUrl: ({ rastId, baseUrl }) => `${baseUrl}/avaliar/${rastId}`,
    ctaLabel: '⭐ Avaliar o serviço',
  },

  relatorio_mensal: {
    emailSubject: `📊 Seu resumo GOLLOG — ${new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`,
    wpp: ({ nome, enviosMes, totalEnvios, baseUrl }) =>
      `📊 *Seu resumo GOLLOG — ${new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}*\n\n` +
      `Olá, *${nome}*!\n\n` +
      `📦 Envios no mês: *${enviosMes}*\n` +
      `📈 Total acumulado: *${totalEnvios}* envios\n\n` +
      `Obrigado pela confiança! Continue enviando com a GOLLOG. 🚀\n\n` +
      `📲 Nova cotação: ${baseUrl}/cotacao`,
    emailBody: ({ nome, enviosMes, totalEnvios }) =>
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Aqui está o seu resumo de envios do mês:</p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0">
         <tr style="background:#f4f4f4">
           <td style="padding:10px 14px;font-weight:600">📦 Envios no mês</td>
           <td style="padding:10px 14px;font-size:20px;font-weight:800;color:#F37021">${enviosMes}</td>
         </tr>
         <tr>
           <td style="padding:10px 14px;font-weight:600">📈 Total acumulado</td>
           <td style="padding:10px 14px;font-size:20px;font-weight:800;color:#F37021">${totalEnvios}</td>
         </tr>
       </table>
       <p>Obrigado pela confiança! Esperamos continuar fazendo parte do seu negócio. 🚀</p>`,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    tipo,
    phone = '',
    email = '',
    nome = 'João Teste',
    origem = 'Osasco/SP',
    destino = 'São Paulo/SP',
    valor = '45.90',
    servico = 'Rápido',
    codigo = 'GLL-12345678',
    status = 'Em trânsito',
    rastId = 'demo',
    endereco = 'Rua Exemplo, 100 — Osasco',
    horario = '14h–18h',
    volumes = '2',
    enviosMes = '5',
    totalEnvios = '23',
    enviar = false,
  } = req.body || {};

  if (!tipo) return res.status(400).json({ error: 'tipo obrigatório' });

  const def = TIPOS[tipo];
  if (!def) return res.status(400).json({ error: `Tipo desconhecido: ${tipo}. Tipos válidos: ${Object.keys(TIPOS).join(', ')}` });

  clearConfigCache();
  const config = await getConfig();
  const baseUrl = config.app_base_url || 'https://www.golcargo.com.br';

  const params = { nome, origem, destino, valor, servico, codigo, status, rastId, endereco, horario, volumes, enviosMes, totalEnvios, baseUrl };

  const wppMsg = def.wpp(params);
  const emailSubject = typeof def.emailSubject === 'function' ? def.emailSubject(params) : def.emailSubject;
  const emailBodyHtml = def.emailBody(params);
  const ctaUrl = def.ctaUrl ? def.ctaUrl(params) : `${baseUrl}/cotacao`;
  const ctaLabel = def.ctaLabel || 'Acessar GOLLOG';
  const htmlEmail = emailTemplate(emailSubject, emailBodyHtml, ctaUrl, ctaLabel);

  let wppEnviado = false;
  let emailEnviado = false;
  let erros = [];

  if (enviar) {
    if (phone) {
      wppEnviado = await sendWhatsApp(phone, wppMsg, config);
      if (!wppEnviado) erros.push('WhatsApp: falha — verifique o webhook de notificações nas configurações.');
    }
    if (email) {
      const result = await sendEmail(email, emailSubject, htmlEmail, config);
      emailEnviado = result.ok;
      if (!result.ok) erros.push(`Email: ${result.error || 'falha desconhecida'}`);
    }
  }

  return res.status(200).json({
    success: true,
    tipo,
    mensagem: wppMsg,
    emailSubject,
    emailHtml: htmlEmail,
    wppEnviado,
    emailEnviado,
    erros,
    link_avaliacao: tipo === 'rastreio_entregue' ? `${baseUrl}/avaliar/${rastId}` : null,
    debug: {
      apiKeyPresent: !!config.resend_api_key,
      fromEmail: config.resend_from_email || 'GOLLOG <noreply@golcargo.com.br>',
    },
  });
}
