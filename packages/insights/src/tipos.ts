/**
 * Tipos do catálogo de insights (§7).
 *
 * Princípios (§14): informar o trade-off, nunca moralizar o gasto; nunca usar
 * enquadramento de culpa; revelar a verdade mesmo quando é anticlímax.
 */

/** Trecho de texto; `{ hl }` é destaque visual (a UI decide como pintar). */
export type Parte = string | { hl: string };

export type TomInsight =
  | 'celebracao' // marco atingido
  | 'atencao' // fato que merece olhar (sem culpa)
  | 'fato' // informação mecânica
  | 'humano'; // lembra o porquê

export interface Insight {
  /** id da regra que gerou (estável — serve pra dedupe no push) */
  id: string;
  tom: TomInsight;
  /** maior = mais relevante */
  prioridade: number;
  partes: Parte[];
}

/** Snapshot mensal, na forma que as regras precisam. */
export interface SnapshotInsight {
  mes: string; // YYYY-MM
  patrimonioTotal: number;
  receitaLiquida: number;
  gastoTotal: number;
  aportesMes: number;
  rendimentosMes: number;
  taxaPoupanca: number;
  rendaPassiva?: number;
}

/** Lançamento detalhado (do mês corrente). */
export interface TransacaoInsight {
  tipo: 'ativa' | 'passiva' | 'aporte' | 'saida';
  categoria: string;
  valor: number;
}

export interface ContextoInsights {
  // humanização
  apelido?: string;
  nomeSonho?: string;
  porQues?: string[];

  // motor
  custoVidaMensal: number;
  metaFire: number;
  aporteMensal: number;
  /** retorno real MENSAL */
  iMensal: number;
  patrimonioAtual: number;
  /** 0..1 */
  progresso: number;
  /**
   * O custo que o usuário declarou no onboarding.
   *
   * `custoVidaMensal` agora é o VIGENTE (mediana dos meses lançados). Este é o
   * ponto de comparação: quando os dois divergem muito, vale dizer que o número
   * do perfil ficou velho — o motor já usa o real.
   */
  custoDeclarado?: number;

  /** 0..1 — R/C */
  coberturaPassiva: number;
  mesesAteFire: number | null;
  statusFire: 'ok' | 'atingido' | 'inalcancavel';
  idadeAlvo?: number;
  idadeAtual?: number;

  // dados
  snapshots: SnapshotInsight[]; // ordem cronológica (antigo → recente)
  transacoesMes?: TransacaoInsight[];
}

/** A lib não formata moeda/data — quem chama injeta (mantém o pacote puro). */
export interface Formatadores {
  moeda: (v: number) => string;
  duracao: (meses: number) => string;
  /** recebe 0..1 */
  pct: (v: number) => string;
}

export type Regra = (ctx: ContextoInsights, fmt: Formatadores) => Insight | null;

/** Açúcar pra montar partes destacadas. */
export const hl = (s: string): Parte => ({ hl: s });
