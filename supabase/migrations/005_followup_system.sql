-- ═══════════════════════════════════════════════
-- Migration 005: Follow-up System
-- ═══════════════════════════════════════════════

-- Tabela de avaliações de serviço
CREATE TABLE IF NOT EXISTS avaliacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  rastreamento_id UUID REFERENCES rastreamentos(id) ON DELETE SET NULL,
  codigo_rastreio TEXT,
  nota INTEGER CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  google_link_enviado BOOLEAN DEFAULT false,
  ticket_criado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON avaliacoes FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_cliente ON avaliacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rastreamento ON avaliacoes(rastreamento_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_nota ON avaliacoes(nota);

-- Fila de follow-ups
CREATE TABLE IF NOT EXISTS followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  referencia_id UUID,
  referencia_tipo TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'cancelado', 'convertido', 'falhou')),
  canal TEXT DEFAULT 'whatsapp',
  mensagem TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON followups FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_tipo ON followups(tipo);
CREATE INDEX IF NOT EXISTS idx_followups_cliente ON followups(cliente_id);
CREATE INDEX IF NOT EXISTS idx_followups_scheduled ON followups(scheduled_for);

-- Colunas adicionais em rastreamentos
ALTER TABLE rastreamentos ADD COLUMN IF NOT EXISTS notificado_entregue BOOLEAN DEFAULT false;
ALTER TABLE rastreamentos ADD COLUMN IF NOT EXISTS status_anterior TEXT;
ALTER TABLE rastreamentos ADD COLUMN IF NOT EXISTS avaliacao_enviada BOOLEAN DEFAULT false;
ALTER TABLE rastreamentos ADD COLUMN IF NOT EXISTS ultima_consulta TIMESTAMPTZ DEFAULT NOW();

-- Colunas adicionais em coletas
ALTER TABLE coletas ADD COLUMN IF NOT EXISTS telefone_destinatario TEXT;
ALTER TABLE coletas ADD COLUMN IF NOT EXISTS email_destinatario TEXT;
ALTER TABLE coletas ADD COLUMN IF NOT EXISTS alerta_enviado BOOLEAN DEFAULT false;

-- Expande constraint de tipo em atividades_log
ALTER TABLE atividades_log DROP CONSTRAINT IF EXISTS atividades_log_tipo_check;
ALTER TABLE atividades_log ADD CONSTRAINT atividades_log_tipo_check
  CHECK (tipo IN ('cadastro', 'cotacao', 'rastreamento', 'coleta', 'suporte', 'contato', 'followup', 'avaliacao'));

-- Novas chaves de configuração para o sistema de follow-up
INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('followup_cotacao_ativo',        'true',  'Ativar follow-up de cotações não contratadas'),
  ('followup_cotacao_d1',           'true',  'Follow-up cotação no D+1'),
  ('followup_cotacao_d3',           'true',  'Follow-up cotação no D+3'),
  ('followup_cotacao_d7',           'true',  'Follow-up cotação no D+7 (última tentativa)'),
  ('followup_cadastro_ativo',       'true',  'Ativar follow-up de cadastros sem cotação'),
  ('followup_cadastro_d1',          'true',  'Follow-up cadastro sem cotação no D+1'),
  ('followup_cadastro_d3',          'true',  'Follow-up cadastro sem cotação no D+3'),
  ('followup_cadastro_d7',          'true',  'Follow-up cadastro sem cotação no D+7'),
  ('followup_inativo_ativo',        'true',  'Ativar alertas de clientes inativos'),
  ('followup_inativo_30d',          'true',  'Alerta de inatividade aos 30 dias'),
  ('followup_inativo_60d',          'true',  'Alerta de inatividade aos 60 dias'),
  ('followup_inativo_90d',          'true',  'Alerta de inatividade aos 90 dias'),
  ('followup_rastreio_ativo',       'true',  'Ativar polling automático de rastreamentos'),
  ('followup_avaliacao_ativo',      'true',  'Ativar avaliação pós-entrega'),
  ('followup_coleta_alerta_ativo',  'true',  'Ativar alerta de coleta do dia'),
  ('followup_relatorio_mensal',     'false', 'Ativar relatório mensal para clientes'),
  ('google_review_link',            '',      'Link da avaliação no Google Minha Empresa'),
  ('resend_api_key',                '',      'API Key do Resend (envio de emails transacionais)'),
  ('resend_from_email',             'GOLLOG <noreply@gollog.com.br>', 'E-mail remetente padrão'),
  ('app_base_url',                  'https://gollog-1.vercel.app', 'URL base do app (sem barra final)')
ON CONFLICT (chave) DO NOTHING;
