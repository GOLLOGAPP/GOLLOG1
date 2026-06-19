import { supabase } from '../_lib/notify.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { origem, destino, weekday, apenas_carga } = req.query;

  let q = supabase.from('malha_aerea').select('*').order('dept_time', { ascending: true });

  if (origem) q = q.ilike('dept_station', `%${origem}%`);
  if (destino) q = q.ilike('arrival_station', `%${destino}%`);
  if (weekday) q = q.ilike('weekday', `%${weekday}%`);
  if (apenas_carga === 'true') q = q.eq('pode_enviar_carga', 'SIM');

  const { data: voos, error } = await q.limit(500);
  if (error) return res.status(500).json({ error: error.message });

  // Busca info do upload atual para link de download
  const { data: upload } = await supabase
    .from('malha_uploads').select('filename, storage_path, uploaded_at, total_voos')
    .eq('ativo', true).maybeSingle();

  let download_url = null;
  if (upload?.storage_path) {
    const { data: urlData } = supabase.storage.from('malha-aerea').getPublicUrl(upload.storage_path);
    download_url = urlData?.publicUrl || null;
  }

  return res.status(200).json({ voos: voos || [], upload, download_url });
}
