/**
 * Trazer dinheiro de anos diferentes pra mesma régua.
 *
 * O motor projeta em termos REAIS, então o futuro já está resolvido. O passado
 * não: o patrimônio de cada mês foi digitado em reais daquele mês, e comparar
 * 2026 com 2034 sem deflacionar é comparar coisas diferentes.
 *
 * Onde isso morde: um marco de patrimônio. "R$ 1 milhão" atingido em 2045 não é
 * o mesmo feito que em 2026 — com inflação de 4,5% a.a., basta ficar parado 20
 * anos pra "chegar" lá. Um marco que a inflação entrega sozinha não é marco.
 */

/** Usado quando não há IPCA nenhum disponível. Declarado, não escondido. */
export const IPCA_PADRAO = 0.045;

export interface MesComInflacao {
  mes: string;
  /** IPCA acumulado em 12 meses NAQUELE mês (%/100), quando foi registrado */
  ipca12m?: number;
}

/** Quantos meses inteiros separam dois `YYYY-MM`. Negativo se `b` vem antes. */
export function mesesEntreCompetencias(a: string, b: string): number {
  const [aa, am] = a.split('-').map(Number);
  const [ba, bm] = b.split('-').map(Number);
  return ((ba ?? 0) - (aa ?? 0)) * 12 + ((bm ?? 1) - (am ?? 1));
}

/**
 * Fator que converte dinheiro de HOJE em dinheiro da competência-base.
 *
 * Divide-se o valor nominal por ele. Encadeia o IPCA que cada mês registrou —
 * de `ipca12m`, que é acumulado de 12 meses, tira-se a taxa mensal equivalente.
 * É aproximação (assume que os últimos 12 meses descrevem aquele mês), mas
 * muito melhor que aplicar a taxa de hoje a cinco anos de história.
 *
 * Meses sem registro caem no `ipcaPadrao` — que é o de hoje, quando existe.
 */
export function deflatorDesde(
  base: string,
  ate: string,
  meses: readonly MesComInflacao[],
  ipcaPadrao = IPCA_PADRAO,
): number {
  const total = mesesEntreCompetencias(base, ate);
  if (total <= 0) return 1;

  const porMes = new Map(meses.map((m) => [m.mes, m.ipca12m]));
  const mensalDe = (anual: number) => Math.pow(1 + Math.max(-0.9, anual), 1 / 12) - 1;
  const padraoMensal = mensalDe(ipcaPadrao);

  let fator = 1;
  const [ano, mes] = base.split('-').map(Number);
  for (let k = 0; k < total; k++) {
    const d = new Date(Date.UTC(ano ?? 2026, (mes ?? 1) - 1 + k, 1));
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const registrado = porMes.get(chave);
    fator *= 1 + (typeof registrado === 'number' ? mensalDe(registrado) : padraoMensal);
  }
  return fator;
}

/** Valor nominal de hoje, expresso no poder de compra da competência-base. */
export function emDinheiroDe(
  valorNominal: number,
  base: string,
  ate: string,
  meses: readonly MesComInflacao[],
  ipcaPadrao = IPCA_PADRAO,
): number {
  return valorNominal / deflatorDesde(base, ate, meses, ipcaPadrao);
}
