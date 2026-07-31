import { describe, it, expect } from 'vitest';
import {
  custoDeLiberdade,
  patrimonioCoast,
  jaEhCoastFire,
  impactoAporteExtra,
  impactoRetorno,
  type ParametrosFire,
} from './scenarios';
import { realMensalDeAnual } from './rates';

describe('custo de liberdade de um gasto pontual', () => {
  it('x · (1+i)^mesesRestantes', () => {
    // 1000 · 1,005^120
    expect(custoDeLiberdade(1000, 0.005, 120)).toBeCloseTo(1819.3968, 3);
    expect(custoDeLiberdade(1000, 0.005, 0)).toBe(1000);
  });
});

describe('CoastFIRE', () => {
  const i = realMensalDeAnual(0.05);

  it('P_coast · (1+i)^meses volta em M (invariante)', () => {
    const M = 1_500_000;
    const meses = 240;
    const pc = patrimonioCoast(M, i, meses);
    expect(pc * Math.pow(1 + i, meses)).toBeCloseTo(M, 4);
  });

  it('quem já tem o P_coast está em coast; quem tem menos, não', () => {
    const M = 1_500_000;
    const meses = 240;
    const pc = patrimonioCoast(M, i, meses);
    expect(jaEhCoastFire(pc, M, i, meses)).toBe(true);
    expect(jaEhCoastFire(pc * 0.99, M, i, meses)).toBe(false);
  });
});

describe('cenários "e se"', () => {
  const base: ParametrosFire = {
    P: 100_000,
    A: 3000,
    i: realMensalDeAnual(0.05),
    M: 1_500_000,
  };

  it('aportar mais adianta a data (delta positivo e consistente)', () => {
    const r = impactoAporteExtra(base, 1000);
    expect(r.antes.status).toBe('ok');
    expect(r.depois.status).toBe('ok');
    if (r.antes.status === 'ok' && r.depois.status === 'ok') {
      expect(r.depois.meses).toBeLessThan(r.antes.meses);
      expect(r.deltaMeses).toBeCloseTo(r.antes.meses - r.depois.meses, 10);
      expect(r.deltaMeses!).toBeGreaterThan(0);
    }
  });

  it('microcorte adianta pouco — a verdade anticlímax (§6)', () => {
    // cortar R$50/mês antecipa só ~2 meses num horizonte de ~190: irrisório em
    // termos absolutos e < 2% do caminho. A alavanca real é poupança/retorno.
    const base190 = impactoAporteExtra(base, 0).antes;
    const r = impactoAporteExtra(base, 50);
    expect(r.deltaMeses!).toBeGreaterThan(0);
    expect(r.deltaMeses!).toBeLessThan(3);
    if (base190.status === 'ok') {
      expect(r.deltaMeses! / base190.meses).toBeLessThan(0.02);
    }
  });

  it('retorno real maior adianta a data', () => {
    const r = impactoRetorno(base, realMensalDeAnual(0.08));
    expect(r.deltaMeses!).toBeGreaterThan(0);
  });

  it('lado inalcançável zera o delta (null, não NaN)', () => {
    const semSaida: ParametrosFire = { P: 10_000, A: 0, i: 0, M: 1_000_000 };
    const r = impactoAporteExtra(semSaida, 0);
    expect(r.deltaMeses).toBeNull();
  });
});
