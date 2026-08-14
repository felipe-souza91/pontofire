import { describe, it, expect } from 'vitest';
import { deveNascerTravada, metaDivergiu, metaPeloCusto, metaVigente } from './partida';

const perfil = (over: Partial<Parameters<typeof metaVigente>[0]> = {}) => ({
  custoVidaMensal: 8_000,
  taxaSaqueSegura: 0.04,
  metaFire: 2_400_000,
  ...over,
});

describe('meta vigente', () => {
  it('sem travar, deriva do custo (25× o ano)', () => {
    expect(metaVigente(perfil())).toBe(2_400_000);
  });

  it('ACOMPANHA o custo quando ele muda — o bug que existia', () => {
    // O usuário sobe o custo de 8 pra 12 mil no perfil. Antes, a meta ficava
    // nos 25× do número velho e a DATA MELHORAVA quando o gasto PIORAVA.
    const antes = metaVigente(perfil({ custoVidaMensal: 8_000 }));
    const depois = metaVigente(perfil({ custoVidaMensal: 12_000 }));
    expect(depois).toBeGreaterThan(antes);
    expect(depois).toBe(3_600_000);
  });

  it('travada, respeita o número do usuário', () => {
    expect(metaVigente(perfil({ metaFire: 1_500_000, metaTravada: true }))).toBe(1_500_000);
  });

  it('travada não se mexe quando o custo muda', () => {
    const p = { metaFire: 1_500_000, metaTravada: true };
    expect(metaVigente(perfil({ ...p, custoVidaMensal: 8_000 }))).toBe(
      metaVigente(perfil({ ...p, custoVidaMensal: 20_000 })),
    );
  });

  it('custo zerado não vira meta zero — devolve o gravado', () => {
    // conta nova ou dado incompleto não pode zerar a meta e dizer "você chegou"
    expect(metaVigente(perfil({ custoVidaMensal: 0 }))).toBe(2_400_000);
  });

  it('travada em zero cai na derivada (não trava em nada)', () => {
    expect(metaVigente(perfil({ metaFire: 0, metaTravada: true }))).toBe(2_400_000);
  });
});

describe('aviso de divergência', () => {
  it('cala a boca quando a meta não está travada', () => {
    expect(metaDivergiu(perfil({ custoVidaMensal: 20_000 }))).toBe(false);
  });

  it('avisa quando a travada já não corresponde ao custo', () => {
    expect(metaDivergiu(perfil({ metaTravada: true, custoVidaMensal: 20_000 }))).toBe(true);
  });

  it('travada em cima da regra não é divergência', () => {
    expect(metaDivergiu(perfil({ metaTravada: true }))).toBe(false);
  });

  it('centavo de diferença é arredondamento, não decisão', () => {
    expect(metaDivergiu(perfil({ metaTravada: true, metaFire: 2_400_000.4 }))).toBe(false);
  });
});

describe('migração — quem nasce travado', () => {
  it('quem tinha meta própria entra travado', () => {
    // passar a derivar sem avisar mudaria a meta dessas pessoas do nada
    expect(
      deveNascerTravada({ metaFire: 1_000_000, custoVidaMensal: 8_000, taxaSaqueSegura: 0.04 }),
    ).toBe(true);
  });

  it('quem aceitou a sugestão entra derivado', () => {
    expect(
      deveNascerTravada({ metaFire: 2_400_000, custoVidaMensal: 8_000, taxaSaqueSegura: 0.04 }),
    ).toBe(false);
  });

  it('dado incompleto não trava ninguém', () => {
    expect(
      deveNascerTravada({ metaFire: 0, custoVidaMensal: 8_000, taxaSaqueSegura: 0.04 }),
    ).toBe(false);
    expect(
      deveNascerTravada({ metaFire: 2_400_000, custoVidaMensal: 0, taxaSaqueSegura: 0.04 }),
    ).toBe(false);
  });
});

describe('metaPeloCusto', () => {
  it('é a regra dos 4%: custo anual dividido pela TSS', () => {
    expect(metaPeloCusto(8_000, 0.04)).toBe(2_400_000);
    expect(metaPeloCusto(8_000, 0.035)).toBeCloseTo(2_742_857.14, 2);
  });

  it('entrada inválida devolve zero em vez de explodir', () => {
    expect(metaPeloCusto(0, 0.04)).toBe(0);
    expect(metaPeloCusto(8_000, 0)).toBe(0);
  });
});
