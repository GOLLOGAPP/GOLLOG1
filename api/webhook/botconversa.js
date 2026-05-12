import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://bkljbfqvlepmmwwylfdv.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// Webhook handler: receives events from BotConversa
// Expected payload: { action, phone, name, data }
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, phone, name, data } = req.body;

    switch (action) {
      // ─── RASTREAMENTO: cliente envia código pelo WhatsApp ───
      case 'rastrear': {
        const codigo = data?.codigo?.trim().toUpperCase();
        if (!codigo) return res.status(400).json({ error: 'Código de rastreio não informado' });

        // Buscar cliente pelo telefone
        let clienteId = null;
        if (phone) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('id')
            .eq('telefone', phone)
            .single();
          if (cliente) clienteId = cliente.id;
        }

        // TODO: Integrar com API Gollog real
        // Por enquanto, mock do status
        const mockStatuses = ['Postado', 'Em trânsito', 'No centro de distribuição', 'Saiu para entrega', 'Entregue'];
        const statusAtual = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];

        // Salvar rastreamento
        await supabase.from('rastreamentos').insert([{
          cliente_id: clienteId,
          codigo_rastreio: codigo,
          status_atual: statusAtual,
          historico_status: [
            { status: statusAtual, data: new Date().toISOString(), local: 'Consulta via WhatsApp' }
          ],
        }]);

        // Log atividade
        if (clienteId) {
          await supabase.from('atividades_log').insert([{
            cliente_id: clienteId,
            tipo: 'rastreamento',
            descricao: `Rastreio ${codigo}: ${statusAtual}`,
            canal: 'whatsapp',
          }]);
        }

        return res.status(200).json({
          success: true,
          codigo,
          status: statusAtual,
          message: `📦 Rastreio ${codigo}\n\n📍 Status: ${statusAtual}\n\n🕐 Atualizado em: ${new Date().toLocaleString('pt-BR')}`
        });
      }

      // ─── CADASTRO COMPLETO: notificação após cadastro ───
      case 'cadastro_completo': {
        if (phone) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('id, nome_razao_social')
            .eq('telefone', phone)
            .single();

          if (cliente) {
            await supabase.from('clientes')
              .update({ ultimo_contato: new Date().toISOString() })
              .eq('id', cliente.id);
          }
        }
        return res.status(200).json({ success: true, message: 'Cadastro processado' });
      }

      // ─── SUPORTE: cliente abre ticket ───
      case 'suporte': {
        let clienteId = null;
        if (phone) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('id')
            .eq('telefone', phone)
            .single();
          if (cliente) clienteId = cliente.id;
        }

        const { data: ticket, error } = await supabase.from('suporte_tickets').insert([{
          cliente_id: clienteId,
          assunto: data?.assunto || 'Contato via WhatsApp',
          descricao: data?.descricao || '',
          status: 'aberto',
          prioridade: 'media',
          unidade: data?.unidade || 'Osasco',
          mensagens: [{
            autor: name || phone || 'Cliente',
            mensagem: data?.descricao || 'Solicitação de suporte via WhatsApp',
            data: new Date().toISOString(),
          }],
        }]).select();

        if (clienteId) {
          await supabase.from('atividades_log').insert([{
            cliente_id: clienteId,
            tipo: 'suporte',
            descricao: `Ticket aberto: ${data?.assunto || 'Contato via WhatsApp'}`,
            canal: 'whatsapp',
          }]);
        }

        return res.status(200).json({
          success: true,
          ticketId: ticket?.[0]?.id,
          message: '✅ Ticket de suporte criado! Um atendente entrará em contato em breve.'
        });
      }

      // ─── CONTATO: registra interação ───
      case 'contato': {
        if (phone) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('id')
            .eq('telefone', phone)
            .single();

          if (cliente) {
            await supabase.from('clientes')
              .update({ ultimo_contato: new Date().toISOString() })
              .eq('id', cliente.id);

            await supabase.from('atividades_log').insert([{
              cliente_id: cliente.id,
              tipo: 'contato',
              descricao: data?.descricao || `Contato via WhatsApp: ${name || phone}`,
              canal: 'whatsapp',
              metadata: { phone, name, ...data },
            }]);
          }
        }
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: `Ação desconhecida: ${action}` });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
