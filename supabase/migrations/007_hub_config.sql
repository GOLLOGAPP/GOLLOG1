-- ─────────────────────────────────────────────────────────────────
-- Hub público por empresa: configs da landing page + QR code
-- ─────────────────────────────────────────────────────────────────
INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('hub_slug',          'gollog',                  'Slug da empresa no hub público  →  /hub/gollog'),
  ('hub_empresa_nome',  'GOLLOG',                  'Nome exibido na landing page do hub'),
  ('hub_tagline',       'Logística com qualidade', 'Subtítulo/tagline exibido abaixo do nome'),
  ('hub_cor',           '#F37021',                 'Cor primária dos botões do hub'),
  ('hub_links_ativos',  'cadastro,cotacao,rastreamento,motorista,minuta,malha,dce',
                                                   'IDs dos links ativos no hub (separados por vírgula)')
ON CONFLICT (chave) DO NOTHING;
