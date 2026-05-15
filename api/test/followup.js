import { supabase, getConfig, sendWhatsApp, sendEmail, emailTemplate } from '../_lib/notify.js';

const MENSAGENS = {
  cotacao_d1: ({ nome, origem, destino, valor, servico, baseUrl }) =>
    `👋 Olá! Vimos que você fez uma cotação de *${origem} → ${destino}* ontem.\n\n` +
    `💰 Valor: *R$ ${valor}* (${servico})\n\n` +
    `Ainda está pensando? Posso te ajudar a fechar ou calcular uma nova opção!\n\n` +
    `📲 Responda aqui pelo WhatsApp ou faça uma nova cotação: ${baseUrl}/cotacao`,

  cotacao_d3: ({ nome, origem, destino, baseUrl }) =>
    `📦 Lembrete GOLLOG!\n\nSua cotação *${origem} → ${destino}* ainda está disponível.\n\n` +
    `⏰ Os valores podem variar a qualquer momento. Garanta já!\n\n` +
    `🔗 Fale conosco ou refaça a cotação: ${baseUrl}/cotacao`,

  cotacao_d7: ({ nome, origem, destino, baseUrl }) =>
    `🚚 Última mensagem da GOLLOG sobre sua cotação!\n\n` +
    `Percebemos que você ainda não finalizou o envio de *${origem} → ${destino}*.\n\n` +
    `Se precisar de ajuda ou quiser negociar condições especiais, é só chamar! 😊\n\n` +
    `📲 ${baseUrl}/cotacao`,

  cadastro_d1: ({ nome, baseUrl }) =>
    `Olá, *${nome}*! 👋\n\n` +
    `Bem-vindo à GOLLOG! Notamos que você se cadastrou mas ainda não fez nenhuma cotação.\n\n` +
    `📦 Que tal ver quanto custa enviar sua encomenda?\n\n` +
    `🔗 ${baseUrl}/cotacao`,

  cadastro_d3: ({ nome, baseUrl }) =>
    `Oi *${nome}*! 😊\n\n` +
    `A GOLLOG tem as melhores opções de frete para todo o Brasil.\n\n` +
    `📍 Atendemos com coleta em Osasco e Barueri.\n` +
    `⚡ Entrega expressa, econômica ou urgente.\n\n` +
    `Faça uma cotação grátis: ${baseUrl}/cotacao`,

  cadastro_d7: ({ nome, baseUrl }) =>
    `*${nome}*, precisa enviar alguma coisa? 📦\n\n` +
    `Nossa equipe está pronta para te atender!\n\n` +
    `🚚 Cotação rápida: ${baseUrl}/cotacao\n` +
    `📅 Agendar coleta: ${baseUrl}/coleta\n\n` +
    `Qualquer dúvida, é só chamar aqui! 😊`,

  inativo_30d: ({ nome, baseUrl }) =>
    `Olá, *${nome}*! 👋\n\n` +
    `Faz um tempinho que não nos vemos por aqui!\n\n` +
    `🚚 Tem algum envio planejado? Estamos prontos para ajudar!\n\n` +
    `📦 Cotação rápida: ${baseUrl}/cotacao`,

  inativo_60d: ({ nome, baseUrl }) =>
    `*${nome}*, sentimos sua falta! 😊\n\n` +
    `Já faz 2 meses desde o seu último envio com a GOLLOG.\n\n` +
    `💡 Lembre: temos coleta em domicílio, rastreamento em tempo real e atendimento personalizado.\n\n` +
    `🔗 Fale conosco ou faça uma cotação: ${baseUrl}/cotacao`,

  inativo_90d: ({ nome, baseUrl }) =>
    `Oi, *${nome}*! 📦\n\n` +
    `Queremos te reconquistar! Há 3 meses você não faz envios com a GOLLOG.\n\n` +
    `🎁 Entre em contato e pergunte sobre nossas condições especiais para clientes que retornam!\n\n` +
    `📲 Responda aqui ou acesse: ${baseUrl}/cotacao`,

  coleta_hoje: ({ nome, endereco, horario, volumes }) =>
    `🚚 *Lembrete de Coleta — GOLLOG*\n\n` +
    `Olá, *${nome}*!\n\n` +
    `Sua coleta está agendada para *hoje*:\n` +
    `📍 ${endereco}\n` +
    `⏰ Horário: ${horario}\n` +
    `📦 ${volumes} volume(s)\n\n` +
    `Nossa equipe entrará em contato antes da chegada. Qualquer dúvida, responda aqui!`,

  rastreio_atualizacao: ({ nome, codigo, status, origem, destino, baseUrl }) =>
    `📦 *Atualização de Rastreio*\n\n` +
    `Código: *${codigo}*\n` +
    `🔄 Novo status: *${status}*\n` +
    `✈️ Rota: ${origem} → ${destino}\n\n` +
    `🔗 Acompanhar: ${baseUrl}/rastreamento?doc=${codigo}`,

  rastreio_entregue: ({ nome, codigo, status, baseUrl, rastId }) =>
    `✅ *Encomenda Entregue!*\n\n` +
    `📦 Código: *${codigo}*\n` +
    `🎉 Status: *${status || 'Entregue'}*\n\n` +
    `Obrigado por confiar na GOLLOG, ${nome}! 🚀\n\n` +
    `⭐ Como foi sua experiência?\n${baseUrl}/avaliar/${rastId || 'demo'}`,

  relatorio_mensal: ({ nome, enviosMes, totalEnvios, baseUrl }) =>
    `📊 *Seu resumo GOLLOG — ${new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}*\n\n` +
    `Olá, *${nome}*!\n\n` +
    `📦 Envios no mês: *${enviosMes}*\n` +
    `📈 Total acumulado: *${totalEnvios}* envios\n\n` +
    `Obrigado pela confiança! Continue enviando com a GOLLOG. 🚀\n\n` +
    `📲 Nova cotação: ${baseUrl}/cotacao`,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    tipo, phone, nome = 'João Teste',
    // cotação
    origem = 'Osasco/SP', destino = 'São Paulo/SP', valor = '45.90', servico = 'Rápido',
    // rastreio
    codigo = 'GLL-12345678', status = 'Em trânsito', rastId = 'demo',
    // coleta
    endereco = 'Rua Exemplo, 100 — Osasco', horario = '14h–18h', volumes = '2',
    // relatório
    enviosMes = '5', totalEnvios = '23',
    // modo
    enviar = false,
  } = req.body || {};

  if (!tipo) return res.status(400).json({ error: 'tipo obrigatório' });
  if (!MENSAGENS[tipo]) return res.status(400).json({ error: `Tipo desconhecido: ${tipo}` });

  const config = await getConfig();
  const baseUrl = config.app_base_url || 'https://gollog-1.vercel.app';
  const nomeFirst = nome.split(' ')[0];

  const params = {
    nome: nomeFirst, origem, destino, valor, servico,
    codigo, status, rastId,
    endereco, horario, volumes,
    enviosMes, totalEnvios,
    baseUrl,
  };

  const mensagem = MENSAGENS[tipo](params);

  let enviado = false;
  let erro = null;

  if (enviar && phone) {
    const ok = await sendWhatsApp(phone, mensagem, config);
    enviado = ok;
    if (!ok) erro = 'Falha ao enviar — verifique o webhook de notificações nas configurações.';
  }

  // Teste de email pós-entrega
  if (tipo === 'rastreio_entregue' && enviar && req.body.email) {
    const html = emailTemplate(
      '✅ Sua encomenda foi entregue!',
      `<p>Olá, <strong>${nome}</strong>!</p>
       <p>Sua encomenda com código <strong>${codigo}</strong> foi entregue com sucesso.</p>
       <p>Status: <strong>${status || 'Entregue'}</strong></p>
       <p>Ficamos felizes em ter participado desta entrega. Sua opinião é muito importante para nós!</p>`,
      `${baseUrl}/avaliar/${rastId}`,
      '⭐ Avaliar o serviço'
    );
    await sendEmail(req.body.email, `✅ Encomenda ${codigo} entregue!`, html, config);
  }

  return res.status(200).json({
    success: true,
    tipo,
    mensagem,
    enviado,
    erro,
    link_avaliacao: tipo === 'rastreio_entregue' ? `${baseUrl}/avaliar/${rastId}` : null,
  });
}
