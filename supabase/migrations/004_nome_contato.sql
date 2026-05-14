-- Migration 004: adiciona nome_contato na tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_contato TEXT;
