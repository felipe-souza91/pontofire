import { describe, it, expect } from 'vitest';
import {
  alavancasParaAlvo,
  aporteNecessario,
  custoNecessario,
  metaComCusto,
  patrimonioNecessario,
  retornoNecessario,
  type EntradaAlavancas,
} from './alavancas';
import { mesesAteFire, numeroFire, valorFuturo } from './fire';
import { realMensalDeAnual } from './rates';

const TSS = 0.04;

/** Caso do dono: chega aos 59, quer aos 55. */
function caso(over: Partial<EntradaAlavancas> = {}): EntradaAlavancas {
  const custo = 8_000;
  return {
    patrimonio: 291_000,
    aporteMensal: 2_000,
    custoVidaMensal: custo,
    metaFire: numeroFire(custo, TSS), // 2,4 mi
    iMensal: realMensalDeAnual(0.06),
    mesesAlvo: 20 * 12, // quer em 20 anos, não em 23,8
    ...over,
  };
}

/** O invariante que importa: aplicar a resposta chega no prazo pedido. */
function mesesCom(e: EntradaAlavancas, over: Partial<EntradaAlavancas>): number {
  const c = { ...e, ...over };
  const r = mesesAteFire(c.patrimonio, c.aporteMensal, c.iMensal, c.metaFire);
  expect(r.status).toBe('ok');
  return r.status === 'ok' ? r.meses : NaN;
}

describe('aporteNecessario', () => {
  it('leva exatamente ao prazo pedido', () => {
    const e = caso();
    const A = aporteNecessario(e.patrimonio, e.metaFire, e.iMensal, e.mesesAlvo);
    expect(mesesCom(e, { aporteMensal: A })).toBeCloseTo(e.mesesAlvo, 4);
  });

  it('precisa de mais aporte pra antecipar', () => {
    const e = caso();
    expect(aporteNecessario(e.patrimonio, e.metaFire, e.iMensal, e.mesesAlvo)).toBeGreaterThan(e.aporteMensal);
  });

  it('devolve zero quando os juros sozinhos já chegam no prazo', () => {
    const e = caso({ patrimonio: 2_000_000, mesesAlvo: 12 * 12 });
    expect(aporteNecessario(e.patrimonio, e.metaFire, e.iMensal, e.mesesAlvo)).toBe(0);
  });

  it('vira divisão simples quando o retorno real é ~0', () => {
    expect(aporteNecessario(100_000, 340_000, 0, 120)).toBeCloseTo(2_000, 6);
  });

  it('P ≥ M já está resolvido', () => {
    expect(aporteNecessario(3_000_000, 2_400_000, 0.004, 120)).toBe(0);
  });
});

describe('patrimonioNecessario', () => {
  it('leva exatamente ao prazo pedido', () => {
    const e = caso();
    const P = patrimonioNecessario(e.aporteMensal, e.metaFire, e.iMensal, e.mesesAlvo);
    expect(mesesCom(e, { patrimonio: P })).toBeCloseTo(e.mesesAlvo, 4);
  });

  it('nunca devolve negativo — aporte gordo já basta', () => {
    expect(patrimonioNecessario(50_000, 2_400_000, realMensalDeAnual(0.06), 240)).toBe(0);
  });
});

describe('retornoNecessario', () => {
  it('leva exatamente ao prazo pedido', () => {
    const e = caso();
    const r = retornoNecessario(e.patrimonio, e.aporteMensal, e.metaFire, e.mesesAlvo)!;
    expect(r).not.toBeNull();
    expect(mesesCom(e, { iMensal: realMensalDeAnual(r) })).toBeCloseTo(e.mesesAlvo, 3);
  });

  it('exige mais retorno do que o de hoje quando o prazo aperta', () => {
    const e = caso();
    expect(retornoNecessario(e.patrimonio, e.aporteMensal, e.metaFire, e.mesesAlvo)!).toBeGreaterThan(0.06);
  });

  it('devolve null quando nem 30% real ao ano resolve', () => {
    // 5 anos, quase sem patrimônio e com aporte pequeno: não existe taxa
    expect(retornoNecessario(10_000, 500, 2_400_000, 60)).toBeNull();
  });

  it('devolve 0 quando o dinheiro já basta parado', () => {
    expect(retornoNecessario(2_000_000, 20_000, 2_400_000, 60)).toBe(0);
  });
});

describe('custoNecessario — a alavanca de efeito duplo', () => {
  it('o corte encontrado fecha a conta com a meta já reduzida', () => {
    const e = caso();
    const c = custoNecessario(e.patrimonio, e.aporteMensal, e.custoVidaMensal, e.metaFire, e.iMensal, e.mesesAlvo)!;
    expect(c).not.toBeNull();

    const novaMeta = metaComCusto(e.metaFire, e.custoVidaMensal, c);
    const novoAporte = e.aporteMensal + (e.custoVidaMensal - c);
    expect(mesesCom(e, { custoVidaMensal: c, metaFire: novaMeta, aporteMensal: novoAporte })).toBeCloseTo(
      e.mesesAlvo,
      2,
    );
  });

  it('cortar gasto é mais eficiente do que aportar o mesmo valor', () => {
    const e = caso();
    const corte = e.custoVidaMensal - custoNecessario(e.patrimonio, e.aporteMensal, e.custoVidaMensal, e.metaFire, e.iMensal, e.mesesAlvo)!;
    const aumento = aporteNecessario(e.patrimonio, e.metaFire, e.iMensal, e.mesesAlvo) - e.aporteMensal;
    // o corte vale por dois: vira aporte E derruba a meta
    expect(corte).toBeLessThan(aumento);
  });

  it('devolve o próprio custo quando não precisa cortar nada', () => {
    const e = caso({ mesesAlvo: 40 * 12 });
    expect(custoNecessario(e.patrimonio, e.aporteMensal, e.custoVidaMensal, e.metaFire, e.iMensal, e.mesesAlvo)).toBeCloseTo(
      e.custoVidaMensal,
      2,
    );
  });

  it('como a meta encolhe junto, quase sempre existe um custo que fecha — mesmo absurdo', () => {
    // R$ 0 de patrimônio, R$ 0 de aporte, 12 meses: a resposta existe, mas é
    // viver com trocados. Quem chama isso de inviável é alavancasParaAlvo.
    const c = custoNecessario(0, 0, 8_000, 2_400_000, realMensalDeAnual(0.06), 12)!;
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(8_000 * 0.1);
  });
});

describe('alavancasParaAlvo', () => {
  it('monta as quatro respostas e todas levam ao mesmo prazo', () => {
    const e = caso();
    const a = alavancasParaAlvo(e);

    expect(a.aporte.status).toBe('possivel');
    expect(a.gasto.status).toBe('possivel');
    expect(a.retorno.status).toBe('possivel');
    expect(a.patrimonio.status).toBe('possivel');

    expect(mesesCom(e, { aporteMensal: a.aporte.alvo })).toBeCloseTo(e.mesesAlvo, 3);
    expect(mesesCom(e, { patrimonio: a.patrimonio.alvo })).toBeCloseTo(e.mesesAlvo, 3);
    expect(mesesCom(e, { iMensal: realMensalDeAnual(a.retorno.alvo) })).toBeCloseTo(e.mesesAlvo, 2);
  });

  it('delta é sempre o esforço, nunca negativo', () => {
    const a = alavancasParaAlvo(caso());
    for (const l of [a.aporte, a.gasto, a.retorno, a.patrimonio]) {
      expect(l.delta).toBeGreaterThanOrEqual(0);
    }
  });

  it('quando o prazo é folgado, tudo vira "desnecessária"', () => {
    const a = alavancasParaAlvo(caso({ mesesAlvo: 40 * 12 }));
    expect(a.aporte.status).toBe('desnecessaria');
    expect(a.gasto.status).toBe('desnecessaria');
    expect(a.retorno.status).toBe('desnecessaria');
    expect(a.patrimonio.status).toBe('desnecessaria');
    expect(a.mesesComMetadeDoAporte).toBeNull();
  });

  it('metade do esforço já antecipa — mas não até o alvo', () => {
    const e = caso();
    const a = alavancasParaAlvo(e);
    const atual = mesesCom(e, {});
    expect(a.mesesComMetadeDoAporte).not.toBeNull();
    expect(a.mesesComMetadeDoAporte!).toBeLessThan(atual);
    expect(a.mesesComMetadeDoAporte!).toBeGreaterThan(e.mesesAlvo);
  });

  it('prazo impossível é dito, não mascarado', () => {
    const a = alavancasParaAlvo(caso({ patrimonio: 1_000, aporteMensal: 100, mesesAlvo: 24 }));
    expect(a.retorno.status).toBe('impossivel'); // não existe taxa que resolva
    expect(a.gasto.status).toBe('drastica'); // existe corte, mas é outra vida
    expect(a.aporte.status).toBe('drastica'); // aportar mais do que se gasta
    expect(Number.isFinite(a.aporte.alvo)).toBe(true);
  });

  it('corte moderado sai como possível, corte de outra vida sai como drástico', () => {
    const facil = alavancasParaAlvo(caso({ mesesAlvo: 22 * 12 }));
    expect(facil.gasto.status).toBe('possivel');
    expect(facil.gasto.delta / 8_000).toBeLessThanOrEqual(0.3);

    const duro = alavancasParaAlvo(caso({ mesesAlvo: 10 * 12 }));
    expect(duro.gasto.status).toBe('drastica');
  });

  it('não quebra com entradas degeneradas', () => {
    const zerado = alavancasParaAlvo({
      patrimonio: 0, aporteMensal: 0, custoVidaMensal: 0, metaFire: 0, iMensal: 0, mesesAlvo: 0,
    });
    for (const l of [zerado.aporte, zerado.gasto, zerado.retorno, zerado.patrimonio]) {
      expect(Number.isNaN(l.alvo)).toBe(false);
      expect(Number.isNaN(l.delta)).toBe(false);
    }
  });
});

describe('metaComCusto', () => {
  it('a meta cai na mesma proporção do padrão de vida', () => {
    expect(metaComCusto(2_400_000, 8_000, 6_000)).toBeCloseTo(1_800_000, 6);
  });

  it('bate com a regra dos 25× quando a meta veio dela', () => {
    const m = numeroFire(8_000, TSS);
    expect(metaComCusto(m, 8_000, 6_000)).toBeCloseTo(numeroFire(6_000, TSS), 6);
  });
});

describe('coerência com o valor futuro', () => {
  it('o aporte necessário reproduz a meta exata no prazo', () => {
    const e = caso();
    const A = aporteNecessario(e.patrimonio, e.metaFire, e.iMensal, e.mesesAlvo);
    expect(valorFuturo(e.patrimonio, A, e.iMensal, e.mesesAlvo)).toBeCloseTo(e.metaFire, 4);
  });
});
