import { ehCategoriaNeutra, taxaPoupanca } from '@pontofire/engine';
import type { Transacao } from './transactions';
import type { Snapshot } from './snapshots';

/**
 * O trio do modo rápido.
 *
 * Guardado à parte quando os totais do mês passam a vir dos itens, pra que
 * adotar a soma dos lançamentos seja REVERSÍVEL. Sem isso, apagar os itens
 * depois deixaria o mês preso a números derivados de lançamentos que não
 * existem mais — o pior dos dois mundos.
 */
export interface TrioDeclarado {
  receitaLiquida: number;
  gastoTotal: number;
  aportesMes: number;
  taxaPoupanca: number;
}

export const trioDe = (s: Snapshot): TrioDeclarado => ({
  receitaLiquida: s.receitaLiquida,
  gastoTotal: s.gastoTotal,
  aportesMes: s.aportesMes,
  taxaPoupanca: s.taxaPoupanca,
});

/**
 * Qual trio guardar como caminho de volta ao adotar a soma dos itens.
 *
 * Só a PRIMEIRA adoção grava. Adotar, mexer nos itens e adotar de novo tem que
 * continuar apontando pro número que o usuário digitou — se cada adoção
 * regravasse, a segunda arquivaria a primeira derivada e o modo rápido dele se
 * perderia sem aviso.
 */
export function trioAPreservar(snap: Snapshot): TrioDeclarado {
  return snap.declarado ?? trioDe(snap);
}

/**
 * A aritmética da reconciliação, separada da tela.
 *
 * Mora aqui porque já errou uma vez: quando as categorias neutras nasceram, o
 * insights passou a ignorá-las e esta soma não — e o card acusou um rombo de
 * milhares de reais contra o total declarado que nunca existiu. Regra que tem
 * duas implementações tem duas verdades; esta é a única.
 */

export interface SomaItens {
  ativa: number;
  passiva: number;
  aporte: number;
  saida: number;
  /** fatura, transferência: dinheiro que só mudou de bolso */
  neutro: number;
}

export function somarItens(itens: readonly Transacao[]): SomaItens {
  const s: SomaItens = { ativa: 0, passiva: 0, aporte: 0, saida: 0, neutro: 0 };
  for (const it of itens) {
    if (ehCategoriaNeutra(it.categoria)) s.neutro += it.valor;
    else s[it.tipo] += it.valor;
  }
  return s;
}

/**
 * O mês como os lançamentos o descrevem — a alternativa ao trio declarado.
 *
 * O APORTE É OBSERVADO, NÃO DERIVADO.
 *
 * No modo rápido, `receita − despesa` é um proxy do aporte: assume que tudo que
 * sobrou foi investido. Quando existem lançamentos de aporte, o proxy vira
 * mentira — o valor real está ali, marcado um por um. Derivar mesmo assim
 * produzia o absurdo de um aporte de −R$ 849,78 no mesmo mês em que os itens
 * registravam R$ 2.000 entrando na carteira, e a linha da reconciliação
 * comparava as duas coisas como se fossem a mesma.
 *
 * Isso importa além da tela: `rendimentoMes = P − P_anterior − aportesMes`. Com
 * o aporte errado, todo o rendimento por marcação a mercado sai errado junto.
 */
export function totaisDosItens(soma: SomaItens): TrioDeclarado {
  const receitaLiquida = soma.ativa + soma.passiva;
  const gastoTotal = soma.saida;
  return {
    receitaLiquida,
    gastoTotal,
    aportesMes: soma.aporte > 0 ? soma.aporte : receitaLiquida - gastoTotal,
    taxaPoupanca: taxaPoupanca(receitaLiquida, gastoTotal),
  };
}

/**
 * O que os lançamentos NÃO explicam: `receita − despesa − aporte`.
 *
 * Negativo significa que saiu mais do que entrou pelos itens — ou faltou
 * importar uma receita, ou o aporte veio de saldo que já existia. Positivo
 * significa dinheiro que sobrou e não foi apontado como aporte. Nos dois casos
 * é informação, não erro: some quando o mês fecha.
 */
export function residualDosItens(soma: SomaItens): number {
  return soma.ativa + soma.passiva - soma.saida - soma.aporte;
}

/**
 * Adotar a soma dos itens só faz sentido com itens na tela.
 *
 * Sem esta guarda, um clique com a lista vazia (ou ainda carregando) grava um
 * mês de zeros e arquiva o trio digitado como "caminho de volta" — o usuário
 * perde os 3 números e ganha um mês que não existiu.
 */
export function podeAdotarItens(quantidadeDeItens: number, carregando: boolean): boolean {
  return !carregando && quantidadeDeItens > 0;
}

/** Centavo de diferença é arredondamento, não divergência. */
const TOLERANCIA = 1;

export function divergiu(snap: Snapshot, totais: TrioDeclarado): boolean {
  return (
    Math.abs(totais.receitaLiquida - snap.receitaLiquida) > TOLERANCIA ||
    Math.abs(totais.gastoTotal - snap.gastoTotal) > TOLERANCIA
  );
}

/** Mês sem lançamento nenhum volta a valer pelos 3 números do modo rápido. */
export function deveVoltarAoDeclarado(
  snap: Snapshot,
  quantidadeDeItens: number,
  carregando: boolean,
): boolean {
  return !carregando && quantidadeDeItens === 0 && snap.declarado !== undefined;
}
