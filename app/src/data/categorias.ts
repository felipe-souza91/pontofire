import type { TipoTransacao } from './transactions';
import type { AssetTipo } from '@pontofire/engine';

/** Sugestões conhecidas por tipo de lançamento (o usuário pode digitar outra). */
export const CATEGORIAS: Record<TipoTransacao, string[]> = {
  saida: [
    'Moradia',
    'Alimentação',
    'Mercado',
    'Transporte',
    'Saúde',
    'Educação',
    'Lazer',
    'Assinaturas',
    'Delivery',
    'Vestuário',
    'Contas',
    'Impostos',
    'Viagem',
    'Pets',
    'Outros',
  ],
  ativa: ['Salário', 'Freelance / PJ', 'Comissões', 'Bônus', '13º / férias', 'Outros'],
  passiva: ['Aluguéis', 'Dividendos', 'Juros / Renda fixa', 'FIIs', 'Royalties', 'Outros'],
  aporte: ['Renda fixa', 'Tesouro Direto', 'Ações', 'FIIs', 'ETFs', 'Cripto', 'Previdência', 'Fundos', 'Outros'],
};

/** Sugestões de nome por tipo de bem. */
export const NOMES_BEM: Record<AssetTipo, string[]> = {
  financeiro: ['Reserva', 'Corretora', 'Poupança'],
  'imovel-uso': ['Casa', 'Apartamento'],
  'imovel-renda': ['Apartamento alugado', 'Sala comercial', 'Sítio', 'Kitnet'],
  veiculo: ['Carro', 'Moto', 'Caminhão'],
  outro: ['Terreno', 'Máquinas', 'Estoque', 'Objetos de valor'],
};

/** Normaliza a categoria digitada: tira espaços e capitaliza a 1ª letra
 *  (evita 'mercado' vs 'Mercado' vs 'MERCADO'). */
export function normalizarCategoria(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
