-- Atualiza URL base do app para o novo domínio www.logprofit.com.br
UPDATE configuracoes
SET valor = 'https://www.logprofit.com.br'
WHERE chave = 'app_base_url';
