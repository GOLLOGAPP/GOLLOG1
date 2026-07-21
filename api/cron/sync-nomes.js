import { executarSyncNomes } from '../_lib/notify.js';

// Disparo manual do re-sync de nomes (a lógica vive em _lib/notify.js e também
// roda de carona no cron de follow-up). Guardado por CRON_SECRET quando definido.
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const resultado = await executarSyncNomes();
  return res.status(200).json(resultado);
}
