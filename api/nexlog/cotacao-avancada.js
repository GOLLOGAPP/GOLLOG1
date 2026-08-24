// Vercel Serverless: Proxy para API de Cotação Avançada GOLLOG / Nexlog
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

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

  // Format volumes for Nexlog (ensure 'lenght', 'pieces', 'weight', 'height', 'width')
  const formattedVolumes = volumes.map(v => ({
    weight: parseFloat(v.weight || v.peso || 1),
    height: parseFloat(v.height || v.altura || 10),
    width: parseFloat(v.width || v.largura || 10),
    lenght: parseFloat(v.lenght || v.length || v.comprimento || 10),
    pieces: parseInt(v.pieces || v.pecas || v.quantidade || 1, 10),
  }));

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'CompanyKey': process.env.GOLLOG_COMPANY_KEY || 'G3',
    'language': 'pt-BR',
    'Token': process.env.NEXLOG_TOKEN || 'acd1916a-3190-44ec-aed2-26c2c1836fe1',
    'UserId': process.env.NEXLOG_USER_ID || '21835',
    'Accept': 'application/json',
  };

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

    // Fallback if customer is not registered/blocked for contract
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

    // Process and sort quotes
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
