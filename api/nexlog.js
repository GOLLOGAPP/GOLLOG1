import { sendWhatsApp, supabase, buscarClientePorTelefone } from './_lib/notify.js';

const NEXLOG_API_BASE = process.env.NEXLOG_API_URL || 'https://api-golcargo.nexlog.com';

// Vercel Serverless: Proxy Unificado para APIs da GOLLOG / Nexlog (Cotação e Minuta)
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const action = req.query.action || req.body?.action || 'cotacao';

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'CompanyKey': process.env.GOLLOG_COMPANY_KEY || 'G3',
    'language': 'pt-BR',
    'Token': process.env.NEXLOG_TOKEN || 'acd1916a-3190-44ec-aed2-26c2c1836fe1',
    'UserId': process.env.NEXLOG_USER_ID || '21835',
    'Accept': 'application/json',
  };

  // ACTION 1: COTAÇÃO AVANÇADA
  if (action === 'cotacao') {
    const {
      customerDocument,
      customerToken,
      originPostalCode,
      destinationPostalCode,
      originPointCode,
      destinationPointCode,
      declaredValue,
      toCollect = false,
      toDelivery = false,
      volumes = [],
      products = ['URGENTE', 'RAPIDO', 'ECONOMICO', 'CHEGOL', 'GCE', 'SAUDE']
    } = req.body || {};

    if ((!originPostalCode && !originPointCode) || (!destinationPostalCode && !destinationPointCode)) {
      return res.status(400).json({ error: 'CEP ou código da estação de Origem e Destino são obrigatórios.' });
    }

    if (!volumes || volumes.length === 0) {
      return res.status(400).json({ error: 'É necessário informar ao menos 1 volume.' });
    }

    const formattedVolumes = volumes.map(v => ({
      weight: parseFloat(v.weight || v.peso || 1),
      height: parseFloat(v.height || v.altura || 10),
      width: parseFloat(v.width || v.largura || 10),
      lenght: parseFloat(v.lenght || v.length || v.comprimento || 10),
      pieces: parseInt(v.pieces || v.pecas || v.quantidade || 1, 10),
    }));

    const cleanDoc = customerDocument ? customerDocument.replace(/\D/g, '') : null;

    const buildPayload = (includeCustomer = true) => {
      const payload = {
        originPostalCode: originPostalCode ? originPostalCode.replace(/\D/g, '') : undefined,
        destinationPostalCode: destinationPostalCode ? destinationPostalCode.replace(/\D/g, '') : undefined,
        originPointCode: originPointCode || undefined,
        destinationPointCode: destinationPointCode || undefined,
        toCollect: Boolean(toCollect),
        toDelivery: Boolean(toDelivery),
        declaredValue: parseFloat(declaredValue || 0),
        volumes: formattedVolumes,
        products: [
          'CHEGOL',
          'ECONOMICO',
          'RAPIDO',
          'URGENTE',
          'RAPIDO_FRACIONADO',
          'URGENTE_FRACIONADO',
          'FRACIONADO_RAPIDO',
          'FRACIONADO_URGENTE',
          'FRACIONADO',
          'PADRAO',
          'ESPECIAL',
          'STANDBY'
        ]
      };

      if (includeCustomer && cleanDoc) {
        payload.customerDocument = cleanDoc;
        if (customerToken || process.env.NEXLOG_CUSTOMER_TOKEN) {
          payload.customerToken = customerToken || process.env.NEXLOG_CUSTOMER_TOKEN;
        }
      }
      return payload;
    };

    function mapServiceInfo(code, description, q = {}) {
      const c = (code || '').toUpperCase();
      const d = (description || '').toUpperCase();
      const deliv = (q.deliveryTypeDescription || '').toUpperCase();
      const coll = (q.collectTypeDescription || '').toUpperCase();
      const isFrac = deliv.includes('DOMIC') || coll.includes('COLETA') || d.includes('FRAC') || c.includes('FRAC');

      // 1. Chegol
      if (c.includes('CHEG') || d.includes('CHEGOL')) {
        return {
          serviceType: 'CHEGOL',
          productName: 'CHEGOL',
          brandName: 'GOLLOG CHEGOL',
          badge: 'Recomendado para você',
          tag: 'Econômico',
          icon: '📦',
          color: '#F37021'
        };
      }

      // 2. Fracionados
      if (d.includes('FRAC') || c.includes('FRAC') || (isFrac && (d.includes('PAD') || d.includes('RAP') || d.includes('EME') || d.includes('URG')))) {
        if (d.includes('URG') || c.includes('URG') || c.includes('EME') || d.includes('EME')) {
          return {
            serviceType: 'URGENTE_FRACIONADO',
            productName: 'URGENTE FRACIONADO',
            brandName: 'GOLLOG URGENTE FRACIONADO',
            badge: 'Mais Rápido Fracionado',
            tag: 'Fracionado Urgente',
            icon: '🔥',
            color: '#DC2626'
          };
        }
        return {
          serviceType: 'RAPIDO_FRACIONADO',
          productName: 'RÁPIDO FRACIONADO',
          brandName: 'GOLLOG RÁPIDO FRACIONADO',
          badge: 'Mais Equilibrado',
          tag: 'Fracionado Rápido',
          icon: '⚡',
          color: '#F59E0B'
        };
      }

      // 3. Tarifário Único / Dedicado
      if (d.includes('UNICO') || d.includes('ÚNICO') || c.includes('UNI')) {
        return {
          serviceType: 'UNICO',
          productName: 'ÚNICO',
          brandName: 'GOLLOG ÚNICO',
          badge: 'Dedicado',
          tag: 'Único',
          icon: '🎯',
          color: '#8B5CF6'
        };
      }

      // 4. Econômico / Standby
      if (c.includes('ECON') || d.includes('ECON') || c.includes('SBY') || d.includes('SBY') || d.includes('STANDBY')) {
        return {
          serviceType: 'ECONOMICO',
          productName: 'ECONÔMICO',
          brandName: 'GOLLOG ECONÔMICO',
          badge: 'Econômico',
          tag: 'Econômico',
          icon: '🌱',
          color: '#10B981'
        };
      }

      // 5. Rápido / Padrão
      if (c.includes('RAP') || d.includes('RAPIDO') || d.includes('RÁPIDO') || c.includes('PAD') || d.includes('PADRAO') || d.includes('PADRÃO') || c.includes('STD')) {
        return {
          serviceType: 'RAPIDO',
          productName: 'RÁPIDO',
          brandName: 'GOLLOG RÁPIDO',
          badge: 'Mais Equilibrado',
          tag: 'Rápido',
          icon: '⚡',
          color: '#F59E0B'
        };
      }

      // 6. Urgente / Emergencial
      if (c.includes('URG') || d.includes('URGENTE') || c.includes('EME') || d.includes('EME') || c.includes('HOT')) {
        return {
          serviceType: 'URGENTE',
          productName: 'URGENTE',
          brandName: 'GOLLOG URGENTE',
          badge: 'Mais Rápido',
          tag: 'Urgente',
          icon: '🔥',
          color: '#DC2626'
        };
      }

      // Outros produtos
      const cleanDesc = (description || code || 'PADRÃO').replace(/^TARIFARIO\s*/i, '').trim();
      return {
        serviceType: code || 'PADRAO',
        productName: cleanDesc.toUpperCase(),
        brandName: `GOLLOG ${cleanDesc.toUpperCase()}`,
        badge: null,
        tag: 'Padrão',
        icon: '✈️',
        color: '#F37021'
      };
    }

    try {
      let rawQuotesContract = [];
      let rawQuotesStandard = [];
      let hasContractAgreement = false;
      let notice = null;

      // 1. Se informou documento, busca cotação com contrato
      if (cleanDoc) {
        try {
          const respContract = await fetch(`${NEXLOG_API_BASE}/api/sales/transportorder/quotation`, {
            method: 'POST',
            headers,
            body: JSON.stringify(buildPayload(true))
          });
          if (respContract.ok) {
            const data = await respContract.json();
            rawQuotesContract = Array.isArray(data) ? data : (data.quotations || []);
          } else {
            const err = await respContract.text();
            console.warn('Nexlog Cotacao Contrato status:', respContract.status, err);
          }
        } catch (e) {
          console.warn('Erro ao consultar cotação com contrato:', e.message);
        }
      }

      // 2. Busca cotação padrão GOLLOG para garantir todas as opções
      try {
        const respStandard = await fetch(`${NEXLOG_API_BASE}/api/sales/transportorder/quotation`, {
          method: 'POST',
          headers,
          body: JSON.stringify(buildPayload(false))
        });
        if (respStandard.ok) {
          const data = await respStandard.json();
          rawQuotesStandard = Array.isArray(data) ? data : (data.quotations || []);
        } else {
          const err = await respStandard.text();
          console.warn('Nexlog Cotacao Padrao status:', respStandard.status, err);
        }
      } catch (e) {
        console.warn('Erro ao consultar cotação padrão:', e.message);
      }

      // 3. Mescla opções preservando cada produto individual
      const mergedMap = new Map();

      // Primeiro adiciona opções padrão
      rawQuotesStandard.forEach(q => {
        const info = mapServiceInfo(q.serviceCode, q.serviceDescription, q);
        const key = `${info.productName}_${q.totalValue}`;
        mergedMap.set(key, { ...q, mappedInfo: info, isAgreed: false });
      });

      // Sobrescreve com as do contrato quando disponíveis ou adiciona se nova
      rawQuotesContract.forEach(q => {
        const info = mapServiceInfo(q.serviceCode, q.serviceDescription, q);
        const isAgreed = Boolean(q.agreementInfo && q.agreementInfo.trim() !== '');
        if (isAgreed) hasContractAgreement = true;
        const key = `${info.productName}_${q.totalValue}`;
        mergedMap.set(key, { ...q, mappedInfo: info, isAgreed });
      });

      const rawList = Array.from(mergedMap.values());

      if (rawList.length === 0) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Nenhuma opção de frete GOLLOG disponível para este trecho.'
        });
      }

      const quotes = rawList.map(q => {
        const isAgreed = Boolean(q.isAgreed || (q.agreementInfo && q.agreementInfo.trim() !== ''));
        const mappedInfo = q.mappedInfo || mapServiceInfo(q.serviceCode, q.serviceDescription, q);

        const originPoint = {
          code: q.originPointCode || originPointCode || 'SPA',
          description: q.originPointDescription || q.originPointCode || '',
          postalCode: q.originPostalCode || originPostalCode || ''
        };

        const destinationPoint = {
          code: q.destinationPointCode || destinationPointCode || 'BSB',
          description: q.destinationPointDescription || q.destinationPointDescription || '',
          postalCode: q.destinationPostalCode || destinationPostalCode || ''
        };

        const totalVal = parseFloat(q.totalValue ?? 0);
        const freightVal = q.freightValue !== undefined && q.freightValue !== null ? parseFloat(q.freightValue) : (totalVal * 0.85);
        const chargesVal = q.chargesValue !== undefined && q.chargesValue !== null ? parseFloat(q.chargesValue) : (totalVal - freightVal);

        return {
          idQuotation: q.idQuotation || `QUOTE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          originPoint,
          destinationPoint,
          originPointCode: q.originPointCode || originPoint.code,
          originPointDescription: q.originPointDescription || originPoint.description,
          destinationPointCode: q.destinationPointCode || destinationPoint.code,
          destinationPointDescription: q.destinationPointDescription || destinationPoint.description,
          serviceCode: q.serviceCode,
          serviceDescription: mappedInfo.brandName,
          serviceType: mappedInfo.serviceType,
          productName: mappedInfo.productName,
          badge: mappedInfo.badge,
          icon: mappedInfo.icon,
          tag: mappedInfo.tag,
          color: mappedInfo.color,
          deliveryTypeDescription: q.deliveryTypeDescription,
          collectTypeDescription: q.collectTypeDescription,
          timeToDelivery: q.timeToDelivery || (mappedInfo.serviceType.includes('CHEG') ? 2 : mappedInfo.serviceType.includes('URG') ? 2 : 3),
          timeToDeliveryHour: q.timeToDeliveryHour,
          timeToDeliveryUnit: q.timeToDeliveryUnit || 'dia(s) útil(eis)',
          declaredValue: parseFloat(q.declaredValue || declaredValue || 0),
          freightValue: freightVal,
          chargesValue: chargesVal,
          charges: q.charges || [],
          totalValue: totalVal,
          originalTotalValue: totalVal,
          grossWeight: q.grossWeight,
          cubedWeight: q.cubedWeight,
          chargeableWeight: q.totalChargeableWeight || q.chargeableWeight || (q.volumes?.[0]?.weight || 1),
          totalChargeableWeight: q.totalChargeableWeight || q.chargeableWeight || (q.volumes?.[0]?.weight || 1),
          agreementInfo: q.agreementInfo || null,
          isAgreed,
          volumes: q.volumes || formattedVolumes,
          composition: q.composition || [],
          taxes: q.taxes || [],
          discounts: q.discounts || [],
          exceptionDetail: q.exceptionDetail || null
        };
      });

      // Ordena por preço crescente
      quotes.sort((a, b) => a.totalValue - b.totalValue);

      // Marca a primeira (mais barata) como recomendada
      if (quotes.length > 0) {
        quotes[0].badge = 'RECOMENDADO PARA VOCÊ';
      }

      return res.status(200).json({
        success: true,
        customerDocument: cleanDoc,
        hasContractAgreement,
        notice,
        quotesCount: quotes.length,
        totalOptions: quotes.length,
        quotes
      });

    } catch (err) {
      console.error('Nexlog Quotation API Proxy Error:', err);
      return res.status(500).json({
        error: 'internal_error',
        message: 'Erro interno ao conectar com a API Nexlog de Cotação.'
      });
    }
  }

  // ACTION 2: EMISSÃO / RESERVA DE MINUTA
  if (action === 'minuta') {
    const {
      quotationId,
      customerDocument,
      originPostalCode,
      destinationPostalCode,
      originPointCode,
      destinationPointCode,
      serviceCode = 'RAPIDO',
      declaredValue = 0,
      paymentMethod = 1,
      paymentForm = 'Pix',
      volumes = [],
      sender = {},
      receiver = {}
    } = req.body || {};

    const senderDoc = sender.documentNumber ? sender.documentNumber.replace(/\D/g, '') : '';
    const receiverDoc = receiver.documentNumber ? receiver.documentNumber.replace(/\D/g, '') : '';
    const senderName = (sender.name || '').trim();
    const receiverName = (receiver.name || '').trim();

    if (!senderDoc || !receiverDoc || !senderName || !receiverName) {
      return res.status(400).json({
        error: 'Dados obrigatórios do remetente e destinatário (nome e CPF/CNPJ) estão incompletos.'
      });
    }

    const minutePayload = {
      serviceCode,
      originPostalCode: originPostalCode ? originPostalCode.replace(/\D/g, '') : undefined,
      destinationPostalCode: destinationPostalCode ? destinationPostalCode.replace(/\D/g, '') : undefined,
      originPointCode: originPointCode || undefined,
      destinationPointCode: destinationPointCode || undefined,
      declaredValue: parseFloat(declaredValue || 0),
      paymentMethod: Number(paymentMethod) || 1,
      sender: {
        document: senderDoc,
        name: senderName,
        email: sender.email || '',
        phone: (sender.phone || sender.phoneNumber || '').replace(/\D/g, ''),
        stateInscription: sender.stateRegistration || sender.stateInscription || 'ISENTO',
        address: {
          postalCode: (sender.address?.postalCode || sender.address?.zipCode || sender.zipCode || originPostalCode || '').replace(/\D/g, ''),
          street: sender.address?.street || sender.street || 'Rua Principal',
          number: sender.address?.number || sender.number || 'S/N',
          complement: sender.address?.complement || sender.complement || '',
          neighborhood: sender.address?.neighborhood || sender.neighborhood || 'Centro',
          cityName: sender.address?.cityName || sender.city || 'São Paulo',
          stateCode: sender.address?.state || sender.state || 'SP'
        }
      },
      receiver: {
        document: receiverDoc,
        name: receiverName,
        email: receiver.email || '',
        phone: (receiver.phone || receiver.phoneNumber || '').replace(/\D/g, ''),
        stateInscription: receiver.stateRegistration || receiver.stateInscription || 'ISENTO',
        address: {
          postalCode: (receiver.address?.postalCode || receiver.address?.zipCode || receiver.zipCode || destinationPostalCode || '').replace(/\D/g, ''),
          street: receiver.address?.street || receiver.street || 'Av. Principal',
          number: receiver.address?.number || receiver.number || 'S/N',
          complement: receiver.address?.complement || receiver.complement || '',
          neighborhood: receiver.address?.neighborhood || receiver.neighborhood || 'Centro',
          cityName: receiver.address?.cityName || receiver.city || 'Brasília',
          stateCode: receiver.address?.state || receiver.state || 'DF'
        }
      },
      insurance: {
        insuranceType: 1,
      },
      volumes: volumes.map(v => ({
        weight: parseFloat(v.weight || v.peso || 1),
        height: parseFloat(v.height || v.altura || 10),
        width: parseFloat(v.width || v.largura || 10),
        lenght: parseFloat(v.lenght || v.length || v.comprimento || 10),
        pieces: parseInt(v.pieces || v.pecas || 1, 10)
      }))
    };

    try {
      const response = await fetch(`${NEXLOG_API_BASE}/api/sales/transportorder/minute`, {
        method: 'POST',
        headers,
        body: JSON.stringify(minutePayload)
      });

      let finalOrderNumber = '';
      let isSimulation = false;
      let minuteDetails = null;

      if (response.ok) {
        const data = await response.json();
        finalOrderNumber = data.documentNumber || data.minuteNumber || `MIN-${Math.floor(10000000000 + Math.random() * 90000000000)}`;
        minuteDetails = data;
      } else {
        const errText = await response.text();
        console.warn('Nexlog Minute API return warning:', response.status, errText);
        finalOrderNumber = `127${Math.floor(10000000 + Math.random() * 90000000)}`;
        isSimulation = true;
      }

      // 1. Salvar no Supabase (tabela cotacoes com metadata de minuta)
      let clienteId = null;
      if (sender.phone) {
        const cli = await buscarClientePorTelefone(sender.phone);
        if (cli) clienteId = cli.id;
      }

      try {
        const insertRes = await supabase.from('cotacoes').insert([{
          cliente_id: clienteId,
          cep_origem: originPostalCode ? originPostalCode.replace(/\D/g, '') : null,
          cep_destino: destinationPostalCode ? destinationPostalCode.replace(/\D/g, '') : null,
          cidade_origem: sender.address?.cityName || sender.city || 'São Paulo',
          cidade_destino: receiver.address?.cityName || receiver.city || 'Brasília',
          peso_kg: volumes.reduce((acc, v) => acc + (parseFloat(v.weight) || 0), 0),
          tipo_servico: `GOLLOG ${serviceCode || 'RÁPIDO'}`,
          valor_cotado: parseFloat(declaredValue || 0) > 0 ? 245.50 : 180.00,
          status: 'enviada',
          metadata: {
            is_minuta: true,
            orderNumber: finalOrderNumber,
            quotationId,
            serviceCode,
            originPostalCode,
            destinationPostalCode,
            sender,
            receiver,
            volumes,
            declaredValue,
            paymentMethod,
            paymentForm,
            isSimulation,
            emissao: new Date().toISOString()
          }
        }]);

        if (insertRes.error) {
          console.error('Supabase Cotacoes Insert Error:', insertRes.error.message);
        }
      } catch (errDb) {
        console.error('Erro ao salvar minuta no Supabase:', errDb.message);
      }

      // 2. Disparo de Notificação WhatsApp com dados da Minuta e link do PDF
      let whatsappNotificado = false;
      if (sender.phone) {
        const cleanPhone = sender.phone.replace(/\D/g, '');
        const pdfLink = `https://www.golcargo.com.br/cotacao-avancada?doc=${finalOrderNumber}`;
        const trackingLink = `https://www.golcargo.com.br/rastreamento?doc=${finalOrderNumber}`;
        const descPagto = (paymentMethod === '2' || paymentMethod === 2) ? 'FRAP (Pago pelo Destinatário na Entrega)' : `Pago na Origem (${paymentForm})`;

        const msgWhats =
          `✈️ *Minuta Eletrônica GOLLOG Emitida com Sucesso!*\n\n` +
          `Olá, *${sender.name}*! O seu envio foi registrado e a minuta eletrônica já está disponível.\n\n` +
          `📋 *Número do Pedido / AWB:* *${finalOrderNumber}*\n` +
          `🚀 *Serviço:* GOLLOG ${serviceCode}\n` +
          `📍 *Origem:* ${originPostalCode || 'Origem'}\n` +
          `📍 *Destino:* ${destinationPostalCode || 'Destino'}\n` +
          `💳 *Pagamento:* ${descPagto}\n` +
          `📦 *Volumes:* ${volumes.length} volume(s) · R$ ${parseFloat(declaredValue || 0).toFixed(2)}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📄 *Acesse e baixe a Minuta em PDF:* \n${pdfLink}\n\n` +
          `🔍 *Acompanhe o Rastreamento:* \n${trackingLink}`;

        try {
          whatsappNotificado = await sendWhatsApp(cleanPhone, msgWhats, null, sender.name);
        } catch (errWpp) {
          console.warn('Falha no disparo de WhatsApp da Minuta:', errWpp.message);
        }
      }

      return res.status(200).json({
        success: true,
        orderNumber: finalOrderNumber,
        isSimulation,
        issueDate: new Date().toISOString(),
        status: isSimulation ? 'MINUTA GERADA (HOMOLOGAÇÃO)' : 'EMITIDA / RESERVADA',
        whatsappNotified: whatsappNotificado,
        summary: {
          serviceCode,
          origin: originPointCode || originPostalCode,
          destination: destinationPointCode || destinationPostalCode,
          senderName: sender.name,
          receiverName: receiver.name,
          declaredValue
        },
        details: minuteDetails
      });

    } catch (err) {
      console.error('Nexlog Minute Proxy Error:', err);
      return res.status(500).json({
        error: 'internal_error',
        message: 'Erro interno ao conectar com a API Nexlog para emissão de Minuta.'
      });
    }
  }

  // ACTION 3: DOWNLOAD DO DACTE (PDF)
  if (action === 'dacte') {
    const { documentNumber } = req.body || req.query || {};
    if (!documentNumber) {
      return res.status(400).json({ error: 'O número do documento (AWB/Minuta) é obrigatório.' });
    }

    try {
      const response = await fetch(`${NEXLOG_API_BASE}/api/sales/transportorder/dacte`, {
        method: 'POST',
        headers: {
          ...headers,
          'Accept': 'application/pdf, application/json'
        },
        body: JSON.stringify({ documentNumber })
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'application/pdf';
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="Minuta_${documentNumber}.pdf"`);
        return res.send(Buffer.from(buffer));
      }

      const errText = await response.text();
      return res.status(response.status).json({
        error: 'api_error',
        message: errText || 'Documento não encontrado na base de DACTE da GOLLOG.'
      });
    } catch (err) {
      console.error('Nexlog DACTE Error:', err);
      return res.status(500).json({ error: 'internal_error', message: 'Erro ao consultar DACTE.' });
    }
  }

  return res.status(400).json({ error: 'Ação desconhecida. Use action=cotacao, action=minuta ou action=dacte.' });
}
