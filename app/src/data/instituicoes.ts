/**
 * Instituições financeiras mais usadas no Brasil.
 *
 * Serve só de sugestão no campo do import — o usuário pode digitar qualquer
 * coisa. O valor de padronizar o nome é a conciliação: "o outro lado está no
 * extrato do Bradesco" só sai bonito se ele escreveu "Bradesco" nas duas vezes,
 * e não "bradesco" numa e "Banco Bradesco" na outra.
 *
 * Ordem: bancos digitais e corretoras primeiro (mais prováveis de exportar
 * OFX/CSV), depois os grandes tradicionais.
 */
export const INSTITUICOES: readonly string[] = [
  // digitais / carteiras
  'Nubank',
  'Mercado Pago',
  'Inter',
  'C6 Bank',
  'PicPay',
  'Neon',
  'Next',
  'Original',
  'Banco Pan',
  'Will Bank',
  'Digio',
  'Agibank',
  'Sicoob',
  'Sicredi',
  'PagBank',
  'Stone',
  'Banco BV',
  // tradicionais
  'Itaú',
  'Bradesco',
  'Banco do Brasil',
  'Caixa',
  'Santander',
  'Safra',
  'Banrisul',
  'BRB',
  // corretoras / investimento
  'XP Investimentos',
  'Rico',
  'Clear',
  'BTG Pactual',
  'Avenue',
  'Nomad',
  'Genial',
  'Ágora',
  'Modalmais',
  'Toro',
  'Warren',
  // cartões
  'Cartão Elo',
  'Credicard',
  'Porto Seguro',
  'Amex',
];

/**
 * Normaliza o que o usuário digitou pro nome canônico quando dá — assim
 * "NUBANK", "nubank" e "Nubank" viram a mesma instituição na conciliação.
 */
export function canonizarInstituicao(texto: string): string {
  const limpo = texto.trim();
  if (!limpo) return '';
  const chave = achatar(limpo);
  return INSTITUICOES.find((i) => achatar(i) === chave) ?? limpo;
}

const achatar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bbanco\b/g, '')
    .replace(/[^a-z0-9]/g, '');
