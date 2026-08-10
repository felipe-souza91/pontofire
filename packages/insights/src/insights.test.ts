import { describe, it, expect } from 'vitest';
import { CATEGORIA_FATURA, CATEGORIA_TRANSFERENCIA, realMensalDeAnual } from '@pontofire/engine';
import { gerarInsights, textoDoInsight } from './gerar';
import {
  alavancaAporte,
  custoDoPerfilDefasado,
  maiorCategoria,
  marcoCobertura,
  marcoProgresso,
  mesNegativo,
  primeiroMes,
  rendimentoDoMes,
  streakAzul,
  taxaPoupancaVariou,
} from './regras';
import type { ContextoInsights, Formatadores, SnapshotInsight } from './tipos';

const fmt: Formatadores = {
  moeda: (v) => `R$ ${Math.round(v)}`,
  duracao: (m) => `${Math.round(m)} meses`,
  pct: (v) => `${Math.round(v * 100)}%`,
};

function snap(mes: string, patrimonio: number, extra: Partial<SnapshotInsight> = {}): SnapshotInsight {
  return {
    mes,
    patrimonioTotal: patrimonio,
    receitaLiquida: 10_000,
    gastoTotal: 8_000,
    aportesMes: 2_000,
    rendimentosMes: 0,
    taxaPoupanca: 0.2,
    ...extra,
  };
}

function ctxBase(over: Partial<ContextoInsights> = {}): ContextoInsights {
  return {
    custoVidaMensal: 8_000,
    metaFire: 2_400_000,
    aporteMensal: 2_000,
    iMensal: realMensalDeAnual(0.05),
    patrimonioAtual: 300_000,
    progresso: 300_000 / 2_400_000,
    coberturaPassiva: 0,
    mesesAteFire: 200,
    statusFire: 'ok',
    snapshots: [snap('2026-08', 295_000), snap('2026-09', 300_000)],
    ...over,
  };
}

describe('marcos', () => {
  it('celebra ao cruzar 25% do caminho (e não celebra sem cruzar)', () => {
    const meta = 1_000_000;
    const cruzou = marcoProgresso(
      ctxBase({
        metaFire: meta,
        progresso: 0.26,
        snapshots: [snap('2026-08', 240_000), snap('2026-09', 260_000)],
      }),
      fmt,
    );
    expect(cruzou?.id).toBe('marco-progresso-0.25');
    expect(textoDoInsight(cruzou!)).toContain('25%');

    const naoCruzou = marcoProgresso(
      ctxBase({
        metaFire: meta,
        progresso: 0.28,
        snapshots: [snap('2026-08', 260_000), snap('2026-09', 280_000)],
      }),
      fmt,
    );
    expect(naoCruzou).toBeNull();
  });

  it('cobertura passiva anuncia o maior marco atingido', () => {
    expect(marcoCobertura(ctxBase({ coberturaPassiva: 0.3 }), fmt)?.id).toBe('marco-cobertura-0.25');
    expect(marcoCobertura(ctxBase({ coberturaPassiva: 0.02 }), fmt)).toBeNull();
    const total = marcoCobertura(ctxBase({ coberturaPassiva: 1.1 }), fmt);
    expect(textoDoInsight(total!)).toContain('100%');
  });
});

describe('taxa de poupança', () => {
  it('só vira insight se mudar ao menos 3 p.p.', () => {
    const igual = taxaPoupancaVariou(
      ctxBase({ snapshots: [snap('2026-08', 295_000, { taxaPoupanca: 0.2 }), snap('2026-09', 300_000, { taxaPoupanca: 0.21 })] }),
      fmt,
    );
    expect(igual).toBeNull();
  });

  it('subida é celebração e cita o impacto na data', () => {
    const r = taxaPoupancaVariou(
      ctxBase({
        snapshots: [
          snap('2026-08', 295_000, { taxaPoupanca: 0.19, aportesMes: 1_900 }),
          snap('2026-09', 300_000, { taxaPoupanca: 0.3, aportesMes: 3_000 }),
        ],
      }),
      fmt,
    );
    expect(r?.tom).toBe('celebracao');
    const t = textoDoInsight(r!);
    expect(t).toContain('19%');
    expect(t).toContain('30%');
    expect(t).toContain('anda');
  });

  it('queda vira atenção — sem culpa', () => {
    const r = taxaPoupancaVariou(
      ctxBase({
        snapshots: [
          snap('2026-08', 295_000, { taxaPoupanca: 0.3, aportesMes: 3_000 }),
          snap('2026-09', 300_000, { taxaPoupanca: 0.1, aportesMes: 1_000 }),
        ],
      }),
      fmt,
    );
    expect(r?.tom).toBe('atencao');
    expect(textoDoInsight(r!)).toContain('caiu');
  });
});

describe('fatos do mês', () => {
  it('mês negativo é fato sem julgamento', () => {
    const r = mesNegativo(ctxBase({ snapshots: [snap('2026-09', 300_000, { aportesMes: -500 })] }), fmt);
    const t = textoDoInsight(r!);
    expect(t).toContain('a mais do que entrou');
    expect(t.toLowerCase()).not.toMatch(/culpa|errado|deveria|irresponsáve/);
  });

  it('rendimento maior que o aporte tem destaque especial', () => {
    const r = rendimentoDoMes(
      ctxBase({ snapshots: [snap('2026-09', 300_000, { rendimentosMes: 5_000, aportesMes: 2_000 })] }),
      fmt,
    );
    expect(textoDoInsight(r!)).toContain('mais do que você aportou');
  });

  it('streak só a partir de 3 meses no azul', () => {
    const dois = streakAzul(ctxBase({ snapshots: [snap('2026-08', 1), snap('2026-09', 2)] }), fmt);
    expect(dois).toBeNull();
    const tres = streakAzul(
      ctxBase({ snapshots: [snap('2026-07', 1), snap('2026-08', 2), snap('2026-09', 3)] }),
      fmt,
    );
    expect(textoDoInsight(tres!)).toContain('3 meses seguidos');
  });

  it('primeiro mês só aparece com exatamente 1 snapshot', () => {
    expect(primeiroMes(ctxBase({ snapshots: [snap('2026-09', 300_000)] }), fmt)).not.toBeNull();
    expect(primeiroMes(ctxBase(), fmt)).toBeNull();
  });
});

describe('alavanca (§6 regra 3)', () => {
  it('mostra o ganho do aporte extra e nega o microcorte', () => {
    const r = alavancaAporte(ctxBase(), fmt);
    const t = textoDoInsight(r!);
    expect(t).toContain('R$ 500 a mais');
    expect(t).toContain('não os microcortes');
  });

  it('não aparece se a meta é inalcançável', () => {
    expect(alavancaAporte(ctxBase({ statusFire: 'inalcancavel' }), fmt)).toBeNull();
  });
});

describe('gerarInsights', () => {
  it('ordena por prioridade e respeita o limite', () => {
    const l = gerarInsights(ctxBase({ coberturaPassiva: 0.3 }), fmt, { limite: 2 });
    expect(l).toHaveLength(2);
    expect(l[0]!.prioridade).toBeGreaterThanOrEqual(l[1]!.prioridade);
  });

  it('exclui ids já mostrados', () => {
    const todos = gerarInsights(ctxBase(), fmt);
    const alvo = todos[0]!.id;
    const filtrado = gerarInsights(ctxBase(), fmt, { excluir: [alvo] });
    expect(filtrado.find((i) => i.id === alvo)).toBeUndefined();
  });

  it('uma regra que lança não derruba as outras', () => {
    const explode = () => {
      throw new Error('boom');
    };
    const l = gerarInsights(ctxBase(), fmt, { catalogo: [explode, alavancaAporte] });
    expect(l).toHaveLength(1);
    expect(l[0]!.id).toBe('alavanca-aporte');
  });

  it('sempre devolve algo pra um usuário novo com dados mínimos', () => {
    const l = gerarInsights(ctxBase({ snapshots: [] }), fmt);
    expect(l.length).toBeGreaterThan(0);
  });
});

describe('maior categoria do mês', () => {
  const gastos = (l: [string, number][]) =>
    l.map(([categoria, valor]) => ({ tipo: 'saida' as const, categoria, valor }));

  it('aponta a maior categoria e o trade-off', () => {
    const i = maiorCategoria(
      ctxBase({ transacoesMes: gastos([['Delivery', 1_200], ['Mercado', 800], ['Lazer', 200]]) }),
      fmt,
    );
    expect(textoDoInsight(i!)).toContain('Delivery');
  });

  it('IGNORA transferência entre contas — não é gasto', () => {
    // sem o filtro, a transferência de 20 mil seria "88% do seu gasto no mês"
    // e o app sugeriria transformá-la em aporte. O dinheiro já é dele.
    const i = maiorCategoria(
      ctxBase({
        transacoesMes: gastos([
          [CATEGORIA_TRANSFERENCIA, 20_000],
          ['Delivery', 1_200],
          ['Mercado', 800],
        ]),
      }),
      fmt,
    );
    const texto = textoDoInsight(i!);
    expect(texto).not.toContain('Transferência');
    expect(texto).toContain('Delivery');
  });

  it('IGNORA pagamento de fatura — as compras já entram pela fatura', () => {
    const i = maiorCategoria(
      ctxBase({
        transacoesMes: gastos([
          [CATEGORIA_FATURA, 9_000],
          ['Mercado', 900],
          ['Transporte', 400],
        ]),
      }),
      fmt,
    );
    expect(textoDoInsight(i!)).toContain('Mercado');
  });

  it('só neutras: cala a boca em vez de inventar', () => {
    const i = maiorCategoria(
      ctxBase({
        transacoesMes: gastos([
          [CATEGORIA_TRANSFERENCIA, 5_000],
          [CATEGORIA_FATURA, 3_000],
        ]),
      }),
      fmt,
    );
    expect(i).toBeNull();
  });
});

describe('custo do perfil defasado', () => {
  // O elo que faltava: a data FIRE sai de custoVidaMensal (perfil), não dos
  // meses lançados. Sem este aviso dá pra lançar um ano inteiro de dados reais
  // e a data na tela nunca refletir nenhum deles.
  const meses = (gastos: number[]) =>
    gastos.map((g, k) => snap(`2026-0${k + 5}`, 300_000, { gastoTotal: g }));

  it('avisa quando a mediana real está muito acima do perfil', () => {
    const i = custoDoPerfilDefasado(
      ctxBase({ custoVidaMensal: 8_000, snapshots: meses([15_800, 16_200, 16_000]) }),
      fmt,
    );
    const texto = textoDoInsight(i!);
    expect(texto).toContain('R$ 8000');
    expect(texto).toContain('R$ 16000');
    expect(i!.tom).toBe('atencao');
  });

  it('diz o que aconteceria com a data', () => {
    const i = custoDoPerfilDefasado(
      ctxBase({ custoVidaMensal: 8_000, snapshots: meses([16_000, 16_000, 16_000]) }),
      fmt,
    );
    // custo dobrado → meta dobrada → a data anda pra frente, nunca pra trás
    expect(textoDoInsight(i!)).toMatch(/andaria .* pra frente/);
  });

  it('cala a boca quando o perfil bate com a realidade', () => {
    const i = custoDoPerfilDefasado(
      ctxBase({ custoVidaMensal: 8_000, snapshots: meses([8_100, 7_900, 8_050]) }),
      fmt,
    );
    expect(i).toBeNull();
  });

  it('usa MEDIANA — um mês de viagem não reescreve a rotina', () => {
    const i = custoDoPerfilDefasado(
      ctxBase({ custoVidaMensal: 8_000, snapshots: meses([8_000, 40_000, 8_100]) }),
      fmt,
    );
    expect(i).toBeNull();
  });

  it('não opina com histórico curto demais', () => {
    const i = custoDoPerfilDefasado(
      ctxBase({ custoVidaMensal: 8_000, snapshots: meses([16_000, 16_000]) }),
      fmt,
    );
    expect(i).toBeNull();
  });

  it('também avisa quando o perfil está pessimista (gasta menos)', () => {
    const i = custoDoPerfilDefasado(
      ctxBase({ custoVidaMensal: 8_000, snapshots: meses([5_000, 5_200, 5_100]) }),
      fmt,
    );
    expect(textoDoInsight(i!)).toMatch(/voltaria .* pra tr(á|a)s/);
    expect(i!.tom).toBe('fato');
  });
});
