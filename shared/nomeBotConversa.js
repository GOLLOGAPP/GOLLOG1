// Fonte única do padrão de nome de contato no BotConversa.
// Importado tanto pelo backend (api/) quanto pelo frontend (src/) — antes disso
// a regra existia em 4 cópias e mudá-la exigia 4 edições.
//
// Padrão:
//   PF → nome completo
//   PJ → "PrimeiroNomeDoResponsável - Empresa"  (ex.: "Lucas - Paris Decor")
//
// IMPORTANTE: a API REST do BotConversa é somente-leitura para contatos. O nome
// só é gravado por uma automação de webhook com a ação "Criar/Atualizar Nome do
// Contato" — e se o campo mapeado vier vazio, ela grava o literal "none" por
// cima do cadastro. Por isso nada aqui pode devolver string vazia por descuido.

// Primeiras palavras que NÃO são nome de pessoa. Quando o nome do responsável
// começa com uma delas, encurtar para a primeira palavra produziria lixo
// ("Setor de Compras Oriental" → "Setor"), então preservamos o texto inteiro.
const PRIMEIRA_PALAVRA_GENERICA = new Set([
  'setor', 'setores', 'depto', 'departamento', 'dept', 'div', 'divisao',
  'adm', 'administrativo', 'administracao', 'diretoria', 'gerencia', 'gestao',
  'coordenacao', 'supervisao', 'secretaria', 'escritorio', 'recepcao',
  'comercial', 'vendas', 'compras', 'financeiro', 'faturamento', 'contas',
  'cobranca', 'fiscal', 'contabilidade', 'juridico', 'rh', 'marketing', 'ti',
  'atendimento', 'suporte', 'sac', 'operacional', 'operacoes', 'logistica',
  'transporte', 'transportes', 'expedicao', 'almoxarifado', 'estoque',
  'equipe', 'grupo', 'time', 'contato', 'responsavel', 'empresa', 'matriz',
  'filial', 'sr', 'sra', 'dr', 'dra', 'sto', 'sta',
]);

// Reduz a palavra a letras minúsculas sem acento, para comparar com a lista.
const chave = (palavra) =>
  (palavra || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');

// Primeiro nome do responsável — ou o nome inteiro, quando a primeira palavra
// é genérica e sozinha não identifica ninguém.
export function primeiroNomeResponsavel(nomeContato) {
  const completo = (nomeContato || '').trim().replace(/\s+/g, ' ');
  if (!completo) return '';
  const primeira = completo.split(' ')[0];
  return PRIMEIRA_PALAVRA_GENERICA.has(chave(primeira)) ? completo : primeira;
}

// Nome do contato no padrão BotConversa. `cliente` precisa de tipo,
// nome_razao_social e nome_contato.
export function nomeBotConversa(cliente) {
  // Espaços internos são colapsados: o BotConversa normaliza ao gravar, e sem
  // isso um cadastro com espaço duplo aparece como divergente em toda auditoria.
  const limpa = s => (s || '').trim().replace(/\s+/g, ' ');
  const razao = limpa(cliente?.nome_razao_social);
  const contato = limpa(cliente?.nome_contato);
  if (cliente?.tipo === 'PJ' && contato && razao) {
    return `${primeiroNomeResponsavel(contato)} - ${razao}`;
  }
  return razao;
}

// Mesmo padrão, dividido nos campos que o BotConversa usa (first_name /
// last_name). Ele quebra no primeiro espaço; reproduzimos isso para que
// `primeiro_nome` continue servindo para saudação.
export function nomeBotConversaPartes(cliente) {
  const completo = nomeBotConversa(cliente);
  const i = completo.indexOf(' ');
  return i === -1
    ? { primeiroNome: completo, sobrenome: '' }
    : { primeiroNome: completo.slice(0, i), sobrenome: completo.slice(i + 1) };
}
