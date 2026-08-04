import { describe, it, expect } from 'vitest';
import {
  anualParaMensal,
  calcularJuros,
  compararCombustivel,
  compararParcelado,
  taxaEmbutida,
} from './calculadoras';

describe('juros compostos × simples', () => {
  it('só capital inicial: 1.000 a 1% por 12 meses', () => {
    const r = calcularJuros({ inicial: 1000, aporteMensal: 0, taxaMensal: 0.01, meses: 12 });
    expect(r.montante).toBeCloseTo(1126.825, 2); // 1000 · 1,01^12
    expect(r.totalInvestido).toBe(1000);
    expect(r.totalJuros).toBeCloseTo(126.825, 2);
  });

  it('composto sempre rende mais que simples em prazos > 1 mês', () => {
    const r = calcularJuros({ inicial: 10_000, aporteMensal: 500, taxaMensal: 0.01, meses: 120 });
    expect(r.montante).toBeGreaterThan(r.montanteSimples);
    expect(r.diferenca).toBeCloseTo(r.montante - r.montanteSimples, 6);
  });

  it('taxa zero devolve só o que foi investido', () => {
    const r = calcularJuros({ inicial: 1000, aporteMensal: 100, taxaMensal: 0, meses: 10 });
    expect(r.montante).toBe(2000);
    expect(r.totalJuros).toBe(0);
    expect(r.montanteSimples).toBe(2000);
  });

  it('anual → mensal é composto (12% a.a. ≠ 1% a.m.)', () => {
    expect(anualParaMensal(0.12)).toBeCloseTo(0.0094888, 6);
    expect(Math.pow(1 + anualParaMensal(0.12), 12) - 1).toBeCloseTo(0.12, 10);
  });
});

describe('álcool × gasolina', () => {
  it('regra dos 70%: abaixo compensa álcool', () => {
    const r = compararCombustivel(3.5, 6.0); // razão 0,583
    expect(r.razao).toBeCloseTo(0.5833, 3);
    expect(r.vencedor).toBe('alcool');
  });

  it('acima de 70% compensa gasolina', () => {
    const r = compararCombustivel(4.8, 6.0); // razão 0,80
    expect(r.vencedor).toBe('gasolina');
  });

  it('exatamente no limite dá empate', () => {
    const r = compararCombustivel(4.2, 6.0); // razão 0,70
    expect(r.vencedor).toBe('empate');
    expect(r.economiaPct).toBeCloseTo(0, 6);
  });

  it('com consumo real, o limite deixa de ser 70%', () => {
    // carro que faz 8 km/l no álcool e 10 na gasolina → limite 0,80
    const r = compararCombustivel(4.5, 6.0, 8, 10);
    expect(r.limite).toBeCloseTo(0.8, 6);
    expect(r.vencedor).toBe('alcool'); // razão 0,75 < 0,80
  });
});

describe('à vista × parcelado', () => {
  it('parcelamento sem juros: 10× de 100 num produto de 1.000', () => {
    expect(taxaEmbutida(1000, 100, 10)).toBeNull();
  });

  it('acha a taxa embutida quando o total supera o à vista', () => {
    // 1.000 à vista, 12× de 100 → total 1.200
    const i = taxaEmbutida(1000, 100, 12);
    expect(i).not.toBeNull();
    // confere invertendo: VP das parcelas com essa taxa volta no à vista
    const vp = 100 * ((1 - Math.pow(1 + i!, -12)) / i!);
    expect(vp).toBeCloseTo(1000, 4);
  });

  it('sem juros, parcelar ganha se seu dinheiro rende', () => {
    const r = compararParcelado(1000, 100, 10, 0.008);
    expect(r.acrescimo).toBe(0);
    expect(r.melhor).toBe('parcelar');
    expect(r.valorPresente).toBeLessThan(1000);
  });

  it('juros altos no parcelamento fazem o à vista ganhar', () => {
    const r = compararParcelado(1000, 120, 12, 0.008); // total 1.440
    expect(r.acrescimo).toBeCloseTo(440, 6);
    expect(r.melhor).toBe('avista');
    expect(r.taxaEmbutida!).toBeGreaterThan(0.008);
  });

  it('rendimento zero: decide pelo total pago', () => {
    const r = compararParcelado(1000, 100, 10, 0);
    expect(r.valorPresente).toBe(1000);
    expect(r.melhor).toBe('avista'); // empate → não vale antecipar risco
  });
});
