import { CATALOGO } from './regras';
import type { ContextoInsights, Formatadores, Insight, Regra } from './tipos';

export interface OpcoesGerar {
  /** quantos insights retornar (default: todos) */
  limite?: number;
  /** ids já mostrados (evita repetir no push/cards) */
  excluir?: readonly string[];
  /** catálogo alternativo (testes) */
  catalogo?: readonly Regra[];
}

/**
 * Roda o catálogo de regras e devolve os insights aplicáveis, do mais
 * relevante para o menos. Regra que não se aplica devolve null e some.
 * Uma regra que lança NÃO derruba as outras.
 */
export function gerarInsights(
  ctx: ContextoInsights,
  fmt: Formatadores,
  opts: OpcoesGerar = {},
): Insight[] {
  const catalogo = opts.catalogo ?? CATALOGO;
  const excluir = new Set(opts.excluir ?? []);
  const out: Insight[] = [];

  for (const regra of catalogo) {
    let ins: Insight | null = null;
    try {
      ins = regra(ctx, fmt);
    } catch {
      ins = null; // regra defeituosa não pode quebrar o painel
    }
    if (ins && !excluir.has(ins.id)) out.push(ins);
  }

  out.sort((a, b) => b.prioridade - a.prioridade);
  return opts.limite ? out.slice(0, opts.limite) : out;
}

/** Junta as partes num texto puro (push, e-mail, testes). */
export function textoDoInsight(i: Insight): string {
  return i.partes.map((p) => (typeof p === 'string' ? p : p.hl)).join('');
}
