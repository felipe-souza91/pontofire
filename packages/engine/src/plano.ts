/**
 * Plano FIRE de alto nível — amarra as fórmulas núcleo numa entrada/saída
 * pronta para o dashboard (§4/M3). Recebe retorno REAL anual e converte.
 */

import { realMensalDeAnual } from './rates';
import {
  numeroFire,
  progresso,
  coberturaPassiva,
  mesesAteFire,
  saqueMensalSustentavel,
  idadeNaLiberdade,
  dataFire,
} from './fire';

export interface EntradaPlano {
  /** P — patrimônio investível (base do FIRE) */
  patrimonioInvestivel: number;
  /** A — aporte mensal */
  aporteMensal: number;
  /** C — custo de vida mensal */
  custoVidaMensal: number;
  /** R — renda passiva mensal atual (default 0) */
  rendaPassivaMensal?: number;
  /** TSS — taxa de saque segura (default 0,04) */
  tss?: number;
  /** retorno REAL anual esperado (ex. 0,05) */
  retornoRealAnual: number;
  /** meta FIRE (M) explícita; se ausente, deriva de C×12/TSS */
  metaFire?: number;
  /** idade atual (para estimar idade na liberdade) */
  idadeAtual?: number;
  /** data-base (default: agora) — injetável para testes determinísticos */
  hoje?: Date;
}

export interface PlanoFire {
  numeroFire: number;
  progresso: number;
  coberturaPassiva: number;
  iMensal: number;
  status: 'atingido' | 'ok' | 'inalcancavel';
  meses: number | null;
  anos: number | null;
  dataLiberdade: Date | null;
  idadeNaLiberdade: number | null;
  saqueMensalSustentavel: number;
}

export function calcularPlanoFire(e: EntradaPlano): PlanoFire {
  const tss = e.tss ?? 0.04;
  const R = e.rendaPassivaMensal ?? 0;
  const hoje = e.hoje ?? new Date();

  const M = e.metaFire ?? numeroFire(e.custoVidaMensal, tss);
  const iMensal = realMensalDeAnual(e.retornoRealAnual);
  const res = mesesAteFire(e.patrimonioInvestivel, e.aporteMensal, iMensal, M);

  let meses: number | null = null;
  let anos: number | null = null;
  let dataLiberdade: Date | null = null;
  let idade: number | null = null;

  if (res.status !== 'inalcancavel') {
    meses = res.meses;
    anos = meses / 12;
    dataLiberdade = dataFire(hoje, meses);
    if (e.idadeAtual !== undefined) idade = idadeNaLiberdade(e.idadeAtual, meses);
  }

  return {
    numeroFire: M,
    progresso: progresso(e.patrimonioInvestivel, M),
    coberturaPassiva: coberturaPassiva(R, e.custoVidaMensal),
    iMensal,
    status: res.status,
    meses,
    anos,
    dataLiberdade,
    idadeNaLiberdade: idade,
    saqueMensalSustentavel: saqueMensalSustentavel(M, tss),
  };
}
