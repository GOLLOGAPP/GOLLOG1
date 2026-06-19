import { supabase } from '../_lib/notify.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rows, filename, storage_path } = req.body || {};
  if (!rows?.length) return res.status(400).json({ error: 'rows é obrigatório' });

  const malha_id = crypto.randomUUID();

  // Desativa uploads anteriores
  await supabase.from('malha_uploads').update({ ativo: false }).eq('ativo', true);

  // Limpa dados anteriores
  await supabase.from('malha_aerea').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Insere novos voos em lotes de 500
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map(r => ({ ...r, malha_id }));
    const { error } = await supabase.from('malha_aerea').insert(batch);
    if (error) return res.status(500).json({ error: 'Erro ao inserir voos', details: error.message });
  }

  // Registra upload
  await supabase.from('malha_uploads').insert({
    filename: filename || 'malha.xlsx',
    storage_path: storage_path || null,
    total_voos: rows.length,
    ativo: true,
  });

  return res.status(200).json({ success: true, total: rows.length, malha_id });
}
