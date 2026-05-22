-- Adiciona telefone2 (opcional) na tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone2 TEXT;
CREATE INDEX IF NOT EXISTS idx_clientes_telefone2 ON clientes(telefone2);
