-- Migration 003: adiciona chave de webhook de notificações gerais
INSERT INTO configuracoes (chave, valor, descricao)
VALUES ('botconversa_webhook_notificacoes', '', 'Webhook do BotConversa para envio de notificações gerais (cotações, confirmações, etc)')
ON CONFLICT (chave) DO NOTHING;
