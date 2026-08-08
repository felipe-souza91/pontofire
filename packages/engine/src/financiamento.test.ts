import { describe, it, expect } from 'vitest';
import {
  amortizarOuInvestir,
  cabeNoOrcamento,
  ganhoDeAmortizar,
  mesesAteFireComAporteVariavel,
  prestacaoPrice,
  simularFinanciamento,
  type EntradaFinanciamento,
} from './financiamento';
import { numeroFire } from './fire';
import { realMensalDeAnual } from './rates';

/** Financiamento de R$ 300 mil, 1% a.m. nominal, 240 meses. */
const CASA: EntradaFinanciamento = { valor: 300_000, taxaMensal: 0.01, meses: 240, sistema: 'price' };

describe('prestacaoPrice', () => {
  it('bate com a fórmula fechada', () => {
    // PMT = 300000 · 0,01 / (1 − 1,01^−240)
    const esperado = (300_000 * 0.01) / (1 - Math.pow(1.01, -240));
    expect(prestacaoPrice(300_000, 0.01, 240)).toBeCloseTo(esperado, 6);
  });

  it('vira divisão simples com juro zero', () => {
    expect(prestacaoPrice(120_000, 0, 120)).toBeCloseTo(1_000, 6);
  });
});

describe('simularFinanciamento — Price', () => {
  const f = simularFinanciamento(CASA);

  it('paga o prazo inteiro e zera o saldo', () => {
    expect(f.mesesAteQuitar).toBe(240);
    expect(f.parcelas[239]!.saldo).toBeCloseTo(0, 2);
  });

  it('tem parcela constante', () => {
    expect(f.parcelas[0]!.parcela).toBeCloseTo(f.parcelas[100]!.parcela, 2);
  });

  it('a soma das amortizações devolve exatamente o valor financiado', () => {
    const soma = f.parcelas.reduce((s, p) => s + p.amortizacao, 0);
    expect(soma).toBeCloseTo(CASA.valor, 2);
  });

  it('total pago = principal + juros', () => {
    expect(f.totalPago).toBeCloseTo(CASA.valor + f.totalJuros, 2);
  });

  it('juros caem e amortização sobe ao longo do contrato', () => {
    expect(f.parcelas[0]!.juros).toBeGreaterThan(f.parcelas[200]!.juros);
    expect(f.parcelas[0]!.amortizacao).toBeLessThan(f.parcelas[200]!.amortizacao);
  });
});

describe('simularFinanciamento — SAC', () => {
  const f = simularFinanciamento({ ...CASA, sistema: 'sac' });

  it('amortiza sempre o mesmo valor', () => {
    expect(f.parcelas[0]!.amortizacao).toBeCloseTo(300_000 / 240, 6);
    expect(f.parcelas[150]!.amortizacao).toBeCloseTo(300_000 / 240, 6);
  });

  it('começa com parcela mais alta que a Price e termina bem mais baixa', () => {
    const price = simularFinanciamento(CASA);
    expect(f.primeiraParcela).toBeGreaterThan(price.primeiraParcela);
    expect(f.ultimaParcela).toBeLessThan(price.ultimaParcela);
  });

  it('paga menos juros no total que a Price', () => {
    expect(f.totalJuros).toBeLessThan(simularFinanciamento(CASA).totalJuros);
  });
});

describe('amortização extraordinária', () => {
  it('reduzir prazo: quita antes e economiza juros', () => {
    const g = ganhoDeAmortizar(CASA, { mensal: 500, modo: 'prazo' });
    expect(g.mesesEconomizados).toBeGreaterThan(0);
    expect(g.jurosEconomizados).toBeGreaterThan(0);
    expect(g.comExtra.mesesAteQuitar).toBeLessThan(240);
    expect(g.comExtra.parcelas.at(-1)!.saldo).toBeCloseTo(0, 2);
  });

  it('quanto maior o extra, mais cedo quita', () => {
    const a = ganhoDeAmortizar(CASA, { mensal: 300, modo: 'prazo' });
    const b = ganhoDeAmortizar(CASA, { mensal: 1_000, modo: 'prazo' });
    expect(b.comExtra.mesesAteQuitar).toBeLessThan(a.comExtra.mesesAteQuitar);
  });

  it('aporte único no meio do contrato também antecipa', () => {
    const g = ganhoDeAmortizar(CASA, { unico: { mes: 60, valor: 50_000 }, modo: 'prazo' });
    expect(g.mesesEconomizados).toBeGreaterThan(0);
    expect(g.jurosEconomizados).toBeGreaterThan(0);
  });

  it('reduzir parcela: mantém o prazo e derruba a prestação', () => {
    const g = ganhoDeAmortizar(CASA, { unico: { mes: 12, valor: 60_000 }, modo: 'parcela' });
    expect(g.comExtra.mesesAteQuitar).toBe(240);
    expect(g.comExtra.ultimaParcela).toBeLessThan(g.original.primeiraParcela);
    expect(g.jurosEconomizados).toBeGreaterThan(0);
  });

  it('nunca cobra mais do que se deve — o saldo não fica negativo', () => {
    const g = ganhoDeAmortizar(CASA, { mensal: 20_000, modo: 'prazo' });
    expect(g.comExtra.parcelas.every((p) => p.saldo >= -0.01)).toBe(true);
    expect(g.comExtra.totalPago).toBeLessThan(CASA.valor * 1.2);
  });
});

describe('amortizar OU investir — a comparação que decide', () => {
  const base = { financiamento: CASA, extraMensal: 1_000, ipcaAnual: 0.045 };

  it('converte a taxa do contrato pra termos reais (a armadilha)', () => {
    const r = amortizarOuInvestir({ ...base, retornoRealAnual: 0.06 });
    // 1% a.m. = 12,68% a.a. nominal; com IPCA 4,5% dá ~7,8% real
    expect(r.taxaRealContratoAnual).toBeGreaterThan(0.07);
    expect(r.taxaRealContratoAnual).toBeLessThan(0.09);
    // e o retorno do usuário sobe pra nominal
    expect(r.retornoNominalAnual).toBeGreaterThan(0.06);
  });

  it('contrato caro que o investimento não alcança: amortizar vence', () => {
    const r = amortizarOuInvestir({ ...base, retornoRealAnual: 0.02 });
    expect(r.vence).toBe('amortizar');
    expect(r.patrimonioAmortizando).toBeGreaterThan(r.patrimonioInvestindo);
    expect(r.diferencaHoje).toBeGreaterThan(0);
  });

  it('contrato barato e retorno alto: investir vence', () => {
    const barato = { ...base, financiamento: { ...CASA, taxaMensal: 0.004 }, retornoRealAnual: 0.09 };
    const r = amortizarOuInvestir(barato);
    expect(r.vence).toBe('investir');
    expect(r.patrimonioInvestindo).toBeGreaterThan(r.patrimonioAmortizando);
  });

  it('os dois caminhos terminam no mesmo mês — é o que os torna comparáveis', () => {
    const r = amortizarOuInvestir({ ...base, retornoRealAnual: 0.06 });
    expect(r.horizonteMeses).toBe(240);
    expect(r.mesesEconomizados).toBeGreaterThan(0);
  });

  it('a diferença é devolvida em dinheiro de HOJE, não inflacionado', () => {
    const r = amortizarOuInvestir({ ...base, retornoRealAnual: 0.02 });
    const bruta = Math.abs(r.patrimonioAmortizando - r.patrimonioInvestindo);
    expect(r.diferencaHoje).toBeLessThan(bruta); // deflacionado por 20 anos de IPCA
  });

  it('sem sobra pra usar, os dois caminhos empatam em zero', () => {
    const r = amortizarOuInvestir({ ...base, extraMensal: 0, retornoRealAnual: 0.06 });
    expect(r.vence).toBe('empate');
  });
});

describe('mesesAteFireComAporteVariavel', () => {
  const M = numeroFire(8_000, 0.04);
  const i = realMensalDeAnual(0.06);

  it('com aporte constante bate com a fórmula fechada (± 1 mês de arredondamento)', () => {
    const simulado = mesesAteFireComAporteVariavel(300_000, M, i, () => 2_000)!;
    // conferência independente pela fórmula do valor futuro
    const fechado = Math.log((M * i + 2_000) / (300_000 * i + 2_000)) / Math.log(1 + i);
    expect(Math.abs(simulado - fechado)).toBeLessThanOrEqual(1);
  });

  it('devolve 0 quando já passou da meta', () => {
    expect(mesesAteFireComAporteVariavel(3_000_000, M, i, () => 2_000)).toBe(0);
  });

  it('devolve null quando não chega dentro do limite', () => {
    expect(mesesAteFireComAporteVariavel(0, M, 0, () => 0)).toBeNull();
  });
});

describe('cabeNoOrcamento — quanto essa dívida custa em tempo de vida', () => {
  const situacao = {
    patrimonio: 300_000,
    aporteMensal: 2_000,
    custoVidaMensal: 8_000,
    metaFire: numeroFire(8_000, 0.04),
    iMensal: realMensalDeAnual(0.06),
  };

  it('parcela pequena cabe e atrasa pouco', () => {
    const r = cabeNoOrcamento({ ...situacao, parcela: 400, mesesDaDivida: 24 });
    expect(r.veredicto).toBe('cabe');
    expect(r.aporteDurante).toBe(1_600);
    expect(r.atrasoMeses!).toBeGreaterThan(0);
    expect(r.atrasoMeses!).toBeLessThan(12);
  });

  it('parcela que come quase toda a sobra é "aperta"', () => {
    expect(cabeNoOrcamento({ ...situacao, parcela: 1_600, mesesDaDivida: 48 }).veredicto).toBe('aperta');
  });

  it('parcela maior que a sobra não cabe e diz quanto falta cortar', () => {
    const r = cabeNoOrcamento({ ...situacao, parcela: 2_600, mesesDaDivida: 48 });
    expect(r.veredicto).toBe('nao-cabe');
    expect(r.cortarPorMes).toBe(600);
    expect(r.aporteDurante).toBe(-600);
  });

  it('calcula o comprometimento da renda', () => {
    const r = cabeNoOrcamento({ ...situacao, parcela: 1_000, mesesDaDivida: 12 });
    expect(r.comprometimento).toBeCloseTo(1_000 / 10_000, 6);
  });

  it('dívida mais longa atrasa mais — é o ponto da ferramenta', () => {
    const curta = cabeNoOrcamento({ ...situacao, parcela: 1_000, mesesDaDivida: 12 });
    const longa = cabeNoOrcamento({ ...situacao, parcela: 1_000, mesesDaDivida: 60 });
    expect(longa.atrasoMeses!).toBeGreaterThan(curta.atrasoMeses!);
  });

  it('parcela maior atrasa mais, no mesmo prazo', () => {
    const leve = cabeNoOrcamento({ ...situacao, parcela: 500, mesesDaDivida: 36 });
    const pesada = cabeNoOrcamento({ ...situacao, parcela: 1_500, mesesDaDivida: 36 });
    expect(pesada.atrasoMeses!).toBeGreaterThan(leve.atrasoMeses!);
  });

  it('dívida que não muda nada não atrasa nada', () => {
    const r = cabeNoOrcamento({ ...situacao, parcela: 0, mesesDaDivida: 24 });
    expect(r.atrasoMeses).toBe(0);
  });

  it('soma o custo total das parcelas', () => {
    expect(cabeNoOrcamento({ ...situacao, parcela: 890, mesesDaDivida: 48 }).custoTotal).toBe(890 * 48);
  });

  it('não quebra quem já passou da meta', () => {
    const r = cabeNoOrcamento({ ...situacao, patrimonio: 5_000_000, parcela: 1_000, mesesDaDivida: 24 });
    expect(r.mesesSemDivida).toBe(0);
    expect(r.atrasoMeses).toBe(0);
  });
});
