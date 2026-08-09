import { describe, it, expect } from 'vitest';
import {
  incluiNaBaseFire,
  resumoPatrimonio,
  rendimentoMes,
  type Asset,
} from './patrimonio';

describe('inclusão do bem na base do FIRE', () => {
  it('padrão: só financeiro entra; bem de uso não', () => {
    expect(incluiNaBaseFire({ tipo: 'financeiro', valor: 1 })).toBe(true);
    expect(incluiNaBaseFire({ tipo: 'imovel-uso', valor: 1 })).toBe(false);
    expect(incluiNaBaseFire({ tipo: 'imovel-renda', valor: 1 })).toBe(false);
    expect(incluiNaBaseFire({ tipo: 'veiculo', valor: 1 })).toBe(false);
  });

  it('override explícito do usuário vence o padrão (autonomia)', () => {
    expect(incluiNaBaseFire({ tipo: 'imovel-uso', valor: 1, incluirNoFire: true })).toBe(true);
    expect(incluiNaBaseFire({ tipo: 'financeiro', valor: 1, incluirNoFire: false })).toBe(false);
  });
});

describe('resumo de patrimônio (investível × uso)', () => {
  const carteira: Asset[] = [
    { tipo: 'financeiro', valor: 300_000 },
    { tipo: 'imovel-uso', valor: 800_000, dividaAssociada: 200_000 },
    { tipo: 'imovel-renda', valor: 400_000, geraRenda: true, rendaMensal: 2500 },
    { tipo: 'veiculo', valor: 60_000, dividaAssociada: 20_000 },
  ];

  it('separa net worth total da base do FIRE e soma a renda dos bens', () => {
    const r = resumoPatrimonio(carteira);
    expect(r.patrimonioLiquidoTotal).toBe(1_340_000); // 1.560.000 − 220.000
    expect(r.patrimonioInvestivel).toBe(300_000); // só o financeiro
    expect(r.rendaPassivaBens).toBe(2500); // aluguel do imóvel de renda
    expect(r.totalDividas).toBe(220_000);
  });

  it('marcar a casa própria como incluída joga o valor na base do FIRE', () => {
    const comCasa = carteira.map((a) =>
      a.tipo === 'imovel-uso' ? { ...a, incluirNoFire: true } : a,
    );
    expect(resumoPatrimonio(comCasa).patrimonioInvestivel).toBe(1_100_000); // 300k + 800k
  });

  it('carteira vazia é tudo zero', () => {
    expect(resumoPatrimonio([])).toEqual({
      patrimonioLiquidoTotal: 0,
      patrimonioInvestivel: 0,
      rendaPassivaBens: 0,
      totalDividas: 0,
    });
  });
});

describe('rendimento do mês (marcação a mercado)', () => {
  it('P_hoje − P_anterior − aportes', () => {
    expect(rendimentoMes(105_000, 100_000, 3000)).toBe(2000);
    expect(rendimentoMes(98_000, 100_000, 0)).toBe(-2000); // mês negativo é honesto
  });
});
