-- Migration: adiciona coluna metadata na tabela cotacoes
-- para armazenar campos extras da nova versão do formulário

ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN cotacoes.metadata IS 'Campos extras do formulário: modalidade_pagamento, local_entrega_tipo, estado_aeroporto, seguro, descricao_carga, valor_nota, com_coleta';
