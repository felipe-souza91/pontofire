import type { TipoTransacao } from './transactions';
import { CATEGORIA_FATURA, CATEGORIA_TRANSFERENCIA, type AssetTipo } from '@pontofire/engine';
import { ordenar } from '../utils/ordenar';

/**
 * Sugestões conhecidas por tipo de lançamento (o usuário pode digitar outra).
 *
 * Tudo sai em ordem alfabética (pt-BR: "Ações" antes de "Assinaturas", acento
 * não atrapalha) — menos as NEUTRAS, que ficam no fim. Elas rotulam dinheiro
 * que só trocou de bolso; existem pra dar nome ao que o importador já
 * identificou, não pra disputar espaço com "Mercado" e "Delivery" na hora de
 * categorizar o dia a dia.
 */
/** Fatura só faz sentido como despesa; transferência acontece nos dois sentidos. */
const NEUTRAS_SAIDA = [CATEGORIA_FATURA, CATEGORIA_TRANSFERENCIA];
const NEUTRAS = [CATEGORIA_TRANSFERENCIA];

export const CATEGORIAS: Record<TipoTransacao, string[]> = {
  saida: ordenar(
    [
      'Alimentação',
      'Assinaturas',
      'Compras',
      'Contas',
      'Delivery',
      'Educação',
      'Impostos',
      'Lazer',
      'Mercado',
      'Moradia',
      'Outros',
      'Pets',
      'Saúde',
      'Seguros',
      'Transporte',
      'Vestuário',
      'Viagem',
    ],
    NEUTRAS_SAIDA,
  ),
  ativa: ordenar(
    ['13º / férias', 'Bônus', 'Comissões', 'Freelance / PJ', 'Outros', 'Reembolsos', 'Salário'],
    NEUTRAS,
  ),
  passiva: ordenar(['Aluguéis', 'Dividendos', 'FIIs', 'Juros / Renda fixa', 'Outros', 'Royalties']),
  aporte: ordenar(
    [
      'Ações',
      'Cripto',
      'ETFs',
      'FIIs',
      'Fundos',
      'Outros',
      'Previdência',
      'Renda fixa',
      'Tesouro Direto',
    ],
    NEUTRAS,
  ),
};

/** Sugestões de nome por tipo de bem. */
export const NOMES_BEM: Record<AssetTipo, string[]> = {
  financeiro: ordenar(['Corretora', 'Poupança', 'Reserva']),
  'imovel-uso': ordenar(['Apartamento', 'Casa']),
  'imovel-renda': ordenar(['Apartamento alugado', 'Kitnet', 'Sala comercial', 'Sítio']),
  veiculo: ordenar(['Caminhão', 'Carro', 'Moto']),
  outro: ordenar(['Estoque', 'Máquinas', 'Objetos de valor', 'Terreno']),
};

/** Normaliza a categoria digitada: tira espaços e capitaliza a 1ª letra
 *  (evita 'mercado' vs 'Mercado' vs 'MERCADO'). */
export function normalizarCategoria(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
