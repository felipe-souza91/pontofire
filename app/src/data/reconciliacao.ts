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

/** O mês como os lançamentos o descrevem — a alternativa ao trio declarado. */
export function totaisDosItens(soma: SomaItens): TrioDeclarado {
  const receitaLiquida = soma.ativa + soma.passiva;
  const gastoTotal = soma.saida;
  return {
    receitaLiquida,
    gastoTotal,
    aportesMes: receitaLiquida - gastoTotal,
    taxaPoupanca: taxaPoupanca(receitaLiquida, gastoTotal),
  };
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
