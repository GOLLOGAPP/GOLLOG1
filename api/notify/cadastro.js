import { createClient } from '@supabase/supabase-js';
import {
  marcarCadastroConvertido, toInternational, syncNomeBotConversa,
  nomeValidoBC, nomeSubscriberBC, buscarClientePorTelefone,
} from '../_lib/notify.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://bkljbfqvlepmmwwylfdv.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// API REST oficial do BotConversa (header API-KEY)
const BC_API = 'https://backend.botconversa.com.br/api/v1/webhook';

// Aplica etiquetas pelo fluxo correto da API:
// 1) resolve o id do contato pelo telefone  2) lista as tags (nome→id)
// 3) POST /subscriber/{id}/tags/{tag_id}/ para cada etiqueta.
async function aplicarEtiquetas(phoneDigits, tagNames, apiKey) {
  const headers = { 'API-KEY': apiKey, 'Content-Type': 'application/json' };

  // 1. Contato
  const subRes = await fetch(`${BC_API}/subscriber/get_by_phone/${phoneDigits}/`, { headers });
  if (!subRes.ok) return [{ erro: 'subscriber não encontrado', status: subRes.status }];
  const sub = await subRes.json().catch(() => null);
  const subId = sub?.id;
  if (!subId) return [{ erro: 'subscriber sem id', body: sub }];

  // 2. Tags disponíveis (resolve nome → id)
  const tagsRes = await fetch(`${BC_API}/tags/`, { headers });
  const tagsBody = tagsRes.ok ? await tagsRes.json().catch(() => null) : null;
  const allTags = Array.isArray(tagsBody) ? tagsBody : (tagsBody?.results || []);

  // 3. Adiciona cada etiqueta por id
  const results = [];
  for (const name of tagNames) {
    const tag = allTags.find(t => (t.name || '').toLowerCase() === name.toLowerCase());
    if (!tag) { results.push({ tag: name, erro: 'tag inexistente no BotConversa' }); continue; }
    try {
      const r = await fetch(`${BC_API}/subscriber/${subId}/tags/${tag.id}/`, { method: 'POST', headers });
      results.push({ tag: name, status: r.status, ok: r.ok });
    } catch (e) {
      results.push({ tag: name, erro: e.message });
    }
  }
  return results;
}

// Adds "Cliente" tag to a Botconversa subscriber after registration
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, nome } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone é obrigatório' });

    const [configKey, configWebhook] = await Promise.all([
      supabase.from('configuracoes').select('valor').eq('chave', 'botconversa_api_key').single(),
      supabase.from('configuracoes').select('valor').eq('chave', 'botconversa_webhook_url').single(),
    ]);

    const apiKey = configKey?.data?.valor;
    const webhookUrl = configWebhook?.data?.valor;

    if (!apiKey) {
      return res.status(200).json({ success: false, message: 'API key do Botconversa não configurada' });
    }

    const formattedPhone = toInternational(phone);

    // 0. Rede de segurança: encerra o follow-up de cadastro abandonado deste
    //    telefone, mesmo que a conversão não tenha sido marcada pelo navegador.
    let cadastrosConvertidos = 0;
    try {
      cadastrosConvertidos = await marcarCadastroConvertido(phone);
    } catch (e) {
      console.error('Falha ao marcar cadastro convertido:', e.message);
    }

    // A automação de menu tem a ação "Criar/Atualizar Nome do Contato" ativa:
    // se o payload chegar SEM o campo `nome`, ela grava "None" por cima do
    // cadastro. Por isso o menu NUNCA pode disparar sem um nome válido.
    // Prioridade (igual sendWhatsApp): nome recebido → nome do CRM pelo
    // telefone → nome que o BotConversa já tem. Só omite se as três falharem.
    const nomeMenu =
      nomeValidoBC(nome)
      || (await buscarClientePorTelefone(phone))?.nome
      || await nomeSubscriberBC(formattedPhone);

    // 1. Dispara fluxo do menu via webhook PRIMEIRO — é o passo crítico
    //    (retorno ao WhatsApp). Mesmo se as etiquetas falharem, o menu vai.
    let menuTriggered = false;
    if (webhookUrl) {
      try {
        const webhookPayload = { phone: formattedPhone };
        if (nomeMenu) webhookPayload.nome = nomeMenu;

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });
        menuTriggered = true;
      } catch (e) {
        console.error('Webhook menu falhou:', e.message);
      }
    }

    // 1b. Grava o nome pela automação NOMES — caminho dedicado, sem mensagem.
    //     Usa o nome JÁ RESOLVIDO (CRM → BotConversa), não o `nome` cru: quando
    //     a ação de nome for removida da automação de menu, esta é a única que
    //     escreve o nome, então não pode abortar por receber um nome vazio.
    let nomeSync = null;
    try {
      nomeSync = await syncNomeBotConversa(phone, nomeMenu);
    } catch (e) {
      console.error('Sync de nome falhou:', e.message);
      nomeSync = { ok: false, motivo: e.message };
    }

    // 2. Aplica etiquetas "Cliente" e "Novo" (best-effort, não bloqueia o menu)
    let tagResults = [];
    try {
      tagResults = await aplicarEtiquetas(formattedPhone, ['Cliente', 'Novo'], apiKey);
    } catch (e) {
      console.error('Falha ao aplicar etiquetas:', e.message);
      tagResults = [{ erro: e.message }];
    }

    return res.status(200).json({
      success: true,
      phone: formattedPhone,
      tags: tagResults,
      menu_triggered: menuTriggered,
      nome_sync: nomeSync,
      cadastros_convertidos: cadastrosConvertidos,
    });

  } catch (error) {
    console.error('Erro ao processar cadastro:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
}
