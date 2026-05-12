-- ═══════════════════════════════════════════════
-- GOLLOG APP - Database Schema
-- ═══════════════════════════════════════════════

-- 1. CLIENTES (CRM Principal)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('PF', 'PJ')),
  cpf_cnpj TEXT UNIQUE,
  nome_razao_social TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  cep TEXT,
  endereco_completo TEXT,
  cidade TEXT,
  estado TEXT,
  unidade_atendimento TEXT CHECK (unidade_atendimento IN ('Osasco', 'Barueri')),
  cliente_gollog BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'prospecto' CHECK (status IN ('ativo', 'inativo', 'prospecto')),
  total_envios INTEGER DEFAULT 0,
  total_cotacoes INTEGER DEFAULT 0,
  valor_total_gasto DECIMAL(12,2) DEFAULT 0,
  ultimo_contato TIMESTAMPTZ DEFAULT NOW(),
  tags JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COTAÇÕES
CREATE TABLE IF NOT EXISTS cotacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cep_origem TEXT,
  cep_destino TEXT,
  cidade_origem TEXT,
  cidade_destino TEXT,
  peso_kg DECIMAL(8,2),
  altura_cm DECIMAL(8,2),
  largura_cm DECIMAL(8,2),
  comprimento_cm DECIMAL(8,2),
  tipo_servico TEXT,
  valor_cotado DECIMAL(10,2),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'aceita', 'expirada')),
  resposta_api JSONB,
  unidade TEXT CHECK (unidade IN ('Osasco', 'Barueri')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RASTREAMENTOS
CREATE TABLE IF NOT EXISTS rastreamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  codigo_rastreio TEXT NOT NULL,
  status_atual TEXT,
  historico_status JSONB DEFAULT '[]'::jsonb,
  ultima_consulta TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COLETAS
CREATE TABLE IF NOT EXISTS coletas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  endereco_coleta TEXT,
  cep_coleta TEXT,
  data_solicitada DATE,
  horario_preferido TEXT,
  quantidade_volumes INTEGER DEFAULT 1,
  peso_total_kg DECIMAL(8,2),
  observacoes TEXT,
  status TEXT DEFAULT 'solicitada' CHECK (status IN ('solicitada', 'agendada', 'coletada', 'cancelada')),
  unidade TEXT CHECK (unidade IN ('Osasco', 'Barueri')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUPORTE / TICKETS
CREATE TABLE IF NOT EXISTS suporte_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  assunto TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_atendimento', 'resolvido', 'fechado')),
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  atendente TEXT,
  unidade TEXT CHECK (unidade IN ('Osasco', 'Barueri')),
  mensagens JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MOTORISTAS AGREGADOS
CREATE TABLE IF NOT EXISTS motoristas_agregados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT NOT NULL,
  email TEXT,
  cnh_categoria TEXT,
  tipo_veiculo TEXT,
  placa_veiculo TEXT,
  regiao_atuacao TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'ativo')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. FAQ
CREATE TABLE IF NOT EXISTS faq (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  categoria TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. LOG DE ATIVIDADES
CREATE TABLE IF NOT EXISTS atividades_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('cadastro', 'cotacao', 'rastreamento', 'coleta', 'suporte', 'contato')),
  descricao TEXT,
  canal TEXT DEFAULT 'whatsapp' CHECK (canal IN ('whatsapp', 'sistema', 'telefone')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CONFIGURAÇÕES DO SISTEMA
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT UNIQUE NOT NULL,
  valor TEXT,
  descricao TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ═══
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_unidade ON clientes(unidade_atendimento);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
CREATE INDEX IF NOT EXISTS idx_cotacoes_cliente ON cotacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_status ON cotacoes(status);
CREATE INDEX IF NOT EXISTS idx_rastreamentos_codigo ON rastreamentos(codigo_rastreio);
CREATE INDEX IF NOT EXISTS idx_rastreamentos_cliente ON rastreamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_coletas_status ON coletas(status);
CREATE INDEX IF NOT EXISTS idx_suporte_status ON suporte_tickets(status);
CREATE INDEX IF NOT EXISTS idx_atividades_cliente ON atividades_log(cliente_id);
CREATE INDEX IF NOT EXISTS idx_atividades_tipo ON atividades_log(tipo);

-- ═══ RLS POLICIES ═══
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rastreamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE coletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE suporte_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE motoristas_agregados ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all for anon (public pages need insert access)
-- In production, restrict to authenticated users for admin operations
CREATE POLICY "Allow all for anon" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON cotacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON rastreamentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON coletas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON suporte_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON motoristas_agregados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON faq FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON atividades_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON configuracoes FOR ALL USING (true) WITH CHECK (true);

-- ═══ TRIGGER: auto-update updated_at ═══
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_suporte_updated_at BEFORE UPDATE ON suporte_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══ INITIAL FAQ DATA ═══
INSERT INTO faq (pergunta, resposta, categoria, ordem) VALUES
('Qual o prazo de entrega?', 'O prazo varia de acordo com o serviço escolhido e o destino. GOLLOG Rápido: 1-2 dias úteis. GOLLOG Econômico: 3-7 dias úteis.', 'Prazos', 1),
('Como rastrear minha encomenda?', 'Você pode rastrear pelo nosso WhatsApp (opção A) ou pelo site servicos.gollog.com.br informando o código de rastreio.', 'Rastreamento', 2),
('Quais documentos são necessários para envio?', 'Para envios nacionais: documento de identidade e a Minuta de Despacho preenchida. Para PJ: CNPJ e nota fiscal.', 'Documentos', 3),
('Vocês fazem coleta no endereço?', 'Sim! Através do nosso WhatsApp (opção C) você pode solicitar coleta. Atendemos Osasco e Barueri.', 'Coleta', 4),
('Como embalar minha encomenda?', 'Use caixas resistentes, preencha espaços vazios com papel ou plástico bolha. Itens frágeis devem ter proteção reforçada.', 'Embalagem', 5);

-- ═══ INITIAL CONFIG DATA ═══
INSERT INTO configuracoes (chave, valor, descricao) VALUES
('botconversa_webhook_url', '', 'URL do webhook do BotConversa'),
('botconversa_api_key', '', 'API Key do BotConversa'),
('gollog_api_key', '', 'API Key da Gollog'),
('unidade_osasco_endereco', 'Rua Example, 100 - Osasco/SP', 'Endereço da unidade Osasco'),
('unidade_osasco_telefone', '(11) 3333-4444', 'Telefone da unidade Osasco'),
('unidade_barueri_endereco', 'Av. Example, 200 - Barueri/SP', 'Endereço da unidade Barueri'),
('unidade_barueri_telefone', '(11) 5555-6666', 'Telefone da unidade Barueri');
