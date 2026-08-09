/**
 * Cenários "e se" e insights (§6). O motor deve revelar a verdade mesmo quando
 * é anticlímax (cortar R$50/mês adianta ~meio mês) — isso gera confiança.
 */

import { mesesAteFire, type ResultadoMeses } from './fire';

export interface ParametrosFire {
  P: number;
  A: number;
  i: number;
  M: number;
}

/**
 * Custo de liberdade de um gasto pontual x: quanto ele "custa" no futuro se
 * fosse investido pelos meses restantes até a meta.
 *   valorPerdido = x × (1 + i)^mesesRestantes
 */
export function custoDeLiberdade(gastoPontual: number, i: number, mesesRestantes: number): number {
  return gastoPontual * Math.pow(1 + i, mesesRestantes);
}

/**
 * CoastFIRE: patrimônio que, sozinho (sem novos aportes), chega à meta só com
 * juros até a idade-alvo.  P_coast = M / (1 + i)^mesesAteIdadeAlvo.
 */
export function patrimonioCoast(M: number, i: number, mesesAteIdadeAlvo: number): number {
  return M / Math.pow(1 + i, mesesAteIdadeAlvo);
}

/** Já atingiu o CoastFIRE? (pode parar de aportar e ainda chega na meta). */
export function jaEhCoastFire(P: number, M: number, i: number, mesesAteIdadeAlvo: number): boolean {
  return P >= patrimonioCoast(M, i, mesesAteIdadeAlvo);
}

export interface ImpactoCenario {
  antes: ResultadoMeses;
  depois: ResultadoMeses;
  /** meses antecipados (positivo = adianta). null se algum lado é inalcançável. */
  deltaMeses: number | null;
}

function delta(antes: ResultadoMeses, depois: ResultadoMeses): number | null {
  if (antes.status === 'inalcancavel' || depois.status === 'inalcancavel') return null;
  return antes.meses - depois.meses;
}

/**
 * Impacto de cortar um gasto e virar aporte: A' = A + gastoCortadoMensal.
 * Retorna a data antes/depois e quantos meses antecipa.
 */
export function impactoAporteExtra(base: ParametrosFire, gastoCortadoMensal: number): ImpactoCenario {
  const antes = mesesAteFire(base.P, base.A, base.i, base.M);
  const depois = mesesAteFire(base.P, base.A + gastoCortadoMensal, base.i, base.M);
  return { antes, depois, deltaMeses: delta(antes, depois) };
}

/** Impacto de um retorno real diferente (i' > i, por ex.). */
export function impactoRetorno(base: ParametrosFire, novoI: number): ImpactoCenario {
  const antes = mesesAteFire(base.P, base.A, base.i, base.M);
  const depois = mesesAteFire(base.P, base.A, novoI, base.M);
  return { antes, depois, deltaMeses: delta(antes, depois) };
}
