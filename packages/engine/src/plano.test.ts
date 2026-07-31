import { describe, it, expect } from 'vitest';
import { calcularPlanoFire } from './plano';
import { valorFuturo } from './fire';

describe('calcularPlanoFire (integração)', () => {
  const hoje = new Date(2026, 0, 1);

  it('caso típico: junta meta, progresso, data e saque', () => {
    const p = calcularPlanoFire({
      patrimonioInvestivel: 300_000,
      aporteMensal: 3000,
      custoVidaMensal: 5000,
      retornoRealAnual: 0.05,
      idadeAtual: 35,
      hoje,
    });

    expect(p.numeroFire).toBe(1_500_000);
    expect(p.progresso).toBe(0.2);
    expect(p.saqueMensalSustentavel).toBe(5000); // = custo de vida
    expect(p.status).toBe('ok');
    expect(p.meses).not.toBeNull();
    // invariante: o patrimônio projetado na data bate na meta
    expect(valorFuturo(300_000, 3000, p.iMensal, p.meses!)).toBeCloseTo(1_500_000, 2);
    expect(p.anos).toBeCloseTo(p.meses! / 12, 12);
    expect(p.idadeNaLiberdade!).toBeGreaterThan(35);
    expect(p.dataLiberdade!.getFullYear()).toBeGreaterThan(2026);
  });

  it('quem já passou da meta: atingido, 0 mês, data = hoje', () => {
    const p = calcularPlanoFire({
      patrimonioInvestivel: 2_000_000,
      aporteMensal: 0,
      custoVidaMensal: 5000,
      retornoRealAnual: 0.05,
      hoje,
    });
    expect(p.status).toBe('atingido');
    expect(p.meses).toBe(0);
    expect(p.dataLiberdade!.getTime()).toBe(hoje.getTime());
  });

  it('sem aporte e sem juros reais: inalcançável, sem data (não NaN)', () => {
    const p = calcularPlanoFire({
      patrimonioInvestivel: 100_000,
      aporteMensal: 0,
      custoVidaMensal: 5000,
      retornoRealAnual: 0,
      hoje,
    });
    expect(p.status).toBe('inalcancavel');
    expect(p.meses).toBeNull();
    expect(p.dataLiberdade).toBeNull();
    expect(p.idadeNaLiberdade).toBeNull();
  });
});
