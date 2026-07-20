import { syncNomeBotConversa, buscarClientePorTelefone } from '../_lib/notify.js';

// Sincroniza o nome de um contato no BotConversa, sem enviar mensagem nenhuma.
//
// Entrada: { phone, nome? }
//   - com `nome`  → usa o valor recebido (já no padrão de shared/nomeBotConversa.js)
//   - sem `nome`  → resolve pelo telefone no banco
//
// Se nenhum nome válido for encontrado, NÃO dispara: a automação sobrescreve o
// cadastro com o que chegar, e campo vazio vira o literal "none".
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, nome } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone é obrigatório' });

    let nomeFinal = (nome || '').trim();
    let origem = 'payload';
    if (!nomeFinal) {
      const cliente = await buscarClientePorTelefone(phone);
      nomeFinal = cliente?.nome || '';
      origem = cliente ? 'banco' : 'não encontrado';
    }

    const r = await syncNomeBotConversa(phone, nomeFinal);
    return res.status(200).json({ success: r.ok, nome: r.nome || null, origem, motivo: r.motivo });
  } catch (error) {
    console.error('Erro no sync de nome:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
