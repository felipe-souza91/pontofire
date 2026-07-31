import { describe, it, expect } from 'vitest';
import { realMensalDeAnual, realAnualDeMensal, realDeNominal, nominalDeReal } from './rates';

describe('conversões de taxa', () => {
  it('real mensal a partir do anual (composto, não /12)', () => {
    // 1,05^(1/12) − 1
    expect(realMensalDeAnual(0.05)).toBeCloseTo(0.0040741238, 9);
    expect(realMensalDeAnual(0)).toBe(0);
  });

  it('mensal → anual é o inverso de anual → mensal', () => {
    expect(realAnualDeMensal(realMensalDeAnual(0.07))).toBeCloseTo(0.07, 12);
    // 12 meses de 1% compõem mais que 12%
    expect(realAnualDeMensal(0.01)).toBeCloseTo(0.12682503, 8);
  });

  it('real a partir do nominal desconta a inflação de forma composta', () => {
    // 1,10 / 1,045 − 1
    expect(realDeNominal(0.1, 0.045)).toBeCloseTo(0.0526315789, 9);
    expect(realDeNominal(0.045, 0.045)).toBeCloseTo(0, 12);
  });

  it('nominal ↔ real fecham o ciclo', () => {
    expect(nominalDeReal(0.05, 0.045)).toBeCloseTo(0.09725, 10);
    expect(nominalDeReal(realDeNominal(0.1, 0.045), 0.045)).toBeCloseTo(0.1, 12);
  });
});
