import { supabase, getConfig, sendWhatsApp } from '../_lib/notify.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { rastreamento_id, nota, comentario } = req.body;

    if (!rastreamento_id || !nota || nota < 1 || nota > 5) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const config = await getConfig();

    // Busca rastreamento e cliente
    const { data: rast } = await supabase
      .from('rastreamentos')
      .select('*, clientes(id, nome_razao_social, telefone)')
      .eq('id', rastreamento_id)
      .single();

    if (!rast) {
      return res.status(404).json({ error: 'Rastreamento não encontrado' });
    }

    const clienteId = rast.clientes?.id || rast.cliente_id;
    const phone = rast.clientes?.telefone;
    const nome = rast.clientes?.nome_razao_social?.split(' ')[0] || 'Cliente';

    // Salva avaliação
    const { data: avaliacao } = await supabase.from('avaliacoes').insert([{
      cliente_id: clienteId,
      rastreamento_id,
      codigo_rastreio: rast.codigo_rastreio,
      nota: parseInt(nota),
      comentario: comentario || null,
      ticket_criado: false,
      google_link_enviado: false,
    }]).select().single();

    // Log atividade
    if (clienteId) {
      await supabase.from('atividades_log').insert([{
        cliente_id: clienteId,
        tipo: 'avaliacao',
        descricao: `Avaliação ${nota}/5 para rastreio ${rast.codigo_rastreio}${comentario ? ': ' + comentario.slice(0, 80) : ''}`,
        canal: 'sistema',
      }]);
    }

    let googleLink = null;

    // Nota 1-3: abre ticket de suporte automaticamente
    if (nota <= 3) {
      await supabase.from('suporte_tickets').insert([{
        cliente_id: clienteId,
        assunto: `Avaliação negativa (${nota}/5) — ${rast.codigo_rastreio}`,
        descricao: comentario || `Cliente avaliou o serviço com nota ${nota}/5.`,
        status: 'aberto',
        prioridade: nota === 1 ? 'alta' : 'media',
        mensagens: [{
          autor: 'Sistema',
          mensagem: `Avaliação automática: nota ${nota}/5. ${comentario || ''}`,
          data: new Date().toISOString(),
        }],
      }]);

      await supabase.from('avaliacoes').update({ ticket_criado: true }).eq('id', avaliacao?.id);

      // Notifica time internamente via WhatsApp (se houver número interno configurado)
      const phoneInterno = config.numero_interno_suporte;
      if (phoneInterno) {
        await sendWhatsApp(phoneInterno,
          `⚠️ *Avaliação negativa recebida!*\n\nCliente: ${nome}\nRastreio: ${rast.codigo_rastreio}\nNota: ${nota}/5\n${comentario ? 'Comentário: ' + comentario : ''}\n\nTicket criado automaticamente.`,
          config
        );
      }

      return res.status(200).json({
        success: true,
        tipo: 'negativa',
        message: 'Avaliação registrada. Nossa equipe entrará em contato em breve.',
      });
    }

    // Nota 4: agradecimento simples
    if (nota === 4) {
      return res.status(200).json({
        success: true,
        tipo: 'boa',
        message: 'Obrigado pela sua avaliação! Fico feliz que tenha tido uma boa experiência.',
      });
    }

    // Nota 5: retorna link Google Review
    if (nota === 5) {
      googleLink = config.google_review_link || null;
      if (googleLink && avaliacao?.id) {
        await supabase.from('avaliacoes').update({ google_link_enviado: true }).eq('id', avaliacao.id);
      }

      return res.status(200).json({
        success: true,
        tipo: 'excelente',
        googleLink,
        message: 'Incrível! Você nos deu nota máxima! 🎉',
      });
    }

  } catch (error) {
    console.error('Avaliação error:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
