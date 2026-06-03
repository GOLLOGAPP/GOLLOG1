import { createClient } from '@supabase/supabase-js';

const APP_URL = process.env.APP_URL || 'https://www.logprofit.com.br';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://bkljbfqvlepmmwwylfdv.supabase.co',
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbGpiZnF2bGVwbW13d3lsZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTIzMjksImV4cCI6MjA5NDE4ODMyOX0.H9AI_tTC00T_Oidd9gKkwyNi08xLjSq9sqqo50TItsU'
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

    // Busca webhook de notificações uma vez para todos os casos
    const { data: configNotif } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'botconversa_webhook_notificacoes')
      .single();
    const webhookNotif = configNotif?.valor;

    const notificar = (mensagem) => {
      if (!webhookNotif || !phone) return;
      fetch(webhookNotif, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, nome: name || '', mensagem }),
      }).catch(() => {});
    };

    switch (action) {
      // ─── RASTREAMENTO: cliente envia texto livre pelo WhatsApp ───
      case 'rastrear': {
        // Extrai todos os códigos de 11 dígitos começando com 127 do texto livre
        const textoLivre = data?.codigo || data?.texto || data?.message || '';
        const codigos = [...new Set(
          (textoLivre.match(/\b127\d{8}\b/g) || []).map(c => c.toUpperCase())
        )];

        // Buscar cliente pelo telefone (uma vez só)
        let clienteId = null;
        if (phone) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('id')
            .eq('telefone', phone)
            .single();
          if (cliente) clienteId = cliente.id;
        }

        // Nenhum código encontrado → encaminhar para atendimento humano
        if (codigos.length === 0) {
          const msgHumano = `⚠️ Não consegui identificar um número de rastreio na sua mensagem.\n\nOs códigos GOLLOG têm 11 dígitos e começam com *127* (ex: 12712345678).\n\nAguarde — vou transferir você para um atendente! 👨‍💼`;
          notificar(msgHumano);

          // Notifica equipe interna
          const { data: configSuporte } = await supabase
            .from('configuracoes')
            .select('valor')
            .eq('chave', 'numero_interno_suporte')
            .single();
          const numeroSuporte = configSuporte?.valor;
          if (webhookNotif && numeroSuporte) {
            fetch(webhookNotif, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: numeroSuporte,
                mensagem: `🔔 *Atendimento solicitado*\n\nCliente: ${name || phone}\nMensagem: "${textoLivre.slice(0, 200)}"\n\nNenhum código de rastreio identificado. Cliente aguarda atendimento.`,
              }),
            }).catch(() => {});
          }

          return res.status(200).json({
            success: true,
            rastreios_encontrados: 0,
            message: msgHumano,
            precisa_humano: 'sim',
            custom_fields: { precisa_humano: 'sim', resposta_rastreio: msgHumano },
          });
        }

        // Consulta e notifica cada código separadamente
        const resultados = [];
        for (const codigo of codigos) {
          let statusAtual = 'Consultando...';
          let historico = [];
          let mensagemRastreio = '';

          try {
            const gollogRes = await fetch('https://api-golcargo.gollog.com.br/api/sales/transportorder/tracking', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'CompanyKey': process.env.GOLLOG_COMPANY_KEY || 'G3',
                'language': 'pt-BR',
              },
              body: JSON.stringify({ type: 'documentnumber', value: codigo }),
            });

            if (gollogRes.ok) {
              const gollogData = await gollogRes.json();
              const detail = gollogData.detail?.awbInfo || {};
              const events = gollogData.events || [];

              statusAtual = detail.operationalStatusDescription || events[events.length - 1]?.status?.codeDescription || 'Em processamento';
              historico = events.map(e => ({
                status: e.status?.codeDescription,
                data: e.eventDateTimeLT,
                local: `${e.station} - ${e.status?.stationName || ''}`,
                code: e.status?.code,
              }));

              const origem = detail.routing?.origin?.station || '?';
              const destino = detail.routing?.destination?.station || '?';
              const previsao = detail.expectedDeliveryDate
                ? new Date(detail.expectedDeliveryDate).toLocaleDateString('pt-BR')
                : 'N/A';

              const ultimos = events.slice(-3).reverse().map(e =>
                `  📌 ${e.status?.codeDescription}\n     📍 ${e.station} · ${e.eventDateTimeLT}`
              ).join('\n\n');

              mensagemRastreio = `📦 *Rastreio ${codigo}*\n\n` +
                `🔄 Status: *${statusAtual}*\n` +
                `✈️ Rota: ${origem} → ${destino}\n` +
                `📅 Previsão: ${previsao}\n` +
                `📦 ${detail.totals?.pieces || 1} vol(s) · ${detail.totals?.weight || '?'} kg\n\n` +
                `📋 *Últimos eventos:*\n\n${ultimos}\n\n` +
                `🔗 Rastreio completo:\n${APP_URL}/rastreamento?doc=${codigo}`;
            } else {
              statusAtual = 'Não encontrado';
              mensagemRastreio = `📦 *Rastreio ${codigo}*\n\n❌ Documento não encontrado.\nVerifique o número e tente novamente.`;
            }
          } catch (_) {
            statusAtual = 'Erro na consulta';
            mensagemRastreio = `📦 *Rastreio ${codigo}*\n\n⚠️ Erro temporário ao consultar. Tente novamente em instantes.`;
          }

          // Salvar rastreamento no Supabase
          await supabase.from('rastreamentos').insert([{
            cliente_id: clienteId,
            codigo_rastreio: codigo,
            status_atual: statusAtual,
            historico_status: historico,
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

          // Envia mensagem separada para cada código
          notificar(mensagemRastreio);
          resultados.push({ codigo, status: statusAtual, message: mensagemRastreio });
        }

        return res.status(200).json({
          success: true,
          rastreios_encontrados: codigos.length,
          message: resultados[0]?.message || '',
          precisa_humano: 'nao',
          resultados,
          custom_fields: {
            precisa_humano: 'nao',
            resposta_rastreio: resultados[0]?.message || '',
          },
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

        const msgCotacao = `💰 *Cotação GOLLOG*\n\n📍 Origem: ${cidadeOrigem || cepOrigem}\n📍 Destino: ${cidadeDestino || cepDestino}\n📦 Peso: ${pesoKg}kg\n🚀 Serviço: GOLLOG ${tipoServico}\n\n💲 *Valor Estimado: R$ ${valorEstimado}*\n⏱ Prazo: ${prazo}\n\n_* Valores sujeitos à confirmação na unidade._`;

        notificar(msgCotacao);

        return res.status(200).json({
          success: true,
          valor: valorEstimado,
          prazo,
          servico: tipoServico,
          message: msgCotacao,
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

        const msgColeta = `🚚 *Coleta Solicitada!*\n\n📍 Endereço: ${data?.endereco || 'A confirmar'}\n📅 Data: ${data?.data || 'A confirmar'}\n⏰ Horário: ${data?.horario || 'A confirmar'}\n📦 Volumes: ${data?.volumes || 1}\n\n✅ Nossa equipe entrará em contato para confirmar o agendamento.`;

        notificar(msgColeta);

        return res.status(200).json({
          success: true,
          message: msgColeta,
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

      // ─── SELEÇÃO DE BASE: cliente escolhe unidade no bot ───
      case 'selecao_base': {
        const base = data?.base;
        if (!base || !['Osasco', 'Barueri'].includes(base)) {
          return res.status(400).json({ error: 'Base inválida. Use: Osasco ou Barueri' });
        }
        const codigoBase = base === 'Osasco' ? 'QOZ' : 'QBX';

        let clienteId = null;
        if (phone) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('id')
            .eq('telefone', phone)
            .single();
          if (cliente) {
            clienteId = cliente.id;
            await supabase.from('clientes')
              .update({ unidade_atendimento: base, ultimo_contato: new Date().toISOString() })
              .eq('id', cliente.id);
          }
        }

        const { error: insertError } = await supabase.from('acessos_base').insert([{
          telefone: phone,
          nome: name,
          cliente_id: clienteId,
          base,
          codigo_base: codigoBase,
        }]);
        if (insertError) {
          console.error('acessos_base insert error:', insertError.message);
          return res.status(500).json({ error: 'Falha ao registrar acesso', details: insertError.message });
        }

        if (clienteId) {
          await supabase.from('atividades_log').insert([{
            cliente_id: clienteId,
            tipo: 'contato',
            descricao: `Selecionou base: GOLLOG ${base} (${codigoBase})`,
            canal: 'whatsapp',
          }]);
        }

        return res.status(200).json({ success: true, base, codigo: codigoBase });
      }

      default:
        return res.status(400).json({ error: `Ação desconhecida: ${action}` });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
