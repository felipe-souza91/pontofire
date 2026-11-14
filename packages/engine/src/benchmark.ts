/**
 * Comparação da carteira com as réguas do mercado (CDI e IPCA).
 *
 * A PERGUNTA QUE ISTO RESPONDE
 * "Meu patrimônio cresceu" não diz nada: ele cresce só de você aportar. A
 * pergunta honesta é "o que o MEU DINHEIRO fez, descontado o que eu coloquei?"
 * — e, em seguida, "isso foi mais ou menos do que ele faria parado no CDI?".
 *
 * DUAS FERRAMENTAS, DOIS USOS
 *
 * 1. `carteiraSombra` — pro gráfico. Refaz a sua história com os MESMOS aportes
 *    nas MESMAS datas, só que rendendo a régua. Comparar patrimônio contra um
 *    índice puro seria injusto pros dois lados: o índice não recebeu seus
 *    aportes. A sombra recebe.
 *
 * 2. `rentabilidade` — pro número. Retorno ponderado pelo tempo: encadeia o
 *    retorno de cada mês, o que tira o efeito do tamanho e da data dos aportes.
 *    É a conta que os fundos publicam, e é a única que pode ser posta ao lado
 *    do CDI acumulado sem mentir.
 *
 * A APROXIMAÇÃO, DITA COM TODAS AS LETRAS
 * O app conhece o patrimônio uma vez por mês e trata o aporte como feito no FIM
 * do mês (mesma convenção do resto do motor). Quem aporta no dia 5 tem ~25 dias
 * de rendimento desse aporte atribuídos à carteira antiga — o retorno do mês
 * sai levemente superestimado. Some na escala de um ano; num mês isolado, não.
 * Por isso o número é apresentado como aproximação, e nunca com duas casas.
 */

/** Um mês da carteira, do jeito que o lançamento mensal o conhece. */
export interface MesDeCarteira {
  /** YYYY-MM */
  mes: string;
  /** patrimônio no fechamento do mês */
  patrimonio: number;
  /** quanto entrou na carteira no mês */
  aporte: number;
}

/** Taxa do mês em decimal (0,0105 = 1,05%), por competência `YYYY-MM`. */
export type TaxasPorMes = Readonly<Record<string, number>>;

/** `'2026-11'` → `'2026-12'`; `'2026-12'` → `'2027-01'`. */
export function mesSeguinte(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  const ano = a ?? 0;
  const numero = m ?? 1;
  return numero >= 12 ? `${ano + 1}-01` : `${ano}-${String(numero + 1).padStart(2, '0')}`;
}

/** Meses em `(de, ate]` — exclui o de partida, inclui o de chegada. */
export function mesesNoIntervalo(de: string, ate: string): string[] {
  const out: string[] = [];
  // trava de segurança: `ate` anterior a `de` não pode virar laço infinito
  for (let m = mesSeguinte(de), k = 0; m <= ate && k < 1200; m = mesSeguinte(m), k++) out.push(m);
  return out;
}

/**
 * Fator acumulado da régua em `(de, ate]`. `null` se faltar a taxa de algum
 * mês — o IPCA de um mês só sai por volta do dia 10 do seguinte, então o
 * último ponto da régua costuma ficar em aberto. Inventar essa taxa pra fechar
 * a linha seria desenhar dado que não existe.
 */
export function fatorNoIntervalo(taxas: TaxasPorMes, de: string, ate: string): number | null {
  let fator = 1;
  for (const m of mesesNoIntervalo(de, ate)) {
    const t = taxas[m];
    if (typeof t !== 'number' || !Number.isFinite(t)) return null;
    fator *= 1 + t;
  }
  return fator;
}

/**
 * A sua história, com os mesmos aportes, rendendo a régua.
 *
 * Parte do patrimônio do primeiro mês e, a cada mês seguinte, rende a régua e
 * recebe o aporte que você de fato fez. Devolve um valor por mês de entrada;
 * `null` dali em diante quando a régua não tem taxa publicada.
 *
 * Mês pulado (lançou setembro e novembro, não outubro) não quebra: a régua
 * compõe os dois meses do intervalo, e o aporte de novembro entra no fim.
 */
export function carteiraSombra(meses: readonly MesDeCarteira[], taxas: TaxasPorMes): (number | null)[] {
  const out: (number | null)[] = [];
  let valor: number | null = null;
  meses.forEach((m, i) => {
    if (i === 0) {
      valor = m.patrimonio;
    } else if (valor !== null) {
      const fator = fatorNoIntervalo(taxas, meses[i - 1]!.mes, m.mes);
      valor = fator === null ? null : valor * fator + m.aporte;
    }
    out.push(valor);
  });
  return out;
}

/**
 * Retorno da carteira entre dois lançamentos: tudo que o patrimônio andou além
 * do que entrou de aporte. `null` sobre patrimônio zerado — retorno sobre zero
 * não é número.
 */
export function retornoEntre(anterior: MesDeCarteira, atual: MesDeCarteira): number | null {
  if (!(anterior.patrimonio > 0)) return null;
  return (atual.patrimonio - atual.aporte) / anterior.patrimonio - 1;
}

export interface Rentabilidade {
  /** competência de partida (o retorno começa a contar DEPOIS dela) */
  de: string;
  /** competência de chegada */
  ate: string;
  /** meses de calendário cobertos */
  meses: number;
  /** retorno acumulado da carteira, ponderado pelo tempo (0,11 = 11%) */
  carteira: number;
  /** régua acumulada no mesmo período; `null` se faltou taxa */
  cdi: number | null;
  ipca: number | null;
  /** carteira ÷ CDI — o "104% do CDI" que todo extrato mostra */
  percentualDoCdi: number | null;
  /** retorno acima da inflação, acumulado */
  realAcumulado: number | null;
  /**
   * Retorno real ao ano. Só existe com 12 meses ou mais: anualizar três meses
   * é elevar ruído à quarta potência e chamar de taxa.
   */
  realAnual: number | null;
}

/** Abaixo disto, "ao ano" é extrapolação — o número fica `null`. */
export const MESES_PRA_ANUALIZAR = 12;

/**
 * Retorno da carteira ponderado pelo tempo, ao lado do CDI e do IPCA.
 *
 * O retorno de cada mês é `(P − aporte) ÷ P_anterior − 1`: tudo que o
 * patrimônio andou além do que você colocou. Encadear esses retornos (em vez
 * de dividir ganho total por saldo) é o que faz um aporte grande em dezembro
 * não parecer rentabilidade.
 *
 * `null` quando não há par de meses utilizável (menos de dois lançamentos, ou
 * patrimônio de partida zerado — retorno sobre zero não é número).
 *
 * Quando a régua do último mês ainda não foi publicada, o período todo recua
 * pro último mês em que carteira E réguas existem. Comparar 14 meses de
 * carteira com 13 de inflação daria vantagem de graça pra carteira.
 */
export function rentabilidade(
  meses: readonly MesDeCarteira[],
  reguas: { cdi: TaxasPorMes; ipca: TaxasPorMes },
): Rentabilidade | null {
  if (meses.length < 2) return null;

  // recua o fim até um mês em que as duas réguas fechem
  let fim = meses.length - 1;
  while (fim > 0) {
    const de = meses[0]!.mes;
    const ate = meses[fim]!.mes;
    if (fatorNoIntervalo(reguas.cdi, de, ate) !== null && fatorNoIntervalo(reguas.ipca, de, ate) !== null) break;
    fim--;
  }
  // nenhuma régua fecha em período nenhum: devolve só a carteira, no período todo
  const semRegua = fim === 0;
  if (semRegua) fim = meses.length - 1;

  let fator = 1;
  let pares = 0;
  for (let i = 1; i <= fim; i++) {
    const anterior = meses[i - 1]!.patrimonio;
    if (!(anterior > 0)) continue;
    fator *= (meses[i]!.patrimonio - meses[i]!.aporte) / anterior;
    pares++;
  }
  if (pares === 0 || !Number.isFinite(fator) || fator <= 0) return null;

  const de = meses[0]!.mes;
  const ate = meses[fim]!.mes;
  const n = mesesNoIntervalo(de, ate).length;
  const fCdi = semRegua ? null : fatorNoIntervalo(reguas.cdi, de, ate);
  const fIpca = semRegua ? null : fatorNoIntervalo(reguas.ipca, de, ate);

  const carteira = fator - 1;
  const cdi = fCdi === null ? null : fCdi - 1;
  const ipca = fIpca === null ? null : fIpca - 1;
  const realAcumulado = fIpca === null ? null : fator / fIpca - 1;

  return {
    de,
    ate,
    meses: n,
    carteira,
    cdi,
    ipca,
    // "% do CDI" só faz sentido com CDI positivo — e ele sempre é, mas uma
    // série quebrada não pode virar divisão por zero na tela
    percentualDoCdi: cdi !== null && cdi > 0 ? carteira / cdi : null,
    realAcumulado,
    realAnual:
      realAcumulado !== null && n >= MESES_PRA_ANUALIZAR
        ? Math.pow(1 + realAcumulado, 12 / n) - 1
        : null,
  };
}

/** Uma taxa diária publicada (CDI de um dia útil). */
export interface TaxaDoDia {
  /** YYYY-MM-DD */
  data: string;
  /** decimal ao dia (0,00052 = 0,052% a.d.) */
  taxa: number;
}

export interface AcumuladoDiario {
  /** fator − 1 no período */
  acumulado: number;
  diasUteis: number;
  /** último dia com taxa publicada — a régua vai até aqui, não até "hoje" */
  ate: string | null;
}

/**
 * Régua diária acumulada DEPOIS de `desde` (exclusive).
 *
 * É o que faz o painel ter algo verdadeiro pra dizer num dia qualquer do mês:
 * o patrimônio só é conhecido no fechamento, mas o CDI anda todo dia útil.
 */
export function acumuladoDesde(taxas: readonly TaxaDoDia[], desde: string): AcumuladoDiario {
  let fator = 1;
  let diasUteis = 0;
  let ate: string | null = null;
  for (const t of taxas) {
    if (t.data <= desde || !Number.isFinite(t.taxa)) continue;
    fator *= 1 + t.taxa;
    diasUteis++;
    if (ate === null || t.data > ate) ate = t.data;
  }
  return { acumulado: fator - 1, diasUteis, ate };
}

/** Último dia do mês de competência: `'2026-10'` → `'2026-10-31'`. */
export function ultimoDiaDoMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a ?? 0, m ?? 1, 0); // dia 0 do mês seguinte
  return `${mes}-${String(d.getDate()).padStart(2, '0')}`;
}
