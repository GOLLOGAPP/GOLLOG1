-- ═══════════════════════════════════════════════
-- Migration 009: Data de Nascimento (PF)
-- ═══════════════════════════════════════════════

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_nascimento DATE;

CREATE INDEX IF NOT EXISTS idx_clientes_nascimento ON clientes(data_nascimento);
