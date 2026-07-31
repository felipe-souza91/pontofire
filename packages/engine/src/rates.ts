/**
 * Conversões de taxa de retorno.
 *
 * Regra inegociável (§6): o motor projeta SEMPRE em retorno REAL (já descontada
 * a inflação). Nominal engana sobre a data. Estas funções fazem a ponte de forma
 * COMPOSTA (não subtração ingênua nominal − ipca).
 */

/** Retorno real mensal a partir do real anual: (1 + real)^(1/12) − 1. */
export function realMensalDeAnual(realAnual: number): number {
  return Math.pow(1 + realAnual, 1 / 12) - 1;
}

/** Retorno real anual a partir do mensal (para exibição): (1 + i)^12 − 1. */
export function realAnualDeMensal(iMensal: number): number {
  return Math.pow(1 + iMensal, 12) - 1;
}

/** Real anual a partir do nominal e do IPCA (composto): (1 + nom)/(1 + ipca) − 1. */
export function realDeNominal(nominalAnual: number, ipcaAnual: number): number {
  return (1 + nominalAnual) / (1 + ipcaAnual) - 1;
}

/** Nominal anual a partir do real e do IPCA (composto): (1 + real)(1 + ipca) − 1. */
export function nominalDeReal(realAnual: number, ipcaAnual: number): number {
  return (1 + realAnual) * (1 + ipcaAnual) - 1;
}
