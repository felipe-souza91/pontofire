import { mesesAteFire } from './fire';

/**
 * Por que a data mudou.
 *
 * "Sua data andou 2 meses" sozinho é ansiedade. Com o porquê ao lado vira
 * diagnóstico — e é a diferença entre um app que acusa e um que explica.
 */

export interface EstadoFire {
  patrimonio: number;
  aporte: number;
  /** retorno real MENSAL */
  iMensal: number;
  meta: number;
}

export type FatorFire = 'patrimonio' | 'aporte' | 'retorno' | 'meta';

export const FATORES: readonly FatorFire[] = ['patrimonio', 'aporte', 'retorno', 'meta'];

export interface Contribuicao {
  fator: FatorFire;
  /** meses que este fator sozinho somou (+, adia) ou tirou (−, antecipa) */
  meses: number;
}

export interface Decomposicao {
  /** variação total em meses: depois − antes */
  total: number | null;
  contribuicoes: Contribuicao[];
  /**
   * false quando alguma combinação de fatores não fecha (meta inalcançável) e
   * a atribuição deixa de existir. O app diz "não decomponível" — não inventa.
   */
  completa: boolean;
}

/** Meses até a meta para um estado, ou undefined quando a meta não fecha. */
function avaliar(e: EstadoFire): number | undefined {
  const r = mesesAteFire(e.patrimonio, e.aporte, e.iMensal, e.meta);
  if (r.status === 'inalcancavel') return undefined;
  // 'atingido' devolve 0 e é um valor legítimo: a data é hoje
  return r.meses ?? 0;
}

/** Estado híbrido: os fatores em `troca` vêm de `depois`, o resto de `antes`. */
function misturar(antes: EstadoFire, depois: EstadoFire, troca: ReadonlySet<FatorFire>): EstadoFire {
  return {
    patrimonio: troca.has('patrimonio') ? depois.patrimonio : antes.patrimonio,
    aporte: troca.has('aporte') ? depois.aporte : antes.aporte,
    iMensal: troca.has('retorno') ? depois.iMensal : antes.iMensal,
    meta: troca.has('meta') ? depois.meta : antes.meta,
  };
}

const fatorial = (n: number): number => (n <= 1 ? 1 : n * fatorial(n - 1));

/**
 * Atribui a variação da data a cada fator, pelo VALOR DE SHAPLEY.
 *
 * A alternativa óbvia — trocar uma variável de cada vez, acumulando — depende
 * da ordem escolhida: trocar o custo antes ou depois do aporte dá números
 * diferentes pro mesmo par de estados, e sobra resíduo. Shapley faz a média de
 * todas as ordens possíveis, então é independente de ordem e **soma exatamente**
 * a variação total. Com 4 fatores são 16 avaliações — barato.
 *
 * O motor mede a data em MESES QUE FALTAM. Positivo aqui = a data foi pra
 * frente (piorou); negativo = veio pra trás (melhorou).
 */
export function decomporVariacao(antes: EstadoFire, depois: EstadoFire): Decomposicao {
  const n = FATORES.length;

  // todas as 2^4 coalizões, indexadas por bitmask
  const valor = new Map<number, number>();
  for (let mascara = 0; mascara < 1 << n; mascara++) {
    const troca = new Set<FatorFire>();
    for (let k = 0; k < n; k++) if (mascara & (1 << k)) troca.add(FATORES[k]!);
    const v = avaliar(misturar(antes, depois, troca));
    if (v === undefined) {
      // sem todas as coalizões não há Shapley. Melhor admitir que a atribuição
      // não existe do que devolver números que não somam o total.
      const t0 = avaliar(antes);
      const t1 = avaliar(depois);
      return {
        total: t0 !== undefined && t1 !== undefined ? t1 - t0 : null,
        contribuicoes: [],
        completa: false,
      };
    }
    valor.set(mascara, v);
  }

  const contribuicoes = FATORES.map((fator, k) => {
    const bit = 1 << k;
    let phi = 0;
    for (let mascara = 0; mascara < 1 << n; mascara++) {
      if (mascara & bit) continue; // coalizões SEM o fator
      const tamanho = contarBits(mascara);
      const peso = (fatorial(tamanho) * fatorial(n - tamanho - 1)) / fatorial(n);
      phi += peso * (valor.get(mascara | bit)! - valor.get(mascara)!);
    }
    return { fator, meses: phi };
  });

  return {
    total: valor.get((1 << n) - 1)! - valor.get(0)!,
    contribuicoes,
    completa: true,
  };
}

function contarBits(x: number): number {
  let n = 0;
  for (let v = x; v; v >>= 1) n += v & 1;
  return n;
}

/**
 * Quanto a DATA andou entre duas fotos — não quanto o prazo encurtou.
 *
 * A distinção é o que separa progresso de tempo passando. Se há um ano faltavam
 * 300 meses e hoje faltam 288, nada melhorou: passou um ano. O que interessa é
 * se a data de chegada em si se moveu no calendário.
 *
 * Devolve meses: negativo = antecipou, positivo = adiou, null = sem data em
 * alguma das pontas.
 */
export function variacaoDaData(
  antes: { em: Date; mesesAteFire: number | null },
  depois: { em: Date; mesesAteFire: number | null },
): number | null {
  if (antes.mesesAteFire === null || depois.mesesAteFire === null) return null;
  const mesesCorridos = mesesEntre(antes.em, depois.em);
  return depois.mesesAteFire - (antes.mesesAteFire - mesesCorridos);
}

/** Diferença em meses (fracionária) entre duas datas. */
export function mesesEntre(a: Date, b: Date): number {
  const anos = b.getFullYear() - a.getFullYear();
  const meses = b.getMonth() - a.getMonth();
  const dias = (b.getDate() - a.getDate()) / 30.44;
  return anos * 12 + meses + dias;
}
