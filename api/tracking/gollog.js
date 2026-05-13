// Vercel Serverless: Proxy para API de rastreamento GOLLOG
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { documentNumber, type } = req.body;

  if (!documentNumber) {
    return res.status(400).json({ error: 'documentNumber é obrigatório' });
  }

  try {
    const response = await fetch('https://api-golcargo.gollog.com.br/api/sales/transportorder/tracking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CompanyKey': process.env.GOLLOG_COMPANY_KEY || 'G3',
        'language': 'pt-BR',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        type: type || 'documentnumber',
        value: documentNumber,
      }),
    });

    if (response.status === 404) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Documento não encontrado. Verifique o número e tente novamente.'
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'api_error',
        message: `Erro na API GOLLOG (${response.status})`
      });
    }

    const data = await response.json();

    // Format response for our frontend
    const detail = data.detail?.awbInfo || {};
    const events = (data.events || []).map(evt => ({
      date: evt.eventDateTimeLT,
      agent: evt.agent,
      station: evt.station,
      documentNumber: evt.documentNumber,
      code: evt.status?.code,
      description: evt.status?.codeDescription,
      stationName: evt.status?.stationName,
      pieces: evt.status?.pieces,
      weight: evt.status?.weight,
      flightNumber: evt.status?.flightNumber,
      scheduleType: evt.status?.scheduleType,
      arrivalPoint: evt.status?.arrivalPoint,
      arrivalDate: evt.status?.arrivalDateTimeLT,
      departureDate: evt.status?.departureDateTimeLT,
    }));

    // Build summary
    const lastEvent = events[events.length - 1];
    const summary = {
      awb: detail.awb,
      product: detail.productDescription || detail.product,
      origin: {
        station: detail.routing?.origin?.station,
        name: detail.routing?.origin?.airport,
      },
      destination: {
        station: detail.routing?.destination?.station,
        name: detail.routing?.destination?.airport,
      },
      status: detail.operationalStatusDescription,
      statusCode: detail.operationalStatus,
      deliveryPlace: detail.deliveryPlace,
      expectedDelivery: detail.expectedDeliveryDate,
      description: detail.userCargosDescription || detail.description,
      totals: {
        pieces: detail.totals?.pieces,
        weight: detail.totals?.weight,
        volume: detail.totals?.volume,
      },
      declaredValue: detail.value?.decl,
      cte: detail.cte,
      reference: detail.reference,
      issueDate: detail.issueDateTime,
      lastEvent: lastEvent ? {
        code: lastEvent.code,
        description: lastEvent.description,
        date: lastEvent.date,
        station: lastEvent.station,
      } : null,
    };

    return res.status(200).json({
      success: true,
      summary,
      events,
      raw: data,
    });

  } catch (err) {
    console.error('GOLLOG API error:', err);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Erro ao consultar API GOLLOG'
    });
  }
}
