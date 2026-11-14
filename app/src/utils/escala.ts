/**
 * Escala do eixo Y com números redondos.
 *
 * O gráfico antigo dividia a faixa em quartos e rotulava o que caísse:
 * "R$ 668 mil", "R$ 1,3 mi". Ninguém lê uma curva contra 668. Aqui o passo é
 * escolhido primeiro (1, 2 ou 5 vezes uma potência de dez) e a faixa se ajusta
 * a ele — as linhas de grade caem em 200, 400, 600.
 */

export interface Escala {
  lo: number;
  hi: number;
  /** marcas do eixo, em ordem crescente, todas dentro de [lo, hi] */
  ticks: number[];
}

const PASSOS_DECIMAIS = [1, 2, 2.5, 5, 10] as const;

/** Menor passo "redondo" que cabe `alvo` vezes ou menos na faixa. */
function passoRedondo(faixa: number, alvo: number): number {
  const bruto = faixa / alvo;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const fracao = bruto / potencia;
  const escolhido = PASSOS_DECIMAIS.find((p) => p >= fracao - 1e-9) ?? 10;
  return escolhido * potencia;
}

export function escalaLegivel(
  min: number,
  max: number,
  {
    desdeZero = false,
    alvo = 4,
    passos,
  }: {
    desdeZero?: boolean;
    alvo?: number;
    /**
     * Passos permitidos, em ordem crescente, pra eixos que não são decimais.
     * A data FIRE é medida em anos: 0,2 ano não é nada, 0,25 é um trimestre.
     */
    passos?: readonly number[];
  } = {},
): Escala {
  let lo = desdeZero ? Math.min(0, min) : min;
  let hi = max;

  // série constante (ou um ponto só): abre uma faixa em volta pra ter o que desenhar
  if (!(hi > lo)) {
    const folga = Math.abs(hi) > 0 ? Math.abs(hi) * 0.1 : 1;
    lo = desdeZero ? Math.min(0, lo) : lo - folga;
    hi = hi + folga;
  }

  const faixa = hi - lo;
  const passo = passos
    ? (passos.find((p) => faixa / p <= alvo) ?? passos[passos.length - 1]!)
    : passoRedondo(faixa, alvo);

  // a faixa se ajusta ao passo, com uma folga pra linha não encostar na borda
  const folga = passo * 0.15;
  const base = Math.floor((lo - (desdeZero && lo === 0 ? 0 : folga)) / passo) * passo;
  const topo = Math.ceil((hi + folga) / passo) * passo;

  const ticks: number[] = [];
  const n = Math.round((topo - base) / passo);
  for (let k = 0; k <= n; k++) {
    // multiplicar em vez de somar: 0,1 + 0,2 não pode virar 0,30000000000000004 no eixo
    ticks.push(Number((base + k * passo).toPrecision(12)));
  }
  return { lo: base, hi: topo, ticks };
}
