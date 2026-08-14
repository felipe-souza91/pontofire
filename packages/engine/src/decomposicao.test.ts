import { describe, it, expect } from 'vitest';
import { decomporVariacao, mesesEntre, variacaoDaData, type EstadoFire } from './decomposicao';
import { realMensalDeAnual } from './rates';

const base: EstadoFire = {
  patrimonio: 300_000,
  aporte: 2_000,
  iMensal: realMensalDeAnual(0.05),
  meta: 2_400_000,
};

const soma = (c: { meses: number }[]) => c.reduce((s, x) => s + x.meses, 0);

describe('decomposição por Shapley', () => {
  it('SOMA EXATAMENTE a variação total', () => {
    // é a propriedade que justifica Shapley: nada some no resíduo
    const d = decomporVariacao(base, {
      patrimonio: 340_000,
      aporte: 2_500,
      iMensal: realMensalDeAnual(0.06),
      meta: 2_700_000,
    });
    expect(d.completa).toBe(true);
    expect(soma(d.contribuicoes)).toBeCloseTo(d.total!, 8);
  });

  it('sem mudança, ninguém contribui', () => {
    const d = decomporVariacao(base, base);
    expect(d.total).toBe(0);
    expect(d.contribuicoes.every((c) => Math.abs(c.meses) < 1e-9)).toBe(true);
  });

  it('atribui ao fator certo quando só um muda', () => {
    const d = decomporVariacao(base, { ...base, aporte: 3_000 });
    const porFator = Object.fromEntries(d.contribuicoes.map((c) => [c.fator, c.meses]));
    expect(porFator.aporte).toBeLessThan(0); // aportar mais antecipa
    for (const f of ['patrimonio', 'retorno', 'meta']) {
      expect(Math.abs(porFator[f]!), f).toBeLessThan(1e-9);
    }
  });

  it('meta maior adia, patrimônio maior antecipa', () => {
    const d = decomporVariacao(base, { ...base, meta: 3_000_000, patrimonio: 400_000 });
    const porFator = Object.fromEntries(d.contribuicoes.map((c) => [c.fator, c.meses]));
    expect(porFator.meta).toBeGreaterThan(0);
    expect(porFator.patrimonio).toBeLessThan(0);
  });

  it('NÃO depende da ordem — é o motivo de existir', () => {
    // trocar quem é "antes" inverte o sinal de cada contribuição, sem sobra
    const depois = { patrimonio: 350_000, aporte: 1_500, iMensal: base.iMensal, meta: 2_800_000 };
    const ida = decomporVariacao(base, depois);
    const volta = decomporVariacao(depois, base);
    for (const c of ida.contribuicoes) {
      const oposta = volta.contribuicoes.find((x) => x.fator === c.fator)!;
      expect(Math.sign(oposta.meses) === -Math.sign(c.meses) || Math.abs(c.meses) < 1e-9).toBe(true);
    }
    expect(soma(volta.contribuicoes)).toBeCloseTo(volta.total!, 8);
  });

  it('meta inalcançável: admite que não dá, em vez de inventar', () => {
    const semSaida = { patrimonio: 1_000, aporte: 0, iMensal: 0, meta: 2_400_000 };
    const d = decomporVariacao(base, semSaida);
    expect(d.completa).toBe(false);
    expect(d.contribuicoes).toEqual([]);
    expect(d.total).toBeNull();
  });

  it('já atingido conta como zero mês, não como impossível', () => {
    const d = decomporVariacao(base, { ...base, patrimonio: 3_000_000 });
    expect(d.completa).toBe(true);
    expect(d.total).toBeLessThan(0);
  });
});

describe('variação da DATA (não do prazo)', () => {
  it('um ano passado sem mudar nada = data parada', () => {
    // faltavam 300, passou 1 ano, faltam 288: a data de chegada é a MESMA
    const v = variacaoDaData(
      { em: new Date(2026, 7, 14), mesesAteFire: 300 },
      { em: new Date(2027, 7, 14), mesesAteFire: 288 },
    );
    expect(v).toBeCloseTo(0, 6);
  });

  it('antecipar dá negativo', () => {
    const v = variacaoDaData(
      { em: new Date(2026, 7, 14), mesesAteFire: 300 },
      { em: new Date(2027, 7, 14), mesesAteFire: 276 },
    );
    expect(v).toBeCloseTo(-12, 6);
  });

  it('adiar dá positivo', () => {
    const v = variacaoDaData(
      { em: new Date(2026, 7, 14), mesesAteFire: 300 },
      { em: new Date(2027, 7, 14), mesesAteFire: 294 },
    );
    expect(v).toBeCloseTo(6, 6);
  });

  it('sem data em alguma ponta, não compara', () => {
    expect(
      variacaoDaData(
        { em: new Date(2026, 7, 14), mesesAteFire: null },
        { em: new Date(2027, 7, 14), mesesAteFire: 288 },
      ),
    ).toBeNull();
  });
});

describe('mesesEntre', () => {
  it('conta meses cheios e a fração do dia', () => {
    expect(mesesEntre(new Date(2026, 0, 1), new Date(2026, 6, 1))).toBeCloseTo(6, 6);
    expect(mesesEntre(new Date(2026, 0, 1), new Date(2027, 0, 1))).toBeCloseTo(12, 6);
  });
});
