import { describe, it, expect } from 'vitest';
import { deflatorDesde, emDinheiroDe, mesesEntreCompetencias } from './inflacao';

describe('meses entre competências', () => {
  it('conta na direção certa', () => {
    expect(mesesEntreCompetencias('2026-01', '2027-01')).toBe(12);
    expect(mesesEntreCompetencias('2026-08', '2026-11')).toBe(3);
    expect(mesesEntreCompetencias('2027-01', '2026-01')).toBe(-12);
  });
});

describe('deflator', () => {
  it('base igual ao alvo não deflaciona nada', () => {
    expect(deflatorDesde('2026-08', '2026-08', [])).toBe(1);
  });

  it('base no futuro também não — não inventa correção pra trás', () => {
    expect(deflatorDesde('2027-08', '2026-08', [])).toBe(1);
  });

  it('sem histórico, aplica a taxa padrão ao período', () => {
    expect(deflatorDesde('2026-01', '2027-01', [], 0.045)).toBeCloseTo(1.045, 6);
    expect(deflatorDesde('2026-01', '2036-01', [], 0.045)).toBeCloseTo(Math.pow(1.045, 10), 6);
  });

  it('usa o IPCA carimbado em cada mês quando existe', () => {
    // 12 meses a 10% carimbados devem dar 1,10 — não a taxa padrão
    const meses = Array.from({ length: 12 }, (_, k) => ({
      mes: `2026-${String(k + 1).padStart(2, '0')}`,
      ipca12m: 0.1,
    }));
    expect(deflatorDesde('2026-01', '2027-01', meses, 0.045)).toBeCloseTo(1.1, 6);
  });

  it('mistura carimbado com padrão sem estranhar', () => {
    const meses = [{ mes: '2026-01', ipca12m: 0.12 }];
    const d = deflatorDesde('2026-01', '2026-03', meses, 0.06);
    const esperado = Math.pow(1.12, 1 / 12) * Math.pow(1.06, 1 / 12);
    expect(d).toBeCloseTo(esperado, 8);
  });

  it('deflação registrada não explode a conta', () => {
    // IPCA negativo é raro mas acontece; o piso evita raiz de número negativo
    const meses = [{ mes: '2026-01', ipca12m: -0.02 }];
    expect(deflatorDesde('2026-01', '2026-02', meses)).toBeLessThan(1);
    expect(Number.isFinite(deflatorDesde('2026-01', '2026-02', [{ mes: '2026-01', ipca12m: -5 }]))).toBe(true);
  });
});

describe('marco em dinheiro da partida', () => {
  it('R$ 1 milhão daqui a 20 anos NÃO é um milhão de hoje', () => {
    // é a razão de a conquista existir assim: com 4,5% ao ano, ficar parado
    // "entrega" o milhão nominal sem nenhum mérito
    const real = emDinheiroDe(1_000_000, '2026-01', '2046-01', [], 0.045);
    expect(real).toBeLessThan(420_000);
    expect(real).toBeGreaterThan(400_000);
  });

  it('quem começou agora não é penalizado', () => {
    expect(emDinheiroDe(1_000_000, '2026-08', '2026-08', [])).toBe(1_000_000);
  });

  it('quanto seria preciso ter em 2046 pra bater o milhão de 2026', () => {
    const precisa = 1_000_000 * deflatorDesde('2026-01', '2046-01', [], 0.045);
    expect(emDinheiroDe(precisa, '2026-01', '2046-01', [], 0.045)).toBeCloseTo(1_000_000, 6);
  });
});
