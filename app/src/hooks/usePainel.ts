import { useMemo } from 'react';
import { calcularPlanoFire, metaVigente, resumoPatrimonio, type PlanoFire } from '@pontofire/engine';
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

  const plano = useMemo(() => {
    if (!doc) return null;
    return calcularPlanoFire({
      patrimonioInvestivel: P,
      aporteMensal: doc.aporteMensal,
      custoVidaMensal: doc.custoVidaMensal,
      retornoRealAnual: doc.retornoRealEsperado,
      metaFire: metaVigente(doc),
      tss: doc.taxaSaqueSegura,
      idadeAtual: idadeDe(doc.dataNascimento),
      hoje: new Date(),
    });
  }, [doc, P]);

  const ctx = useMemo<ContextoInsights | null>(() => {
    if (!doc || !plano) return null;
    return {
      apelido: doc.apelido || doc.nome?.split(' ')[0],
      nomeSonho: doc.nomeSonho,
      porQues: doc.porQues,
      custoVidaMensal: doc.custoVidaMensal,
      metaFire: metaVigente(doc),
      aporteMensal: doc.aporteMensal,
      iMensal: plano.iMensal,
      patrimonioAtual: P,
      progresso: plano.progresso,
      coberturaPassiva: doc.custoVidaMensal > 0 ? R / doc.custoVidaMensal : 0,
      mesesAteFire: plano.meses,
      statusFire: plano.status,
      idadeAlvo: doc.idadeAlvo,
      idadeAtual: idadeDe(doc.dataNascimento),
      snapshots,
      transacoesMes,
    };
  }, [doc, plano, P, R, snapshots, transacoesMes]);

  return { carregando, doc, plano, ctx, P, R, netWorth, snapshots, ultimo, bens };
}
