/**
 * O que o Início tem de verdadeiro pra dizer HOJE.
 *
 * O PROBLEMA
 * O patrimônio do usuário só é conhecido quando ele lança — uma vez por mês.
 * Entre um lançamento e outro, o painel era uma foto: abrir no dia 3 ou no dia
 * 27 mostrava exatamente a mesma tela. Não havia motivo pra voltar.
 *
 * O QUE DÁ PRA DIZER SEM INVENTAR
 * O app não sabe quanto a carteira rendeu hoje, e não finge saber. O que ele
 * sabe é quanto o CDI rendeu desde o último lançamento — dado publicado pelo
 * Banco Central todo dia útil. Então a afirmação é condicional e dita assim:
 * "SE rendeu o CDI, seu patrimônio hoje está em torno de X".
 *
 * Isso vira um ciclo: a régua anda todo dia, e no próximo lançamento o número
 * real aparece ao lado dela. A estimativa é a pergunta; o lançamento, a
 * resposta.
 */

import { acumuladoDesde, ultimoDiaDoMes, type TaxaDoDia } from '@pontofire/engine';

const isoDoDia = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface LancamentoCarimbavel {
  mes: string;
  patrimonioTotal: number;
  patrimonioEm?: string;
}

/**
 * Em que dia o patrimônio deste lançamento foi observado — gravado junto.
 *
 * O mês de competência não basta: quem lança novembro no dia 14 informou o
 * patrimônio do dia 14, não do dia 30. Sem o carimbo, a régua diária contaria
 * a partir do fim do mês (que ainda nem chegou) e ficaria muda.
 *
 * - mês corrente → hoje;
 * - mês passado (retroativo) → o último dia daquele mês;
 * - regravar o mês SEM mexer no patrimônio mantém o carimbo: corrigir a receita
 *   no dia 20 não faz o patrimônio do dia 5 virar do dia 20.
 */
export function carimboDoPatrimonio(
  mes: string,
  patrimonio: number,
  existente: LancamentoCarimbavel | undefined,
  hoje: Date,
): string {
  if (existente?.patrimonioEm && existente.patrimonioTotal === patrimonio) return existente.patrimonioEm;
  const hojeISO = isoDoDia(hoje);
  return mes < hojeISO.slice(0, 7) ? ultimoDiaDoMes(mes) : hojeISO;
}

/**
 * A partir de que dia a régua conta. `null` = não dá pra saber.
 *
 * Lançamento antigo, de antes do carimbo existir: mês fechado vale o último
 * dia; mês corrente não tem como adivinhar o dia, e chutar "dia 1" atribuiria
 * à carteira um rendimento que talvez já estivesse dentro do número digitado.
 */
export function referenciaDoPatrimonio(snap: LancamentoCarimbavel, hoje: Date): string | null {
  const hojeISO = isoDoDia(hoje);
  if (snap.patrimonioEm && /^\d{4}-\d{2}-\d{2}$/.test(snap.patrimonioEm)) {
    return snap.patrimonioEm <= hojeISO ? snap.patrimonioEm : hojeISO;
  }
  return snap.mes < hojeISO.slice(0, 7) ? ultimoDiaDoMes(snap.mes) : null;
}

export interface EstimativaDeHoje {
  /** patrimônio do último lançamento × CDI acumulado desde então */
  valor: number;
  /** quanto o CDI teria somado, em R$ */
  ganho: number;
  /** CDI acumulado no período (0,0046 = 0,46%) */
  acumulado: number;
  diasUteis: number;
  /** dia do patrimônio informado */
  desde: string;
  /** último dia com CDI publicado — a régua vai até aqui */
  ate: string;
}

/**
 * Patrimônio estimado de hoje, pela régua do CDI.
 *
 * Devolve `null` em vez de um número pela metade sempre que a conta não fecha:
 * sem lançamento, sem data de referência, sem dia útil novo, ou quando a série
 * diária começa DEPOIS do lançamento (usuário parado há meses) — nesse caso a
 * régua cobriria só um pedaço do intervalo e subestimaria sem avisar.
 */
export function estimativaDeHoje(
  ultimo: LancamentoCarimbavel | null,
  cdiDiario: readonly TaxaDoDia[],
  hoje: Date,
): EstimativaDeHoje | null {
  if (!ultimo || !(ultimo.patrimonioTotal > 0) || cdiDiario.length === 0) return null;
  const desde = referenciaDoPatrimonio(ultimo, hoje);
  if (!desde) return null;
  if (cdiDiario[0]!.data > desde) return null;

  const { acumulado, diasUteis, ate } = acumuladoDesde(cdiDiario, desde);
  if (diasUteis === 0 || ate === null) return null;

  const ganho = ultimo.patrimonioTotal * acumulado;
  return { valor: ultimo.patrimonioTotal + ganho, ganho, acumulado, diasUteis, desde, ate };
}

/**
 * Por que não há estimativa — pra tela dizer a verdade em vez de um genérico.
 *
 * "Lançamento em dia" quando o Banco Central está fora do ar seria mentira; e
 * "sem régua" pra quem lançou hoje de manhã, também.
 */
export type SemEstimativa = 'sem-lancamento' | 'sem-regua' | 'em-dia' | 'antigo';

export function motivoSemEstimativa(
  ultimo: LancamentoCarimbavel | null,
  cdiDiario: readonly TaxaDoDia[],
  hoje: Date,
): SemEstimativa {
  if (!ultimo || !(ultimo.patrimonioTotal > 0)) return 'sem-lancamento';
  if (cdiDiario.length === 0) return 'sem-regua';
  const desde = referenciaDoPatrimonio(ultimo, hoje);
  if (desde && cdiDiario[0]!.data > desde) return 'antigo';
  return 'em-dia';
}

/** Dias corridos de hoje até a data (0 se já passou). */
export function diasAte(data: Date, hoje: Date): number {
  const zero = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((zero(data) - zero(hoje)) / 86_400_000));
}

/**
 * Quantos dias de um mês de 30 o patrimônio já paga, pra sempre.
 *
 * É o progresso rumo à meta dito na única unidade que todo mundo sente: dias.
 * "12% da meta" é abstrato; "meu dinheiro já paga 3 dias e meio de cada mês
 * meu" não é. A conta é a mesma da regra dos 4% — a renda que o patrimônio
 * sustenta sem se consumir, dividida pelo custo de um dia.
 *
 * A reserva de emergência fica de fora: é dinheiro parado de propósito.
 */
export function diasPagosPorMes(
  patrimonio: number,
  reserva: number,
  taxaSaqueSegura: number,
  custoMensal: number,
): number {
  if (!(custoMensal > 0)) return 0;
  const rendaMensal = (Math.max(0, patrimonio - Math.max(0, reserva)) * taxaSaqueSegura) / 12;
  return Math.min(30, Math.max(0, (rendaMensal / custoMensal) * 30));
}
