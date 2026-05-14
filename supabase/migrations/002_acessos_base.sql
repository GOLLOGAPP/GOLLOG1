-- ═══════════════════════════════════════════════
-- GOLLOG APP - Migration 002: Recepção Bot
-- ═══════════════════════════════════════════════

-- 10. ACESSOS BASE (Recepção WhatsApp Bot)
-- Registra cada vez que um contato escolhe uma unidade no Botconversa
CREATE TABLE IF NOT EXISTS acessos_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone TEXT,
  nome TEXT,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  base TEXT NOT NULL CHECK (base IN ('Osasco', 'Barueri')),
  codigo_base TEXT NOT NULL CHECK (codigo_base IN ('QOZ', 'QBX')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acessos_base_base ON acessos_base(base);
CREATE INDEX IF NOT EXISTS idx_acessos_base_created_at ON acessos_base(created_at);
CREATE INDEX IF NOT EXISTS idx_acessos_base_telefone ON acessos_base(telefone);
CREATE INDEX IF NOT EXISTS idx_acessos_base_cliente ON acessos_base(cliente_id);

ALTER TABLE acessos_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON acessos_base FOR ALL USING (true) WITH CHECK (true);
