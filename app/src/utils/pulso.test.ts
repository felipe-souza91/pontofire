import { describe, expect, it } from 'vitest';
import {
  carimboDoPatrimonio,
  diasAte,
  diasPagosPorMes,
  estimativaDeHoje,
  motivoSemEstimativa,
  referenciaDoPatrimonio,
} from './pulso';

const HOJE = new Date(2026, 10, 14); // 14/nov/2026

const CDI = [
  { data: '2026-10-29', taxa: 0.0005 },
  { data: '2026-10-30', taxa: 0.0005 },
  { data: '2026-11-03', taxa: 0.0005 },
  { data: '2026-11-04', taxa: 0.0005 },
  { data: '2026-11-12', taxa: 0.0005 },
];

describe('carimboDoPatrimonio', () => {
  it('mês corrente: o patrimônio é o de hoje', () => {
    expect(carimboDoPatrimonio('2026-11', 300_000, undefined, HOJE)).toBe('2026-11-14');
  });

  it('mês passado: o patrimônio é o do fechamento daquele mês', () => {
    expect(carimboDoPatrimonio('2026-09', 300_000, undefined, HOJE)).toBe('2026-09-30');
  });

  it('regravar sem mexer no patrimônio mantém o dia', () => {
    // corrigir a receita no dia 14 não faz o patrimônio do dia 5 virar do dia 14
    const existente = { mes: '2026-11', patrimonioTotal: 300_000, patrimonioEm: '2026-11-05' };
    expect(carimboDoPatrimonio('2026-11', 300_000, existente, HOJE)).toBe('2026-11-05');
  });

  it('patrimônio novo, dia novo', () => {
    const existente = { mes: '2026-11', patrimonioTotal: 300_000, patrimonioEm: '2026-11-05' };
    expect(carimboDoPatrimonio('2026-11', 302_000, existente, HOJE)).toBe('2026-11-14');
  });
});

describe('referenciaDoPatrimonio', () => {
  it('usa o carimbo quando existe', () => {
    expect(referenciaDoPatrimonio({ mes: '2026-11', patrimonioTotal: 1, patrimonioEm: '2026-11-05' }, HOJE)).toBe('2026-11-05');
  });

  it('lançamento antigo de mês fechado: último dia do mês', () => {
    expect(referenciaDoPatrimonio({ mes: '2026-10', patrimonioTotal: 1 }, HOJE)).toBe('2026-10-31');
  });

  it('lançamento antigo do mês corrente: não chuta o dia', () => {
    expect(referenciaDoPatrimonio({ mes: '2026-11', patrimonioTotal: 1 }, HOJE)).toBeNull();
  });

  it('carimbo no futuro (relógio errado) não passa de hoje', () => {
    expect(referenciaDoPatrimonio({ mes: '2026-11', patrimonioTotal: 1, patrimonioEm: '2026-11-30' }, HOJE)).toBe('2026-11-14');
  });
});

describe('estimativaDeHoje', () => {
  it('compõe o CDI dos dias úteis depois do lançamento', () => {
    const e = estimativaDeHoje({ mes: '2026-10', patrimonioTotal: 300_000 }, CDI, HOJE)!;
    expect(e.diasUteis).toBe(3);
    expect(e.acumulado).toBeCloseTo(Math.pow(1.0005, 3) - 1, 12);
    expect(e.valor).toBeCloseTo(300_000 * Math.pow(1.0005, 3), 6);
    expect(e.ganho).toBeCloseTo(e.valor - 300_000, 6);
    expect(e.desde).toBe('2026-10-31');
    expect(e.ate).toBe('2026-11-12');
  });

  it('lançado hoje: ainda não há dia novo, não há estimativa', () => {
    expect(
      estimativaDeHoje({ mes: '2026-11', patrimonioTotal: 300_000, patrimonioEm: '2026-11-14' }, CDI, HOJE),
    ).toBeNull();
  });

  it('série diária que começa depois do lançamento não serve', () => {
    // usuário parado há meses: a régua cobriria só um pedaço do intervalo
    expect(estimativaDeHoje({ mes: '2026-06', patrimonioTotal: 300_000 }, CDI, HOJE)).toBeNull();
  });

  it('sem lançamento, sem patrimônio ou sem CDI: null', () => {
    expect(estimativaDeHoje(null, CDI, HOJE)).toBeNull();
    expect(estimativaDeHoje({ mes: '2026-10', patrimonioTotal: 0 }, CDI, HOJE)).toBeNull();
    expect(estimativaDeHoje({ mes: '2026-10', patrimonioTotal: 300_000 }, [], HOJE)).toBeNull();
  });
});

describe('motivoSemEstimativa', () => {
  it('diz o motivo certo em cada caso', () => {
    expect(motivoSemEstimativa(null, CDI, HOJE)).toBe('sem-lancamento');
    expect(motivoSemEstimativa({ mes: '2026-10', patrimonioTotal: 1 }, [], HOJE)).toBe('sem-regua');
    expect(motivoSemEstimativa({ mes: '2026-06', patrimonioTotal: 1 }, CDI, HOJE)).toBe('antigo');
    expect(
      motivoSemEstimativa({ mes: '2026-11', patrimonioTotal: 1, patrimonioEm: '2026-11-14' }, CDI, HOJE),
    ).toBe('em-dia');
  });

  it('Banco Central fora do ar não vira "lançamento em dia"', () => {
    expect(motivoSemEstimativa({ mes: '2026-10', patrimonioTotal: 300_000 }, [], HOJE)).not.toBe('em-dia');
  });
});

describe('diasAte', () => {
  it('conta dias corridos', () => {
    expect(diasAte(new Date(2026, 10, 15), HOJE)).toBe(1);
    expect(diasAte(new Date(2027, 10, 14), HOJE)).toBe(365);
  });

  it('data passada dá zero', () => {
    expect(diasAte(new Date(2020, 0, 1), HOJE)).toBe(0);
  });

  it('não escorrega no horário de verão nem na hora do dia', () => {
    expect(diasAte(new Date(2026, 10, 15, 0, 5), new Date(2026, 10, 14, 23, 55))).toBe(1);
  });
});

describe('diasPagosPorMes', () => {
  it('na meta, paga os 30 dias', () => {
    // custo 8.000 → meta 2,4 mi pela regra dos 4%
    expect(diasPagosPorMes(2_400_000, 0, 0.04, 8_000)).toBeCloseTo(30, 9);
  });

  it('é o progresso em outra unidade', () => {
    expect(diasPagosPorMes(240_000, 0, 0.04, 8_000)).toBeCloseTo(3, 9);
  });

  it('a reserva não paga dia nenhum', () => {
    expect(diasPagosPorMes(270_000, 30_000, 0.04, 8_000)).toBeCloseTo(3, 9);
  });

  it('não passa de 30 nem desce de 0', () => {
    expect(diasPagosPorMes(9_000_000, 0, 0.04, 8_000)).toBe(30);
    expect(diasPagosPorMes(10_000, 30_000, 0.04, 8_000)).toBe(0);
    expect(diasPagosPorMes(100_000, 0, 0.04, 0)).toBe(0);
  });
});
