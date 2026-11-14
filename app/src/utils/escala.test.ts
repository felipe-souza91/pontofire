import { describe, expect, it } from 'vitest';
import { escalaLegivel } from './escala';

describe('escalaLegivel', () => {
  it('as marcas caem em números redondos', () => {
    const e = escalaLegivel(171_000, 310_000);
    expect(e.ticks).toEqual([150_000, 200_000, 250_000, 300_000, 350_000]);
  });

  it('a faixa sempre contém os dados', () => {
    for (const [min, max] of [[171_000, 310_000], [0, 2_400_000], [2039.3, 2050.1], [-5, 5], [0.2, 0.9]] as const) {
      const e = escalaLegivel(min, max);
      expect(e.lo).toBeLessThanOrEqual(min);
      expect(e.hi).toBeGreaterThanOrEqual(max);
      expect(e.ticks[0]).toBe(e.lo);
      expect(e.ticks[e.ticks.length - 1]).toBe(e.hi);
    }
  });

  it('desdeZero ancora no zero, sem folga negativa', () => {
    const e = escalaLegivel(297_000, 2_400_000, { desdeZero: true });
    expect(e.lo).toBe(0);
    expect(e.ticks[0]).toBe(0);
  });

  it('não gera marcas demais', () => {
    for (const [min, max] of [[1, 2], [0, 999_999], [2040, 2041], [12_345, 12_999]] as const) {
      expect(escalaLegivel(min, max).ticks.length).toBeLessThanOrEqual(7);
    }
  });

  it('série constante ainda tem faixa pra desenhar', () => {
    const e = escalaLegivel(100, 100);
    expect(e.hi).toBeGreaterThan(e.lo);
    expect(e.lo).toBeLessThanOrEqual(100);
    expect(e.hi).toBeGreaterThanOrEqual(100);
  });

  it('série constante em zero', () => {
    const e = escalaLegivel(0, 0);
    expect(e.hi).toBeGreaterThan(e.lo);
  });

  it('passos próprios — eixo em anos usa trimestre, não 0,2 ano', () => {
    const e = escalaLegivel(2041.4, 2042.3, { passos: [1 / 12, 0.25, 0.5, 1, 2, 5, 10] });
    const passo = e.ticks[1]! - e.ticks[0]!;
    expect([1 / 12, 0.25, 0.5, 1]).toContainEqual(expect.closeTo(passo, 9));
  });

  it('sem lixo de ponto flutuante nas marcas', () => {
    const e = escalaLegivel(0.1, 0.9);
    for (const t of e.ticks) expect(String(t).length).toBeLessThan(8);
  });
});
