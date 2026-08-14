import { describe, it, expect } from 'vitest';
import {
  numeroFire,
  progresso,
  coberturaPassiva,
  taxaPoupanca,
  taxaInvestimento,
  residualDoMes,
  saqueMensalSustentavel,
  valorFuturo,
  mesesAteFire,
  idadeNaLiberdade,
  dataFire,
} from './fire';
import { realMensalDeAnual } from './rates';

describe('número FIRE e razões', () => {
  it('M = C × 12 / TSS (25× com 4%)', () => {
    expect(numeroFire(5000, 0.04)).toBe(1_500_000);
    expect(numeroFire(4000, 0.035)).toBeCloseTo(1_371_428.5714, 3);
  });

  it('TSS inválida lança', () => {
    expect(() => numeroFire(5000, 0)).toThrow(RangeError);
    expect(() => numeroFire(5000, -0.01)).toThrow();
  });

  it('progresso, cobertura e taxa de poupança', () => {
    expect(progresso(300_000, 1_500_000)).toBe(0.2);
    expect(progresso(100, 0)).toBe(0); // guard sem divisão por zero
    expect(coberturaPassiva(1000, 5000)).toBe(0.2);
    expect(coberturaPassiva(1000, 0)).toBe(0);
    expect(taxaPoupanca(10_000, 7000)).toBeCloseTo(0.3, 12);
    expect(taxaPoupanca(0, 100)).toBe(0);
  });

  it('saque sustentável de M devolve o custo de vida (invariante M·TSS/12 = C)', () => {
    const C = 5000;
    expect(saqueMensalSustentavel(numeroFire(C, 0.04), 0.04)).toBeCloseTo(C, 9);
    expect(saqueMensalSustentavel(1_500_000, 0.04)).toBe(5000);
  });
});

describe('valor futuro', () => {
  it('n=0 devolve o principal', () => {
    expect(valorFuturo(123_456, 999, 0.01, 0)).toBe(123_456);
  });

  it('i≈0 é linear: P + A·n', () => {
    expect(valorFuturo(1000, 100, 0, 10)).toBe(2000);
  });

  it('só juros compostos, sem aporte', () => {
    // 100000 · 1,01^12
    expect(valorFuturo(100_000, 0, 0.01, 12)).toBeCloseTo(112_682.503, 3);
  });
});

describe('meses até o FIRE', () => {
  it('P ≥ M já está lá', () => {
    const r = mesesAteFire(2_000_000, 3000, 0.004, 1_500_000);
    expect(r.status).toBe('atingido');
    if (r.status === 'atingido') expect(r.meses).toBe(0);
  });

  it('fallback i≈0 é linear e bate na conta', () => {
    const r = mesesAteFire(100_000, 5000, 0, 200_000);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.meses).toBe(20);
  });

  it('sem juros e sem aporte é inalcançável (não NaN)', () => {
    expect(mesesAteFire(100_000, 0, 0, 200_000).status).toBe('inalcancavel');
  });

  it('retorno real negativo forte com aporte baixo é inalcançável', () => {
    expect(mesesAteFire(100_000, 100, -0.02, 1_000_000).status).toBe('inalcancavel');
  });

  it.each([
    { P: 100_000, A: 3000, realAnual: 0.05, M: 1_500_000 },
    { P: 300_000, A: 3000, realAnual: 0.05, M: 1_500_000 },
    { P: 0, A: 1000, realAnual: 0.06, M: 500_000 },
    { P: 50_000, A: 2500, realAnual: 0.04, M: 800_000 },
  ])('invariante: VF(P,A,i,meses) volta em M ($P/$A/$realAnual)', ({ P, A, realAnual, M }) => {
    const i = realMensalDeAnual(realAnual);
    const r = mesesAteFire(P, A, i, M);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.meses).toBeGreaterThan(0);
      expect(valorFuturo(P, A, i, r.meses)).toBeCloseTo(M, 2);
    }
  });
});

describe('idade e data na liberdade', () => {
  it('idade = idadeAtual + n/12', () => {
    expect(idadeNaLiberdade(30, 120)).toBe(40);
    expect(idadeNaLiberdade(35, 189)).toBeCloseTo(50.75, 10);
  });

  it('data avança meses inteiros sem mutar a entrada', () => {
    const base = new Date(2026, 0, 15); // 15/jan/2026 (local)
    const d = dataFire(base, 12);
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
    expect(base.getFullYear()).toBe(2026); // não mutou
  });

  it('n=0 devolve a própria data-base', () => {
    const base = new Date(2026, 5, 10);
    const d = dataFire(base, 0);
    expect(d.getTime()).toBe(base.getTime());
  });
});

describe('as duas taxas e o que sobra entre elas', () => {
  // Poupança mede o que você NÃO consumiu; investimento mede o que VIROU
  // patrimônio. A diferença é o vazamento de quem economiza e deixa na conta.
  it('são coisas diferentes quando sobra dinheiro parado', () => {
    const receita = 10_000;
    const despesa = 7_000;
    const aporte = 1_800;
    expect(taxaPoupanca(receita, despesa)).toBeCloseTo(0.3, 12);
    expect(taxaInvestimento(aporte, receita)).toBeCloseTo(0.18, 12);
    expect(residualDoMes(receita, despesa, aporte)).toBe(1_200);
  });

  it('coincidem quando tudo que sobrou foi investido', () => {
    const receita = 10_000;
    const despesa = 7_000;
    expect(taxaInvestimento(3_000, receita)).toBeCloseTo(taxaPoupanca(receita, despesa), 12);
    expect(residualDoMes(receita, despesa, 3_000)).toBe(0);
  });

  it('aporte maior que a sobra dá residual negativo — veio de saldo antigo', () => {
    // mês do PPR investido junto com dinheiro que já estava na conta
    expect(residualDoMes(10_000, 9_000, 5_000)).toBe(-4_000);
  });

  it('receita zero não vira divisão por zero', () => {
    expect(taxaInvestimento(500, 0)).toBe(0);
    expect(taxaPoupanca(0, 500)).toBe(0);
  });

  it('mês no vermelho: taxa de poupança negativa, investimento pode ser positiva', () => {
    // gastou mais do que ganhou E ainda aportou — as duas verdades convivem
    expect(taxaPoupanca(5_000, 6_000)).toBeCloseTo(-0.2, 12);
    expect(taxaInvestimento(500, 5_000)).toBeCloseTo(0.1, 12);
  });
});
