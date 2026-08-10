import { ordenar } from '../utils/ordenar';

/**
 * Instituições financeiras mais usadas no Brasil.
 *
 * Serve só de sugestão no campo do import — o usuário pode digitar qualquer
 * coisa. O valor de padronizar o nome é a conciliação: "o outro lado está no
 * extrato do Bradesco" só sai bonito se ele escreveu "Bradesco" nas duas vezes,
 * e não "bradesco" numa e "Banco Bradesco" na outra.
 *
 * Ordem alfabética pt-BR: a lista é longa demais pra procurar de olho sem ela.
 */
export const INSTITUICOES: readonly string[] = ordenar([
  'Agibank',
  'Ágora',
  'Amex',
  'Avenue',
  'Banco BV',
  'Banco do Brasil',
  'Banco Pan',
  'Banrisul',
  'Bradesco',
  'BRB',
  'BTG Pactual',
  'C6 Bank',
  'Caixa',
  'Cartão Elo',
  'Clear',
  'Credicard',
  'Digio',
  'Genial',
  'Inter',
  'Itaú',
  'Mercado Pago',
  'Modalmais',
  'Neon',
  'Next',
  'Nomad',
  'Nubank',
  'Original',
  'PagBank',
  'PicPay',
  'Porto Seguro',
  'Rico',
  'Safra',
  'Santander',
  'Sicoob',
  'Sicredi',
  'Stone',
  'Toro',
  'Warren',
  'Will Bank',
  'XP Investimentos',
]);

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
