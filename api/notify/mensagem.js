import { sendWhatsApp, nomeValidoBC } from '../_lib/notify.js';

// Envio genérico de mensagem WhatsApp via BotConversa.
// Substitui os disparos que o frontend fazia direto no webhook de notificações:
// centraliza no sendWhatsApp, que ecoa o nome atual do contato no payload e
// impede a automação do BotConversa de apagar o nome do cadastro.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, mensagem, nome } = req.body;
    if (!phone || !mensagem) {
      return res.status(400).json({ error: 'phone e mensagem são obrigatórios' });
    }

    const enviado = await sendWhatsApp(phone, mensagem, null, nomeValidoBC(nome));
    return res.status(200).json({ success: enviado });
  } catch (error) {
    console.error('Notify mensagem error:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
