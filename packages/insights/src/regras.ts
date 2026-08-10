import { ehCategoriaNeutra, impactoAporteExtra, jaEhCoastFire, mesesAteFire } from '@pontofire/engine';
import { hl, type Insight, type Regra } from './tipos';

const MARCOS_PROGRESSO = [0.1, 0.25, 0.5, 0.75, 0.9];
const MARCOS_COBERTURA = [0.05, 0.1, 0.25, 0.5, 1];

function ultimo<T>(l: readonly T[]): T | undefined {
  return l.length ? l[l.length - 1] : undefined;
}

function nome(ctx: { apelido?: string }): string {
  return ctx.apelido ? `, ${ctx.apelido}` : '';
}

/** maior marco cruzado entre `antes` e `agora` */
function marcoCruzado(antes: number, agora: number, marcos: readonly number[]): number | null {
  const cruzados = marcos.filter((m) => antes < m && agora >= m);
  return cruzados.length ? Math.max(...cruzados) : null;
}

// ---------------------------------------------------------------------------
// Regras
// ---------------------------------------------------------------------------

/** Boas-vindas ao 1º mês lançado. */
export const primeiroMes: Regra = (ctx, fmt) => {
  if (ctx.snapshots.length !== 1) return null;
  const s = ctx.snapshots[0]!;
  return {
    id: 'primeiro-mes',
    tom: 'celebracao',
    prioridade: 70,
    partes: [
      `Primeiro mês registrado${nome(ctx)}. Você guardou `,
      hl(fmt.moeda(s.aportesMes)),
      ' — a partir do próximo, eu começo a te mostrar a tendência.',
    ],
  };
};

/** Cruzou um marco do caminho (10/25/50/75/90%). */
export const marcoProgresso: Regra = (ctx, fmt) => {
  if (ctx.snapshots.length < 2 || ctx.metaFire <= 0) return null;
  const atual = ctx.progresso;
  const anterior = ctx.snapshots[ctx.snapshots.length - 2]!.patrimonioTotal / ctx.metaFire;
  const marco = marcoCruzado(anterior, atual, MARCOS_PROGRESSO);
  if (marco === null) return null;
  return {
    id: `marco-progresso-${marco}`,
    tom: 'celebracao',
    prioridade: 100,
    partes: [
      `Você passou de `,
      hl(fmt.pct(marco)),
      ` do caminho${ctx.nomeSonho ? ` pro seu ${ctx.nomeSonho}` : ''}${nome(ctx)}.`,
    ],
  };
};

/** Cruzou um marco de cobertura passiva (o "1/5 do salário"). */
export const marcoCobertura: Regra = (ctx, fmt) => {
  const marco = MARCOS_COBERTURA.filter((m) => ctx.coberturaPassiva >= m).pop();
  if (marco === undefined) return null;
  const txt =
    marco >= 1
      ? 'Sua renda passiva já cobre 100% do seu custo de vida. Trabalhar virou opcional.'
      : `Sua renda passiva já paga ${fmt.pct(marco)} da sua vida — sem você trabalhar por isso.`;
  return {
    id: `marco-cobertura-${marco}`,
    tom: 'celebracao',
    prioridade: 95,
    partes: [txt],
  };
};

/** Taxa de poupança mudou vs. mês anterior — com impacto real na data. */
export const taxaPoupancaVariou: Regra = (ctx, fmt) => {
  if (ctx.snapshots.length < 2) return null;
  const a = ctx.snapshots[ctx.snapshots.length - 2]!;
  const b = ctx.snapshots[ctx.snapshots.length - 1]!;
  const delta = b.taxaPoupanca - a.taxaPoupanca;
  if (Math.abs(delta) < 0.03) return null; // < 3 p.p. não é notícia

  const subiu = delta > 0;
  // impacto: manter o aporte do mês novo vs. o do mês anterior
  const base = { P: ctx.patrimonioAtual, A: a.aportesMes, i: ctx.iMensal, M: ctx.metaFire };
  const antes = mesesAteFire(base.P, a.aportesMes, base.i, base.M);
  const depois = mesesAteFire(base.P, b.aportesMes, base.i, base.M);
  const ganho =
    antes.status === 'ok' && depois.status === 'ok' ? antes.meses - depois.meses : null;

  const partes = [
    `Sua taxa de poupança ${subiu ? 'subiu' : 'caiu'} de `,
    hl(fmt.pct(a.taxaPoupanca)),
    ' para ',
    hl(fmt.pct(b.taxaPoupanca)),
    '.',
  ];
  if (ganho !== null && Math.abs(ganho) >= 0.5) {
    partes.push(
      ganho > 0 ? ' Nesse ritmo, sua data anda ' : ' Nesse ritmo, sua data recua ',
      hl(fmt.duracao(Math.abs(ganho))),
      '.',
    );
  }
  return {
    id: 'taxa-poupanca-variou',
    tom: subiu ? 'celebracao' : 'atencao',
    prioridade: subiu ? 90 : 85,
    partes,
  };
};

/** O patrimônio rendeu sozinho neste mês. */
export const rendimentoDoMes: Regra = (ctx, fmt) => {
  const s = ultimo(ctx.snapshots);
  if (!s || s.rendimentosMes <= 0) return null;
  const partes = [
    'Seu patrimônio rendeu ',
    hl(fmt.moeda(s.rendimentosMes)),
    ' sozinho neste mês',
  ];
  if (s.aportesMes > 0) {
    const razao = s.rendimentosMes / s.aportesMes;
    partes.push(
      razao >= 1
        ? ' — mais do que você aportou. Seu dinheiro já trabalha mais que você.'
        : ` — ${fmt.pct(razao)} do que você aportou.`,
    );
  } else {
    partes.push('.');
  }
  return { id: 'rendimento-mes', tom: 'fato', prioridade: 75, partes };
};

/** Mês no vermelho — fato, sem culpa (§14). */
export const mesNegativo: Regra = (ctx, fmt) => {
  const s = ultimo(ctx.snapshots);
  if (!s || s.aportesMes >= 0) return null;
  return {
    id: 'mes-negativo',
    tom: 'atencao',
    prioridade: 88,
    partes: [
      'Neste mês saiu ',
      hl(fmt.moeda(Math.abs(s.aportesMes))),
      ' a mais do que entrou. Acontece — o motor só registra o que é. ',
      'Se for pontual, sua data mal sente.',
    ],
  };
};

/** Sequência de meses no azul. */
export const streakAzul: Regra = (ctx) => {
  let n = 0;
  for (let i = ctx.snapshots.length - 1; i >= 0; i--) {
    if (ctx.snapshots[i]!.aportesMes > 0) n++;
    else break;
  }
  if (n < 3) return null;
  return {
    id: 'streak-azul',
    tom: 'celebracao',
    prioridade: 80,
    partes: [hl(`${n} meses seguidos`), ' no azul. Consistência é o que move a data, não o mês perfeito.'],
  };
};

/** Já é CoastFIRE: pode parar de aportar e ainda chega. */
export const coastAtingido: Regra = (ctx) => {
  if (ctx.idadeAlvo === undefined || ctx.idadeAtual === undefined) return null;
  if (ctx.idadeAlvo <= ctx.idadeAtual) return null;
  const meses = (ctx.idadeAlvo - ctx.idadeAtual) * 12;
  if (!jaEhCoastFire(ctx.patrimonioAtual, ctx.metaFire, ctx.iMensal, meses)) return null;
  return {
    id: 'coast-atingido',
    tom: 'celebracao',
    prioridade: 92,
    partes: [
      'Você já é ',
      hl('CoastFIRE'),
      `: mesmo parando de aportar hoje, os juros te levam à meta até os ${ctx.idadeAlvo}.`,
    ],
  };
};

/** Maior categoria do mês e seu peso — informa o trade-off, não julga (§14). */
export const maiorCategoria: Regra = (ctx, fmt) => {
  // Categoria neutra fica de fora: "Fatura de cartão foi 40% do seu gasto — se
  // virasse aporte sua data andaria 8 meses" é conselho vazio. O dinheiro do
  // pagamento da fatura já foi gasto nas compras que a fatura lista.
  const itens = (ctx.transacoesMes ?? []).filter(
    (t) => t.tipo === 'saida' && !ehCategoriaNeutra(t.categoria),
  );
  if (itens.length < 2) return null;
  const soma = new Map<string, number>();
  for (const t of itens) soma.set(t.categoria, (soma.get(t.categoria) ?? 0) + t.valor);
  const total = [...soma.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  const [cat, valor] = [...soma.entries()].sort((a, b) => b[1] - a[1])[0]!;
  const peso = valor / total;
  if (peso < 0.15) return null;

  // custo de oportunidade honesto: se virasse aporte todo mês
  const imp = impactoAporteExtra(
    { P: ctx.patrimonioAtual, A: ctx.aporteMensal, i: ctx.iMensal, M: ctx.metaFire },
    valor,
  );
  const partes = [
    hl(cat),
    ' foi ',
    hl(fmt.pct(peso)),
    ' do seu gasto no mês (',
    fmt.moeda(valor),
    ').',
  ];
  if (imp.deltaMeses !== null && imp.deltaMeses >= 1) {
    partes.push(' Se virasse aporte todo mês, sua data andaria ', hl(fmt.duracao(imp.deltaMeses)), '.');
  }
  partes.push(' Decisão sua — só quis te mostrar o trade-off.');
  return { id: 'maior-categoria', tom: 'fato', prioridade: 78, partes };
};

/** A alavanca real: aporte extra × microcortes (§6 regra 3). */
export const alavancaAporte: Regra = (ctx, fmt) => {
  if (ctx.statusFire !== 'ok') return null;
  const imp = impactoAporteExtra(
    { P: ctx.patrimonioAtual, A: ctx.aporteMensal, i: ctx.iMensal, M: ctx.metaFire },
    500,
  );
  if (imp.deltaMeses === null || imp.deltaMeses < 0.5) return null;
  return {
    id: 'alavanca-aporte',
    tom: 'fato',
    prioridade: 60,
    partes: [
      'Investir ',
      hl('R$ 500 a mais'),
      ' por mês adianta sua liberdade em ',
      hl(fmt.duracao(imp.deltaMeses)),
      ' — a alavanca real é o aporte e o retorno, não os microcortes.',
    ],
  };
};

/** Lembra o porquê — o gancho humano (§7). */
export const lembreteDoPorque: Regra = (ctx, fmt) => {
  if (!ctx.porQues?.length && !ctx.nomeSonho) return null;
  if (ctx.statusFire !== 'ok' || ctx.mesesAteFire === null) return null;
  const motivos = (ctx.porQues ?? []).map((s) => s.toLowerCase());
  const lista =
    motivos.length === 0
      ? ''
      : motivos.length === 1
        ? motivos[0]!
        : `${motivos.slice(0, -1).join(', ')} e ${motivos[motivos.length - 1]}`;
  const partes = [
    'Faltam ',
    hl(fmt.duracao(ctx.mesesAteFire)),
    ctx.nomeSonho ? ' pro seu ' : ' pra sua liberdade',
  ];
  if (ctx.nomeSonho) partes.push(hl(ctx.nomeSonho));
  partes.push(`${nome(ctx)}.`);
  if (lista) partes.push(` Por trás disso: ${lista}.`);
  return { id: 'lembrete-porque', tom: 'humano', prioridade: 55, partes };
};

/** Catálogo completo, na ordem de declaração. */
export const CATALOGO: Regra[] = [
  marcoProgresso,
  marcoCobertura,
  coastAtingido,
  taxaPoupancaVariou,
  mesNegativo,
  streakAzul,
  maiorCategoria,
  rendimentoDoMes,
  primeiroMes,
  alavancaAporte,
  lembreteDoPorque,
];

export type { Insight };
