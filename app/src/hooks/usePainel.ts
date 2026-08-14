import { useMemo } from 'react';
import {
  calcularPlanoFire,
  estadoVigente,
  resumoPatrimonio,
  type EstadoVigente,
  type PlanoFire,
} from '@pontofire/engine';
import type { ContextoInsights } from '@pontofire/insights';
import { useUserDoc } from './useUserDoc';
import { useSnapshots } from './useSnapshots';
import { useAssets } from './useAssets';
import { useTransactions } from './useTransactions';
import type { UserDoc } from '../data/types';
import type { Snapshot } from '../data/snapshots';
import type { AssetDoc } from '../data/assets';

export function idadeDe(dataNascimento?: string): number | undefined {
  if (!dataNascimento) return undefined;
  const d = new Date(dataNascimento);
  if (Number.isNaN(d.getTime())) return undefined;
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade--;
  return idade;
}

export interface Painel {
  carregando: boolean;
  doc: UserDoc | null;
  plano: PlanoFire | null;
  ctx: ContextoInsights | null;
  /** custo, aporte e meta que valem hoje (mediana dos meses lançados) */
  vigente: EstadoVigente | null;
  /** base do FIRE (investido + bens marcados) */
  P: number;
  /** renda passiva mensal (detalhado + aluguéis) */
  R: number;
  /** patrimônio líquido total */
  netWorth: number;
  snapshots: Snapshot[];
  ultimo: Snapshot | null;
  bens: AssetDoc[];
}

/** Reúne os dados do usuário e monta o contexto usado por insights e conquistas. */
export function usePainel(uid: string | null): Painel {
  const { doc, carregando } = useUserDoc(uid);
  const { lista: snapshots } = useSnapshots(uid);
  const { lista: bens } = useAssets(uid);

  const ultimo = snapshots.length ? snapshots[snapshots.length - 1]! : null;
  const { lista: transacoesMes } = useTransactions(uid, ultimo?.mes ?? '');
  const resumoBens = useMemo(() => resumoPatrimonio(bens), [bens]);

  const pBase = ultimo ? ultimo.patrimonioTotal : (doc?.patrimonioInicial ?? 0);
  const P = pBase + resumoBens.patrimonioInvestivel;
  const netWorth = pBase + resumoBens.patrimonioLiquidoTotal;
  const R = (ultimo?.rendaPassiva ?? 0) + resumoBens.rendaPassivaBens;

  /**
   * Custo, aporte e meta que valem hoje — tirados dos meses lançados.
   *
   * Fonte ÚNICA: duas telas resolvendo isso por conta própria dariam duas datas
   * diferentes pro mesmo usuário, e a data é a promessa do produto.
   */
  const vigente = useMemo(
    () => (doc ? estadoVigente(doc, snapshots) : null),
    [doc, snapshots],
  );

  const plano = useMemo(() => {
    if (!doc || !vigente) return null;
    return calcularPlanoFire({
      patrimonioInvestivel: P,
      aporteMensal: vigente.aporte.valor,
      custoVidaMensal: vigente.custo.valor,
      retornoRealAnual: doc.retornoRealEsperado,
      metaFire: vigente.meta,
      tss: doc.taxaSaqueSegura,
      idadeAtual: idadeDe(doc.dataNascimento),
      hoje: new Date(),
    });
  }, [doc, vigente, P]);

  const ctx = useMemo<ContextoInsights | null>(() => {
    if (!doc || !plano || !vigente) return null;
    const C = vigente.custo.valor;
    return {
      apelido: doc.apelido || doc.nome?.split(' ')[0],
      nomeSonho: doc.nomeSonho,
      porQues: doc.porQues,
      custoVidaMensal: C,
      // o que ele digitou no onboarding — vira fallback e ponto de comparação
      custoDeclarado: doc.custoVidaMensal,
      metaFire: vigente.meta,
      aporteMensal: vigente.aporte.valor,
      iMensal: plano.iMensal,
      patrimonioAtual: P,
      progresso: plano.progresso,
      coberturaPassiva: C > 0 ? R / C : 0,
      mesesAteFire: plano.meses,
      statusFire: plano.status,
      idadeAlvo: doc.idadeAlvo,
      idadeAtual: idadeDe(doc.dataNascimento),
      snapshots,
      transacoesMes,
    };
  }, [doc, plano, vigente, P, R, snapshots, transacoesMes]);

  return { carregando, doc, plano, ctx, vigente, P, R, netWorth, snapshots, ultimo, bens };
}
