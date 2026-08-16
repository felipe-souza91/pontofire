import { describe, it, expect } from 'vitest';
import { realMensalDeAnual } from '@pontofire/engine';
import { CONQUISTAS, conquistasAtingidas, streakAtual } from './conquistas';
import type { ContextoInsights, SnapshotInsight } from './tipos';

function snap(mes: string, over: Partial<SnapshotInsight> = {}): SnapshotInsight {
  return {
    mes,
    patrimonioTotal: 100_000,
    receitaLiquida: 10_000,
    gastoTotal: 8_000,
    aportesMes: 2_000,
    rendimentosMes: 0,
    taxaPoupanca: 0.2,
    ...over,
  };
}

function ctx(over: Partial<ContextoInsights> = {}): ContextoInsights {
  return {
    custoVidaMensal: 8_000,
    metaFire: 2_400_000,
    aporteMensal: 2_000,
    iMensal: realMensalDeAnual(0.05),
    patrimonioAtual: 300_000,
    progresso: 0.125,
    coberturaPassiva: 0,
    mesesAteFire: 200,
    statusFire: 'ok',
    snapshots: [],
    ...over,
  };
}

describe('streak', () => {
  it('conta meses seguidos no azul de trás pra frente', () => {
    expect(streakAtual(ctx({ snapshots: [snap('2026-07'), snap('2026-08'), snap('2026-09')] }))).toBe(3);
  });

  it('zera ao encontrar um mês negativo', () => {
    // vermelho = receita abaixo da despesa; aporte digitado nunca é negativo
    const l = [snap('2026-07'), snap('2026-08', { receitaLiquida: 8_000, gastoTotal: 8_100 }), snap('2026-09')];
    expect(streakAtual(ctx({ snapshots: l }))).toBe(1);
  });

  it('lista vazia é zero', () => {
    expect(streakAtual(ctx())).toBe(0);
  });
});

describe('catálogo de conquistas', () => {
  it('ids são únicos', () => {
    const ids = CONQUISTAS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('usuário sem dados não desbloqueia nada', () => {
    expect(conquistasAtingidas(ctx({ progresso: 0 }))).toEqual([]);
  });

  it('primeiro mês desbloqueia o primeiro passo', () => {
    const r = conquistasAtingidas(ctx({ progresso: 0, snapshots: [snap('2026-09')] }));
    expect(r).toContain('primeiro-passo');
    expect(r).not.toContain('tres-meses');
  });

  it('marcos de progresso são cumulativos', () => {
    const r = conquistasAtingidas(ctx({ progresso: 0.6 }));
    expect(r).toEqual(expect.arrayContaining(['progresso-10', 'progresso-25', 'progresso-50']));
    expect(r).not.toContain('progresso-75');
  });

  it('cobertura passiva total desbloqueia a coroa', () => {
    const r = conquistasAtingidas(ctx({ coberturaPassiva: 1 }));
    expect(r).toEqual(expect.arrayContaining(['renda-passiva', 'cobertura-25', 'cobertura-100']));
  });

  it('melhor taxa de poupança olha o histórico, não só o último mês', () => {
    const l = [snap('2026-07', { taxaPoupanca: 0.55 }), snap('2026-08', { taxaPoupanca: 0.1 })];
    const r = conquistasAtingidas(ctx({ progresso: 0, snapshots: l }));
    expect(r).toEqual(expect.arrayContaining(['poupador-30', 'poupador-50']));
  });

  it('chegar na meta desbloqueia o Ponto FIRE', () => {
    expect(conquistasAtingidas(ctx({ statusFire: 'atingido' }))).toContain('ponto-fire');
  });

  it('conquista defeituosa não derruba as outras', () => {
    const original = CONQUISTAS[0]!.atingida;
    CONQUISTAS[0]!.atingida = () => {
      throw new Error('boom');
    };
    expect(() => conquistasAtingidas(ctx({ progresso: 0.3 }))).not.toThrow();
    expect(conquistasAtingidas(ctx({ progresso: 0.3 }))).toContain('progresso-25');
    CONQUISTAS[0]!.atingida = original;
  });
});
