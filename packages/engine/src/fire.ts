/**
 * Fórmulas núcleo do FIRE (§6).
 *
 * Variáveis:
 *   P  patrimônio investível (base do FIRE)   A  aporte mensal
 *   C  custo de vida mensal                    R  renda passiva mensal
 *   i  retorno REAL mensal                      M  número FIRE (meta)
 *   TSS taxa de saque segura (ex. 0,04)
 */

/** Abaixo disto, i é tratado como ~0 e a fórmula log vira o fallback linear. */
export const EPS_I = 1e-7;

/** Número FIRE: M = C × 12 × (1 / TSS). TSS 4% → ×25. */
export function numeroFire(custoVidaMensal: number, tss: number): number {
  if (!(tss > 0)) throw new RangeError('TSS deve ser > 0');
  return (custoVidaMensal * 12) / tss;
}

/** Progresso: P / M (bruto; o consumidor decide se limita a [0,1] na exibição). */
export function progresso(P: number, M: number): number {
  if (!(M > 0)) return 0;
  return P / M;
}

/** Cobertura passiva: R / C — o "1/5 do salário", número viciante. */
export function coberturaPassiva(R: number, C: number): number {
  if (!(C > 0)) return 0;
  return R / C;
}

/** Taxa de poupança: (receita − despesa) / receita. */
export function taxaPoupanca(receita: number, despesa: number): number {
  if (!(receita > 0)) return 0;
  return (receita - despesa) / receita;
}

/** Saque mensal sustentável ao atingir a meta: M × TSS / 12. */
export function saqueMensalSustentavel(M: number, tss: number): number {
  return (M * tss) / 12;
}

/**
 * Valor futuro de um patrimônio P com aportes A por mês (aporte no FIM do mês —
 * annuity-immediate), rendendo i ao mês, após n meses.
 *   VF = P(1+i)^n + A · ((1+i)^n − 1) / i        (i ≠ 0)
 *   VF = P + A·n                                  (i ≈ 0)
 * Útil para projeções/gráficos e para checar mesesAteFire por invariância.
 */
export function valorFuturo(P: number, A: number, i: number, n: number): number {
  if (Math.abs(i) < EPS_I) return P + A * n;
  const g = Math.pow(1 + i, n);
  return P * g + A * ((g - 1) / i);
}

export type ResultadoMeses =
  | { status: 'atingido'; meses: 0 }
  | { status: 'ok'; meses: number }
  | { status: 'inalcancavel' };

/**
 * Meses até a liberdade, resolvendo o VF para n:
 *   n = ln[ (M·i + A) / (P·i + A) ] / ln(1 + i)
 * Fallback i ≈ 0: n = (M − P) / A.
 *
 * Casos honestos (nunca NaN):
 *  - P ≥ M            → 'atingido' (já chegou).
 *  - i≈0 e A ≤ 0      → 'inalcancavel' (sem juros e sem aporte, não sai do lugar).
 *  - fluxo/meta líquida ≤ 0 (retorno real negativo forte, aporte insuficiente)
 *                     → 'inalcancavel'.
 */
export function mesesAteFire(P: number, A: number, i: number, M: number): ResultadoMeses {
  if (P >= M) return { status: 'atingido', meses: 0 };

  if (Math.abs(i) < EPS_I) {
    if (!(A > 0)) return { status: 'inalcancavel' };
    return { status: 'ok', meses: (M - P) / A };
  }

  const numerador = M * i + A;
  const denominador = P * i + A;
  // denom ≤ 0: hoje já se perde mais em retorno real do que se aporta.
  // numer ≤ 0: no nível da meta o retorno real negativo supera o aporte —
  // meta insustentável. Ambos → inalcançável.
  if (!(denominador > 0) || !(numerador > 0)) return { status: 'inalcancavel' };

  const arg = numerador / denominador;
  if (!(arg > 0)) return { status: 'inalcancavel' };

  const n = Math.log(arg) / Math.log(1 + i);
  if (!Number.isFinite(n) || n <= 0) return { status: 'inalcancavel' };

  return { status: 'ok', meses: n };
}

/** Idade ao atingir a liberdade: idadeAtual + n/12. */
export function idadeNaLiberdade(idadeAtual: number, meses: number): number {
  return idadeAtual + meses / 12;
}

/**
 * Data estimada da liberdade a partir de hoje + n meses (fração vira dias
 * proporcionais ao mês de destino). Não muta o Date de entrada.
 */
export function dataFire(hoje: Date, meses: number): Date {
  const d = new Date(hoje.getTime());
  const inteiros = Math.trunc(meses);
  d.setMonth(d.getMonth() + inteiros);
  const frac = meses - inteiros;
  if (frac > 0) {
    const diasNoMesDestino = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(d.getDate() + Math.round(frac * diasNoMesDestino));
  }
  return d;
}
