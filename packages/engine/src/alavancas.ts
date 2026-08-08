/**
 * Motor reverso — "o que eu faço pra chegar aos 55?".
 *
 * O motor normal responde QUANDO. Este responde O QUE MUDAR: dado um prazo
 * desejado, calcula quanto seria preciso em cada alavanca, uma de cada vez
 * (todas as outras seguram o valor de hoje).
 *
 * Invariante testado: aplicar a resposta de qualquer alavanca em
 * `mesesAteFire` devolve exatamente o prazo pedido.
 *
 * Honestidade (§6/§14): a resposta pode ser "não dá", e aí ela é dita. Nenhuma
 * alavanca é apresentada como conselho — são as contas, não recomendações.
 */

import { EPS_I, mesesAteFire, numeroFire, valorFuturo } from './fire';
import { realMensalDeAnual } from './rates';

export type StatusAlavanca =
  /** já está atendida com os números de hoje */
  | 'desnecessaria'
  /** existe um valor que resolve, dentro do razoável */
  | 'possivel'
  /**
   * existe resposta, mas ela deixou de ser um ajuste e virou outra vida (ou
   * outro nível de risco). A conta é dita mesmo assim — quem decide é o dono.
   */
  | 'drastica'
  /** não existe valor que resolva */
  | 'impossivel';

export interface Alavanca {
  status: StatusAlavanca;
  /** o valor que a alavanca precisaria ter (R$/mês, taxa real anual, R$) */
  alvo: number;
  /** quanto muda em relação a hoje — sempre ≥ 0 (aumento ou corte) */
  delta: number;
}

export interface EntradaAlavancas {
  /** P — patrimônio investível hoje */
  patrimonio: number;
  /** A — aporte mensal de hoje */
  aporteMensal: number;
  /** C — custo de vida mensal de hoje */
  custoVidaMensal: number;
  /** M — meta atual */
  metaFire: number;
  /** i — retorno REAL mensal de hoje */
  iMensal: number;
  /** prazo desejado, em meses */
  mesesAlvo: number;
}

export interface Alavancas {
  /** quanto precisaria aportar por mês, mantendo o resto igual */
  aporte: Alavanca;
  /**
   * até quanto precisaria baixar o custo de vida. Alavanca dupla: o que deixa
   * de ser gasto vira aporte E a meta cai junto (você precisa de menos).
   */
  gasto: Alavanca;
  /** que retorno REAL anual precisaria — a alavanca que não se controla */
  retorno: Alavanca;
  /** quanto precisaria ter investido hoje, mantendo o aporte atual */
  patrimonio: Alavanca;
  /** meses até a liberdade fazendo METADE do aumento de aporte */
  mesesComMetadeDoAporte: number | null;
}

/** Teto de busca do retorno real anual: acima disso não é plano, é aposta. */
const RETORNO_MAX = 0.3;
/** Iterações da bisseção — 60 dá precisão bem além do centavo. */
const ITERACOES = 60;

/**
 * Limiares do "drástica". Não são regras de finanças, são régua de conversa:
 * acima deles a resposta continua correta, mas parar na conta seria desonesto.
 */
/** cortar mais de 30% do padrão de vida não é apertar o cinto, é outra vida */
const CORTE_DRASTICO = 0.3;
/** o dobro do juro real histórico do Brasil (~5-6% a.a.) */
const RETORNO_DRASTICO = 0.12;

// ---------------------------------------------------------------------------
// alavancas isoladas

/**
 * Aporte necessário — fórmula fechada, invertendo o valor futuro:
 *   VF = P(1+i)^n + A·((1+i)^n − 1)/i = M
 *   ⇒ A = i·(M − P·(1+i)^n) / ((1+i)^n − 1)
 * Fallback i ≈ 0: A = (M − P)/n.
 */
export function aporteNecessario(P: number, M: number, i: number, n: number): number {
  if (!(n > 0)) return Infinity;
  if (P >= M) return 0;
  if (Math.abs(i) < EPS_I) return Math.max(0, (M - P) / n);

  const g = Math.pow(1 + i, n);
  const semAporte = P * g;
  if (semAporte >= M) return 0; // os juros sozinhos já chegam no prazo
  return (i * (M - semAporte)) / (g - 1);
}

/**
 * Patrimônio que precisaria existir hoje, mantendo o aporte atual:
 *   P = (M − A·((1+i)^n − 1)/i) / (1+i)^n
 */
export function patrimonioNecessario(A: number, M: number, i: number, n: number): number {
  if (!(n > 0)) return M;
  if (Math.abs(i) < EPS_I) return Math.max(0, M - A * n);
  const g = Math.pow(1 + i, n);
  return Math.max(0, (M - (A * (g - 1)) / i) / g);
}

/**
 * Retorno REAL anual necessário. Não tem forma fechada (o n aparece no
 * expoente e na anuidade), então é bisseção — o valor futuro é monótono
 * crescente em i, o que garante convergência.
 *
 * Devolve null quando nem o teto de 30% real ao ano resolve.
 */
export function retornoNecessario(P: number, A: number, M: number, n: number): number | null {
  if (!(n > 0)) return null;
  const vf = (anual: number) => valorFuturo(P, A, realMensalDeAnual(anual), n);

  if (vf(0) >= M) return 0; // sem render nada já dá
  if (vf(RETORNO_MAX) < M) return null;

  let lo = 0;
  let hi = RETORNO_MAX;
  for (let k = 0; k < ITERACOES; k++) {
    const meio = (lo + hi) / 2;
    if (vf(meio) < M) lo = meio;
    else hi = meio;
  }
  return (lo + hi) / 2;
}

/**
 * Custo de vida necessário — a alavanca de efeito duplo.
 *
 * Cortar R$ 1 de gasto (1) libera R$ 1 pro aporte, porque a renda não mudou,
 * e (2) derruba a meta, porque você passa a precisar sustentar menos. A meta
 * cai proporcional ao corte: quem vive com 10% menos precisa de 10% menos
 * patrimônio pra sustentar o mesmo padrão.
 *
 * Como as duas pontas andam no mesmo sentido, a função é monótona em C e a
 * bisseção é segura.
 *
 * Cuidado ao ler o resultado: como a meta encolhe junto, quase SEMPRE existe
 * um custo que fecha a conta — inclusive um absurdo. Por isso o `null` aqui é
 * raro e quem julga se a resposta é vivível é `alavancasParaAlvo`, pelo
 * tamanho do corte.
 */
export function custoNecessario(
  P: number,
  A: number,
  C: number,
  M: number,
  i: number,
  n: number,
): number | null {
  if (!(n > 0) || !(C > 0) || !(M > 0)) return null;

  // sobra ao fim do prazo, cortando o custo para c
  const folga = (c: number) => valorFuturo(P, A + (C - c), i, n) - M * (c / C);

  if (folga(C) >= 0) return C; // não precisa cortar nada
  if (folga(0) < 0) return null; // nem zerando o custo de vida dá

  let lo = 0;
  let hi = C;
  for (let k = 0; k < ITERACOES; k++) {
    const meio = (lo + hi) / 2;
    if (folga(meio) >= 0) lo = meio;
    else hi = meio;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------------------
// pacote completo

/** Roda as quatro alavancas de uma vez, cada uma com as outras congeladas. */
export function alavancasParaAlvo(e: EntradaAlavancas): Alavancas {
  const { patrimonio: P, aporteMensal: A, custoVidaMensal: C, metaFire: M, iMensal: i, mesesAlvo: n } = e;

  // --- aporte
  const aAlvo = aporteNecessario(P, M, i, n);
  let aporte: Alavanca;
  if (!Number.isFinite(aAlvo)) {
    aporte = { status: 'impossivel', alvo: Infinity, delta: Infinity };
  } else if (aAlvo <= A) {
    aporte = { status: 'desnecessaria', alvo: A, delta: 0 };
  } else {
    // aportar mais do que se gasta pra viver é taxa de poupança > 50%
    aporte = { status: C > 0 && aAlvo > C ? 'drastica' : 'possivel', alvo: aAlvo, delta: aAlvo - A };
  }

  // --- gasto
  const cAlvo = custoNecessario(P, A, C, M, i, n);
  let gasto: Alavanca;
  if (cAlvo === null) {
    gasto = { status: 'impossivel', alvo: 0, delta: C };
  } else if (cAlvo >= C - 0.005) {
    gasto = { status: 'desnecessaria', alvo: C, delta: 0 };
  } else {
    const corte = C - cAlvo;
    const proporcao = C > 0 ? corte / C : 1;
    gasto = { status: proporcao > CORTE_DRASTICO ? 'drastica' : 'possivel', alvo: cAlvo, delta: corte };
  }

  // --- retorno (a alavanca que não se controla)
  const rAtual = Math.pow(1 + i, 12) - 1;
  const rAlvo = retornoNecessario(P, A, M, n);
  const retorno: Alavanca =
    rAlvo === null
      ? { status: 'impossivel', alvo: RETORNO_MAX, delta: RETORNO_MAX - rAtual }
      : rAlvo <= rAtual
        ? { status: 'desnecessaria', alvo: rAtual, delta: 0 }
        : {
            status: rAlvo > RETORNO_DRASTICO ? 'drastica' : 'possivel',
            alvo: rAlvo,
            delta: rAlvo - rAtual,
          };

  // --- patrimônio hoje
  const pAlvo = patrimonioNecessario(A, M, i, n);
  const patrimonio: Alavanca =
    pAlvo <= P
      ? { status: 'desnecessaria', alvo: P, delta: 0 }
      : { status: 'possivel', alvo: pAlvo, delta: pAlvo - P };

  // --- e se fizer só metade do esforço do aporte?
  let mesesComMetadeDoAporte: number | null = null;
  if ((aporte.status === 'possivel' || aporte.status === 'drastica') && Number.isFinite(aporte.delta)) {
    const r = mesesAteFire(P, A + aporte.delta / 2, i, M);
    if (r.status === 'ok') mesesComMetadeDoAporte = r.meses;
    else if (r.status === 'atingido') mesesComMetadeDoAporte = 0;
  }

  return { aporte, gasto, retorno, patrimonio, mesesComMetadeDoAporte };
}

/**
 * Meta que sobra ao cortar o custo — o consumidor precisa disto pra mostrar
 * "sua meta cairia de X pra Y", que é metade do valor da alavanca do gasto.
 */
export function metaComCusto(metaAtual: number, custoAtual: number, custoNovo: number): number {
  if (!(custoAtual > 0)) return metaAtual;
  return metaAtual * (custoNovo / custoAtual);
}

/** Conveniência: a meta pela regra dos 25× para um custo qualquer. */
export function metaPelaRegra(custoMensal: number, tss: number): number {
  return numeroFire(custoMensal, tss);
}
