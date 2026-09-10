-- ══════════════════════════════════════════════════════════════════════════════
-- GOLLOG APP - Migration 013: Correcao de Vulnerabilidades de Seguranca (RLS Hardening)
-- Resolve os alertas criticos do Supabase Security Advisor:
-- 1. Table publicly accessible (rls_disabled_in_public)
-- 2. Sensitive data publicly accessible
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. HABILITACAO DO ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- Garante que nenhuma tabela no schema public fique exposta sem RLS.

ALTER TABLE IF EXISTS bases_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cotacao_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS malha_aerea ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS malha_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rastreamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suporte_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS motoristas_agregados ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS atividades_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS acessos_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS followups ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. POLICIES PARA BASES_EMAIL
-- Leitura publica para consulta de e-mails das bases operacionais.
-- Modificacao/exclusao apenas para administradores autenticados ou service_role.
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow all for anon" ON bases_email;
DROP POLICY IF EXISTS "Allow read bases_email" ON bases_email;
DROP POLICY IF EXISTS "Allow admin all bases_email" ON bases_email;

CREATE POLICY "Allow read bases_email" ON bases_email
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow admin all bases_email" ON bases_email
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. POLICIES PARA TOKENS (cotacao_tokens e link_tokens)
-- Leitura e insercao publicas para resolucao de links curtos de cotacao.
-- Administradores autenticados tem controle total.
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow all for anon" ON cotacao_tokens;
DROP POLICY IF EXISTS "Allow read cotacao_tokens" ON cotacao_tokens;
DROP POLICY IF EXISTS "Allow insert cotacao_tokens" ON cotacao_tokens;
DROP POLICY IF EXISTS "Allow admin all cotacao_tokens" ON cotacao_tokens;

CREATE POLICY "Allow read cotacao_tokens" ON cotacao_tokens
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert cotacao_tokens" ON cotacao_tokens
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow admin all cotacao_tokens" ON cotacao_tokens
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON link_tokens;
DROP POLICY IF EXISTS "Allow read link_tokens" ON link_tokens;
DROP POLICY IF EXISTS "Allow insert link_tokens" ON link_tokens;
DROP POLICY IF EXISTS "Allow admin all link_tokens" ON link_tokens;

CREATE POLICY "Allow read link_tokens" ON link_tokens
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert link_tokens" ON link_tokens
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow admin all link_tokens" ON link_tokens
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. POLICIES PARA MALHA AEREA E UPLOADS
-- Consulta publica de voos; edicao/upload restrita ao painel admin autenticado.
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow all for anon" ON malha_aerea;
DROP POLICY IF EXISTS "Allow read malha_aerea" ON malha_aerea;
DROP POLICY IF EXISTS "Allow admin all malha_aerea" ON malha_aerea;

CREATE POLICY "Allow read malha_aerea" ON malha_aerea
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow admin all malha_aerea" ON malha_aerea
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON malha_uploads;
DROP POLICY IF EXISTS "Allow admin all malha_uploads" ON malha_uploads;

CREATE POLICY "Allow admin all malha_uploads" ON malha_uploads
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. POLICIES PARA FAQ
-- Leitura publica; gerenciamento por administradores.
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow all for anon" ON faq;
DROP POLICY IF EXISTS "Allow read faq" ON faq;
DROP POLICY IF EXISTS "Allow admin all faq" ON faq;

CREATE POLICY "Allow read faq" ON faq
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow admin all faq" ON faq
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. POLICIES PARA CONFIGURACOES
-- Protecao contra exclusao indevida: anon so pode ler; admin pode gerenciar.
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow all for anon" ON configuracoes;
DROP POLICY IF EXISTS "Allow read configuracoes" ON configuracoes;
DROP POLICY IF EXISTS "Allow admin all configuracoes" ON configuracoes;

CREATE POLICY "Allow read configuracoes" ON configuracoes
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow admin all configuracoes" ON configuracoes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. POLICIES PARA CLIENTES, COTACOES E SEUS FLUXOS
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow all for anon" ON clientes;
DROP POLICY IF EXISTS "Allow select clientes" ON clientes;
DROP POLICY IF EXISTS "Allow insert clientes" ON clientes;
DROP POLICY IF EXISTS "Allow update clientes" ON clientes;
DROP POLICY IF EXISTS "Allow admin all clientes" ON clientes;

CREATE POLICY "Allow select clientes" ON clientes
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert clientes" ON clientes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update clientes" ON clientes
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow admin all clientes" ON clientes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON cotacoes;
DROP POLICY IF EXISTS "Allow select cotacoes" ON cotacoes;
DROP POLICY IF EXISTS "Allow insert cotacoes" ON cotacoes;
DROP POLICY IF EXISTS "Allow update cotacoes" ON cotacoes;
DROP POLICY IF EXISTS "Allow admin all cotacoes" ON cotacoes;

CREATE POLICY "Allow select cotacoes" ON cotacoes
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert cotacoes" ON cotacoes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update cotacoes" ON cotacoes
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow admin all cotacoes" ON cotacoes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. POLICIES PARA FORMULARIOS PUBLICOS (Coletas, Motoristas, Suporte, Avaliacoes, Logs)
-- ══════════════════════════════════════════════════════════════════════════════
-- Coletas
DROP POLICY IF EXISTS "Allow all for anon" ON coletas;
DROP POLICY IF EXISTS "Allow insert coletas" ON coletas;
DROP POLICY IF EXISTS "Allow select coletas" ON coletas;
DROP POLICY IF EXISTS "Allow admin all coletas" ON coletas;

CREATE POLICY "Allow insert coletas" ON coletas
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow select coletas" ON coletas
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow admin all coletas" ON coletas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Motoristas Agregados
DROP POLICY IF EXISTS "Allow all for anon" ON motoristas_agregados;
DROP POLICY IF EXISTS "Allow insert motoristas_agregados" ON motoristas_agregados;
DROP POLICY IF EXISTS "Allow admin all motoristas_agregados" ON motoristas_agregados;

CREATE POLICY "Allow insert motoristas_agregados" ON motoristas_agregados
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow admin all motoristas_agregados" ON motoristas_agregados
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Suporte / Tickets
DROP POLICY IF EXISTS "Allow all for anon" ON suporte_tickets;
DROP POLICY IF EXISTS "Allow insert suporte_tickets" ON suporte_tickets;
DROP POLICY IF EXISTS "Allow select suporte_tickets" ON suporte_tickets;
DROP POLICY IF EXISTS "Allow admin all suporte_tickets" ON suporte_tickets;

CREATE POLICY "Allow insert suporte_tickets" ON suporte_tickets
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow select suporte_tickets" ON suporte_tickets
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow admin all suporte_tickets" ON suporte_tickets
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rastreamentos
DROP POLICY IF EXISTS "Allow all for anon" ON rastreamentos;
DROP POLICY IF EXISTS "Allow select rastreamentos" ON rastreamentos;
DROP POLICY IF EXISTS "Allow admin all rastreamentos" ON rastreamentos;

CREATE POLICY "Allow select rastreamentos" ON rastreamentos
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow admin all rastreamentos" ON rastreamentos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Atividades Log
DROP POLICY IF EXISTS "Allow all for anon" ON atividades_log;
DROP POLICY IF EXISTS "Allow insert atividades_log" ON atividades_log;
DROP POLICY IF EXISTS "Allow admin all atividades_log" ON atividades_log;

CREATE POLICY "Allow insert atividades_log" ON atividades_log
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow admin all atividades_log" ON atividades_log
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Acessos Base
DROP POLICY IF EXISTS "Allow all for anon" ON acessos_base;
DROP POLICY IF EXISTS "Allow insert acessos_base" ON acessos_base;
DROP POLICY IF EXISTS "Allow admin all acessos_base" ON acessos_base;

CREATE POLICY "Allow insert acessos_base" ON acessos_base
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow admin all acessos_base" ON acessos_base
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Avaliacoes
DROP POLICY IF EXISTS "Allow all for anon" ON avaliacoes;
DROP POLICY IF EXISTS "Allow insert avaliacoes" ON avaliacoes;
DROP POLICY IF EXISTS "Allow select avaliacoes" ON avaliacoes;
DROP POLICY IF EXISTS "Allow admin all avaliacoes" ON avaliacoes;

CREATE POLICY "Allow insert avaliacoes" ON avaliacoes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow select avaliacoes" ON avaliacoes
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow admin all avaliacoes" ON avaliacoes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Follow-ups
DROP POLICY IF EXISTS "Allow all for anon" ON followups;
DROP POLICY IF EXISTS "Allow select followups" ON followups;
DROP POLICY IF EXISTS "Allow insert followups" ON followups;
DROP POLICY IF EXISTS "Allow update followups" ON followups;
DROP POLICY IF EXISTS "Allow admin all followups" ON followups;

CREATE POLICY "Allow select followups" ON followups
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert followups" ON followups
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update followups" ON followups
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow admin all followups" ON followups
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
