-- ═══════════════════════════════════════════════
-- Migration 010: Follow-up de Aniversário
-- ═══════════════════════════════════════════════

INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('followup_aniversario_ativo',   'true',
   'Ativar mensagem automática de aniversário para clientes PF'),
  ('followup_aniversario_msg',
   '🎂 Feliz Aniversário, *{nome}*! 🎉\n\nA equipe GOLLOG deseja um dia incrível para você!\n\nComo presente, estamos sempre prontos para cuidar dos seus envios com muito carinho. 🚚\n\nConte sempre com a gente! 😊',
   'Mensagem de aniversário. Use {nome} para o primeiro nome do cliente.')
ON CONFLICT (chave) DO NOTHING;
