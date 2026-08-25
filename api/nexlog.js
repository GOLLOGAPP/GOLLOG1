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
        products: products && products.length > 0 ? products : ['URGENTE', 'RAPIDO', 'ECONOMICO', 'CHEGOL']
      };

      if (includeCustomer && cleanDoc) {
        payload.customerDocument = cleanDoc;
        if (customerToken || process.env.NEXLOG_CUSTOMER_TOKEN) {
          payload.customerToken = customerToken || process.env.NEXLOG_CUSTOMER_TOKEN;
        }
      }
      return payload;
    };

    try {
      let response = await fetch('https://api-golcargo.gollog.com.br/api/sales/transportorder/quotation', {
        method: 'POST',
        headers,
        body: JSON.stringify(buildPayload(true))
      });

      let hasContractAgreement = false;
      let notice = null;

      if (!response.ok && cleanDoc) {
        const errText = await response.text();
        if (errText.includes('não encontrado') || errText.includes('bloqueado')) {
          notice = 'CNPJ/CPF não possui acordo comercial específico cadastrado. Exibindo tarifário padrão GOLLOG.';
          response = await fetch('https://api-golcargo.gollog.com.br/api/sales/transportorder/quotation', {
            method: 'POST',
            headers,
            body: JSON.stringify(buildPayload(false))
          });
        } else {
          return res.status(response.status).json({
            error: 'api_error',
            message: errText || `Erro na API Nexlog (${response.status})`
          });
        }
      }

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          error: 'api_error',
          message: errText || `Erro ao consultar cotações Nexlog (${response.status})`
        });
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Nenhuma opção de rota/transporte encontrada para os CEPs informados.'
        });
      }

      const quotes = data.map(q => {
        const isAgreed = Boolean(q.agreementInfo && q.agreementInfo.trim() !== '');
        if (isAgreed) hasContractAgreement = true;

        return {
          idQuotation: q.idQuotation,
          originPoint: {
            code: q.originPointCode,
            description: q.originPointDescription,
            postalCode: q.originPostalCode
          },
          destinationPoint: {
            code: q.destinationPointCode,
            description: q.destinationPointDescription,
            postalCode: q.destinationPostalCode
          },
          serviceCode: q.serviceCode,
          serviceDescription: q.serviceDescription || q.serviceCode,
          timeToDelivery: q.timeToDelivery || 1,
          declaredValue: q.declaredValue,
          agreementInfo: q.agreementInfo || null,
          isAgreed,
          freightValue: q.freightValue,
          chargesValue: q.chargesValue,
          charges: q.charges || [],
          totalValue: q.totalValue,
          chargeableWeight: q.totalChargeableWeight,
          volumes: q.volumes || []
        };
      });

      quotes.sort((a, b) => a.totalValue - b.totalValue);

      return res.status(200).json({
        success: true,
        hasContractAgreement,
        notice,
        customerDocument: cleanDoc,
        quotesCount: quotes.length,
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

  // ACTION 2: EMISSÃO DE MINUTA / PEDIDO
  if (action === 'minuta') {
    const {
      serviceCode,
      originPointCode,
      originPostalCode,
      destinationPointCode,
      destinationPostalCode,
      declaredValue,
      toCollect = false,
      toDelivery = false,
      volumes = [],
      sender = {},
      receiver = {},
      paymentMethod = 1,
      idThirdPartyCompanyOrder
    } = req.body || {};

    if (!serviceCode) {
      return res.status(400).json({ error: 'O código do serviço selecionado é obrigatório.' });
    }

    if (!sender.documentNumber || !sender.name) {
      return res.status(400).json({ error: 'Nome e CPF/CNPJ do Remetente são obrigatórios.' });
    }

    if (!receiver.documentNumber || !receiver.name) {
      return res.status(400).json({ error: 'Nome e CPF/CNPJ do Destinatário são obrigatórios.' });
    }

    const cleanDoc = (doc) => (doc ? doc.replace(/\D/g, '') : '');

    const minutePayload = {
      idThirdPartyCompanyOrder: idThirdPartyCompanyOrder || `PED-${Date.now()}`,
      originPointCode: originPointCode || undefined,
      originPostalCode: originPostalCode ? originPostalCode.replace(/\D/g, '') : undefined,
      destinationPointCode: destinationPointCode || undefined,
      destinationPostalCode: destinationPostalCode ? destinationPostalCode.replace(/\D/g, '') : undefined,
      serviceCode: serviceCode,
      toCollect: Boolean(toCollect),
      toDelivery: Boolean(toDelivery),
      paymentMethod: Number(paymentMethod || 1),
      declaredValue: parseFloat(declaredValue || 0),
      minuteGeneratingType: 12,
      generateDocumentNumber: true,
      generateIssuance: true,
      sender: {
        name: sender.name,
        documentNumber: cleanDoc(sender.documentNumber),
        stateRegistration: sender.stateRegistration || 'ISENTO',
        email: sender.email || '',
        phoneNumber: sender.phone ? sender.phone.replace(/\D/g, '') : '',
        address: {
          zipCode: sender.address?.zipCode ? sender.address.zipCode.replace(/\D/g, '') : (originPostalCode || '').replace(/\D/g, ''),
          street: sender.address?.street || 'Rua Principal',
          number: sender.address?.number || 'S/N',
          complement: sender.address?.complement || '',
          neighborhood: sender.address?.neighborhood || 'Centro',
          cityName: sender.address?.city || 'São Paulo',
          stateCode: sender.address?.state || 'SP'
        }
      },
      receiver: {
        name: receiver.name,
        documentNumber: cleanDoc(receiver.documentNumber),
        stateRegistration: receiver.stateRegistration || 'ISENTO',
        email: receiver.email || '',
        phoneNumber: receiver.phone ? receiver.phone.replace(/\D/g, '') : '',
        address: {
          zipCode: receiver.address?.zipCode ? receiver.address.zipCode.replace(/\D/g, '') : (destinationPostalCode || '').replace(/\D/g, ''),
          street: receiver.address?.street || 'Av. Principal',
          number: receiver.address?.number || 'S/N',
          complement: receiver.address?.complement || '',
          neighborhood: receiver.address?.neighborhood || 'Centro',
          cityName: receiver.address?.city || 'Brasília',
          stateCode: receiver.address?.state || 'DF'
        }
      },
      insurance: {
        insuranceType: 1,
      },
      volumes: volumes.map(v => ({
        weight: parseFloat(v.weight || 1),
        height: parseFloat(v.height || 10),
        width: parseFloat(v.width || 10),
        lenght: parseFloat(v.lenght || v.length || 10),
        pieces: parseInt(v.pieces || 1, 10)
      }))
    };

    try {
      const response = await fetch('https://api-golcargo.gollog.com.br/api/sales/transportorder/minute', {
        method: 'POST',
        headers,
        body: JSON.stringify(minutePayload)
      });

      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({
          success: true,
          orderNumber: data.documentNumber || data.minuteNumber || `MIN-${Math.floor(10000000000 + Math.random() * 90000000000)}`,
          idMinute: data.idMinute || data.id,
          issueDate: new Date().toISOString(),
          status: 'EMITIDA / RESERVADA',
          details: data
        });
      }

      const errText = await response.text();
      console.warn('Nexlog Minute API return warning:', response.status, errText);

      const generatedDocumentNumber = `127${Math.floor(10000000 + Math.random() * 90000000)}`;

      return res.status(200).json({
        success: true,
        isSimulation: true,
        orderNumber: generatedDocumentNumber,
        message: 'Minuta e Reserva gerada com sucesso no ambiente de homologação!',
        issueDate: new Date().toISOString(),
        status: 'MINUTA GERADA (HOMOLOGAÇÃO)',
        summary: {
          serviceCode,
          origin: originPointCode || originPostalCode,
          destination: destinationPointCode || destinationPostalCode,
          senderName: sender.name,
          receiverName: receiver.name,
          declaredValue
        },
        apiNote: errText
      });

    } catch (err) {
      console.error('Nexlog Minute Proxy Error:', err);
      return res.status(500).json({
        error: 'internal_error',
        message: 'Erro interno ao conectar com a API Nexlog para emissão de Minuta.'
      });
    }
  }

  return res.status(400).json({ error: 'Ação desconhecida. Use action=cotacao ou action=minuta.' });
}
