-- Limpeza do backlog: marca como "convertido" os follow-ups de cadastro_iniciado
-- pendentes cujo telefone JÁ EXISTE em clientes (comparação somente por dígitos).
--
-- Replica a lógica de normalizePhone() do código: remove o prefixo 55 apenas
-- quando o número tem 12+ dígitos, preservando DDDs válidos (ex.: 55 = Santa Maria/RS).
--
-- 1) RODE PRIMEIRO o SELECT de pré-visualização para conferir o que será afetado.
-- 2) Depois rode o UPDATE.

-- Normaliza dígitos: remove tudo que não é número e tira o 55 só se length >= 12
CREATE OR REPLACE FUNCTION norm_phone(raw text) RETURNS text AS $$
  SELECT CASE
           WHEN length(d) >= 12 AND left(d, 2) = '55' THEN substring(d FROM 3)
           ELSE d
         END
  FROM (SELECT regexp_replace(coalesce(raw, ''), '\D', '', 'g') AS d) x;
$$ LANGUAGE sql IMMUTABLE;

-- ─── PRÉ-VISUALIZAÇÃO (não altera nada) ──────────────────────────────────────
SELECT f.id,
       f.metadata->>'telefone' AS telefone_followup,
       c.id   AS cliente_id,
       c.telefone AS telefone_cliente,
       c.nome_razao_social
FROM   followups f
JOIN   clientes c
  ON   norm_phone(c.telefone)  = norm_phone(f.metadata->>'telefone')
   OR  norm_phone(c.telefone2) = norm_phone(f.metadata->>'telefone')
WHERE  f.tipo   = 'cadastro_iniciado'
  AND  f.status = 'pendente'
  AND  length(norm_phone(f.metadata->>'telefone')) >= 8;

-- ─── APLICAÇÃO (descomente para executar) ────────────────────────────────────
-- UPDATE followups f
-- SET    status = 'convertido',
--        sent_at = now()
-- FROM   clientes c
-- WHERE  f.tipo   = 'cadastro_iniciado'
--   AND  f.status = 'pendente'
--   AND  length(norm_phone(f.metadata->>'telefone')) >= 8
--   AND  ( norm_phone(c.telefone)  = norm_phone(f.metadata->>'telefone')
--       OR norm_phone(c.telefone2) = norm_phone(f.metadata->>'telefone') );

-- Opcional: remover a função auxiliar depois da limpeza
-- DROP FUNCTION IF EXISTS norm_phone(text);
