-- ═══════════════════════════════════════════════
-- Migration 008: Gatilho de Cadastro Abandonado
-- ═══════════════════════════════════════════════

-- Chaves de configuração para o gatilho de cadastro não finalizado
INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('followup_cadastro_abandonado_ativo',  'true',  'Ativar gatilho para clientes que abriram o cadastro mas não finalizaram'),
  ('followup_cadastro_abandonado_30min',  'true',  'Enviar mensagem 30 min após o cliente abrir o formulário sem concluir'),
  ('followup_cadastro_abandonado_2h',     'true',  'Enviar segunda mensagem 2h após o cliente abrir o formulário sem concluir')
ON CONFLICT (chave) DO NOTHING;
