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

      // ─── COTAÇÃO: coleta dados pelo WhatsApp e retorna valor ───
      case 'cotacao': {
        let clienteId = null;
        if (phone) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('id, nome_razao_social')
            .eq('telefone', phone)
            .single();
          if (cliente) clienteId = cliente.id;
        }

        const cepOrigem = data?.cep_origem || '';
        const cepDestino = data?.cep_destino || '';
        const pesoKg = parseFloat(data?.peso_kg) || 1;
        const alturaCm = parseFloat(data?.altura_cm) || 10;
        const larguraCm = parseFloat(data?.largura_cm) || 10;
        const comprimentoCm = parseFloat(data?.comprimento_cm) || 10;
        const tipoServico = data?.tipo_servico || 'Rápido';
        const unidade = data?.unidade || 'Osasco';
        const cidadeOrigem = data?.cidade_origem || cepOrigem;
        const cidadeDestino = data?.cidade_destino || cepDestino;

        // Cálculo de cubagem e preço estimado
        const cubagem = (alturaCm * larguraCm * comprimentoCm) / 6000;
        const pesoFinal = Math.max(pesoKg, cubagem);
        const basePrice = tipoServico === 'Rápido' ? 15 : tipoServico === 'Urgente' ? 25 : 8;
        const valorEstimado = (pesoFinal * basePrice + 18).toFixed(2);

        const prazoMap = { 'Rápido': '1-2 dias úteis', 'Urgente': '1 dia útil', 'Econômico': '3-7 dias úteis' };
        const prazo = prazoMap[tipoServico] || '3-5 dias úteis';

        // Salvar cotação no Supabase
        const { data: cotacao } = await supabase.from('cotacoes').insert([{
          cliente_id: clienteId,
          cep_origem: cepOrigem,
          cep_destino: cepDestino,
          cidade_origem: cidadeOrigem,
          cidade_destino: cidadeDestino,
          peso_kg: pesoKg,
          altura_cm: alturaCm,
          largura_cm: larguraCm,
          comprimento_cm: comprimentoCm,
          tipo_servico: tipoServico,
          valor_cotado: parseFloat(valorEstimado),
          status: 'enviada',
          unidade,
        }]).select();

        // Log atividade
        if (clienteId) {
          await supabase.from('atividades_log').insert([{
            cliente_id: clienteId,
            tipo: 'cotacao',
            descricao: `Cotação WhatsApp: ${cidadeOrigem} → ${cidadeDestino} | ${pesoKg}kg | R$ ${valorEstimado}`,
            canal: 'whatsapp',
          }]);
        }

        return res.status(200).json({
          success: true,
          valor: valorEstimado,
          prazo,
          servico: tipoServico,
          message: `💰 *Cotação GOLLOG*\n\n📍 Origem: ${cidadeOrigem || cepOrigem}\n📍 Destino: ${cidadeDestino || cepDestino}\n📦 Peso: ${pesoKg}kg\n🚀 Serviço: GOLLOG ${tipoServico}\n\n💲 *Valor Estimado: R$ ${valorEstimado}*\n⏱ Prazo: ${prazo}\n\n_* Valores sujeitos à confirmação na unidade._`
        });
      }

      // ─── COLETA: solicita coleta via WhatsApp ───
      case 'coleta': {
        let clienteId = null;
        if (phone) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('id')
            .eq('telefone', phone)
            .single();
          if (cliente) clienteId = cliente.id;
        }

        const { data: coleta } = await supabase.from('coletas').insert([{
          cliente_id: clienteId,
          endereco_coleta: data?.endereco || '',
          cep_coleta: data?.cep || '',
          data_solicitada: data?.data || null,
          horario_preferido: data?.horario || '',
          quantidade_volumes: parseInt(data?.volumes) || 1,
          peso_total_kg: parseFloat(data?.peso) || null,
          observacoes: data?.observacoes || '',
          status: 'solicitada',
          unidade: data?.unidade || 'Osasco',
        }]).select();

        if (clienteId) {
          await supabase.from('atividades_log').insert([{
            cliente_id: clienteId,
            tipo: 'coleta',
            descricao: `Coleta solicitada via WhatsApp: ${data?.endereco || 'Endereço a confirmar'}`,
            canal: 'whatsapp',
          }]);
        }

        return res.status(200).json({
          success: true,
          message: `🚚 *Coleta Solicitada!*\n\n📍 Endereço: ${data?.endereco || 'A confirmar'}\n📅 Data: ${data?.data || 'A confirmar'}\n⏰ Horário: ${data?.horario || 'A confirmar'}\n📦 Volumes: ${data?.volumes || 1}\n\n✅ Nossa equipe entrará em contato para confirmar o agendamento.`
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
