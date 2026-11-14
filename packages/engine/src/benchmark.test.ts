import { describe, expect, it } from 'vitest';
import {
  acumuladoDesde,
  carteiraSombra,
  fatorNoIntervalo,
  mesSeguinte,
  mesesNoIntervalo,
  rentabilidade,
  retornoEntre,
  ultimoDiaDoMes,
  type MesDeCarteira,
  type TaxasPorMes,
} from './benchmark';

const taxaFixa = (meses: string[], t: number): TaxasPorMes =>
  Object.fromEntries(meses.map((m) => [m, t]));

const ANO = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
  '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];

describe('calendário de competências', () => {
  it('vira o ano', () => {
    expect(mesSeguinte('2026-11')).toBe('2026-12');
    expect(mesSeguinte('2026-12')).toBe('2027-01');
  });

  it('intervalo exclui a partida e inclui a chegada', () => {
    expect(mesesNoIntervalo('2026-10', '2027-01')).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(mesesNoIntervalo('2026-10', '2026-10')).toEqual([]);
  });

  it('intervalo invertido não trava', () => {
    expect(mesesNoIntervalo('2026-10', '2025-01')).toEqual([]);
  });

  it('último dia respeita fevereiro e bissexto', () => {
    expect(ultimoDiaDoMes('2026-02')).toBe('2026-02-28');
    expect(ultimoDiaDoMes('2028-02')).toBe('2028-02-29');
    expect(ultimoDiaDoMes('2026-10')).toBe('2026-10-31');
  });
});

describe('fatorNoIntervalo', () => {
  it('compõe as taxas do intervalo', () => {
    const f = fatorNoIntervalo({ '2026-02': 0.01, '2026-03': 0.02 }, '2026-01', '2026-03');
    expect(f).toBeCloseTo(1.01 * 1.02, 12);
  });

  it('mês sem taxa publicada devolve null, não zero', () => {
    // tratar buraco como 0% faria a régua "perder" no mês que só não saiu ainda
    expect(fatorNoIntervalo({ '2026-02': 0.01 }, '2026-01', '2026-03')).toBeNull();
  });
});

describe('carteiraSombra', () => {
  const meses: MesDeCarteira[] = [
    { mes: '2026-01', patrimonio: 100_000, aporte: 0 },
    { mes: '2026-02', patrimonio: 104_000, aporte: 3_000 },
    { mes: '2026-03', patrimonio: 108_500, aporte: 3_000 },
  ];

  it('parte do mesmo patrimônio e recebe os mesmos aportes', () => {
    const s = carteiraSombra(meses, taxaFixa(ANO, 0.01));
    expect(s[0]).toBe(100_000);
    expect(s[1]).toBeCloseTo(100_000 * 1.01 + 3_000, 6);
    expect(s[2]).toBeCloseTo((100_000 * 1.01 + 3_000) * 1.01 + 3_000, 6);
  });

  it('régua a 0% vira só a soma dos aportes', () => {
    const s = carteiraSombra(meses, taxaFixa(ANO, 0));
    expect(s).toEqual([100_000, 103_000, 106_000]);
  });

  it('para onde a régua acaba e não volta', () => {
    const s = carteiraSombra(meses, { '2026-02': 0.01 });
    expect(s[1]).not.toBeNull();
    expect(s[2]).toBeNull();
  });

  it('mês pulado compõe os dois meses do buraco', () => {
    const comBuraco: MesDeCarteira[] = [
      { mes: '2026-01', patrimonio: 100_000, aporte: 0 },
      { mes: '2026-03', patrimonio: 110_000, aporte: 2_000 },
    ];
    const s = carteiraSombra(comBuraco, taxaFixa(ANO, 0.01));
    expect(s[1]).toBeCloseTo(100_000 * 1.01 * 1.01 + 2_000, 6);
  });
});

describe('rentabilidade', () => {
  it('carteira que rendeu exatamente a régua dá 100% do CDI', () => {
    // constrói a carteira A PARTIR da régua: é a prova de que as duas contas
    // usam a mesma convenção de aporte
    const cdi = taxaFixa(ANO, 0.01);
    const base: MesDeCarteira[] = ANO.map((mes) => ({ mes, patrimonio: 0, aporte: 2_500 }));
    base[0]!.patrimonio = 50_000;
    const sombra = carteiraSombra(base, cdi);
    const meses = base.map((m, i) => ({ ...m, patrimonio: sombra[i]! }));

    const r = rentabilidade(meses, { cdi, ipca: taxaFixa(ANO, 0.004) })!;
    expect(r.percentualDoCdi).toBeCloseTo(1, 9);
    expect(r.carteira).toBeCloseTo(Math.pow(1.01, 12) - 1, 9);
    expect(r.meses).toBe(12);
  });

  it('aporte grande não vira rentabilidade', () => {
    // patrimônio dobrou — mas só porque entrou dinheiro. Retorno: zero.
    const meses: MesDeCarteira[] = [
      { mes: '2026-01', patrimonio: 100_000, aporte: 0 },
      { mes: '2026-02', patrimonio: 200_000, aporte: 100_000 },
    ];
    const r = rentabilidade(meses, { cdi: taxaFixa(ANO, 0.01), ipca: taxaFixa(ANO, 0.004) })!;
    expect(r.carteira).toBeCloseTo(0, 12);
  });

  it('mês de perda aparece como perda', () => {
    const meses: MesDeCarteira[] = [
      { mes: '2026-01', patrimonio: 100_000, aporte: 0 },
      { mes: '2026-02', patrimonio: 98_000, aporte: 3_000 },
    ];
    const r = rentabilidade(meses, { cdi: taxaFixa(ANO, 0.01), ipca: taxaFixa(ANO, 0.004) })!;
    expect(r.carteira).toBeCloseTo(-0.05, 12);
  });

  it('retorno real desconta a inflação de forma composta', () => {
    const meses: MesDeCarteira[] = [
      { mes: '2026-01', patrimonio: 100_000, aporte: 0 },
      { mes: '2026-02', patrimonio: 110_000, aporte: 0 },
    ];
    const r = rentabilidade(meses, { cdi: taxaFixa(ANO, 0.01), ipca: taxaFixa(ANO, 0.05) })!;
    expect(r.realAcumulado).toBeCloseTo(1.1 / 1.05 - 1, 12);
    expect(r.realAcumulado).not.toBeCloseTo(0.05, 6); // não é 10% − 5%
  });

  it('não anualiza período curto', () => {
    const meses: MesDeCarteira[] = [
      { mes: '2026-01', patrimonio: 100_000, aporte: 0 },
      { mes: '2026-04', patrimonio: 106_000, aporte: 0 },
    ];
    const r = rentabilidade(meses, { cdi: taxaFixa(ANO, 0.01), ipca: taxaFixa(ANO, 0.004) })!;
    expect(r.meses).toBe(3);
    expect(r.realAcumulado).not.toBeNull();
    expect(r.realAnual).toBeNull();
  });

  it('anualiza com 12 meses ou mais', () => {
    const cdi = taxaFixa(ANO, 0.01);
    const meses: MesDeCarteira[] = [
      { mes: '2026-01', patrimonio: 100_000, aporte: 0 },
      { mes: '2027-01', patrimonio: 110_000, aporte: 0 },
    ];
    const r = rentabilidade(meses, { cdi, ipca: taxaFixa(ANO, 0) })!;
    expect(r.realAnual).toBeCloseTo(0.1, 12);
  });

  it('recua o período quando a régua do último mês ainda não saiu', () => {
    // IPCA de março não publicado: comparar 2 meses de carteira com 1 de
    // inflação daria vantagem de graça pra carteira
    const meses: MesDeCarteira[] = [
      { mes: '2026-01', patrimonio: 100_000, aporte: 0 },
      { mes: '2026-02', patrimonio: 101_000, aporte: 0 },
      { mes: '2026-03', patrimonio: 105_000, aporte: 0 },
    ];
    const r = rentabilidade(meses, {
      cdi: taxaFixa(ANO, 0.01),
      ipca: { '2026-02': 0.004 },
    })!;
    expect(r.ate).toBe('2026-02');
    expect(r.carteira).toBeCloseTo(0.01, 12);
    expect(r.ipca).toBeCloseTo(0.004, 12);
  });

  it('sem régua nenhuma, devolve só a carteira', () => {
    const meses: MesDeCarteira[] = [
      { mes: '2026-01', patrimonio: 100_000, aporte: 0 },
      { mes: '2026-02', patrimonio: 102_000, aporte: 0 },
    ];
    const r = rentabilidade(meses, { cdi: {}, ipca: {} })!;
    expect(r.carteira).toBeCloseTo(0.02, 12);
    expect(r.cdi).toBeNull();
    expect(r.percentualDoCdi).toBeNull();
    expect(r.realAnual).toBeNull();
  });

  it('não há retorno sem dois meses ou sobre patrimônio zero', () => {
    const reguas = { cdi: taxaFixa(ANO, 0.01), ipca: taxaFixa(ANO, 0.004) };
    expect(rentabilidade([], reguas)).toBeNull();
    expect(rentabilidade([{ mes: '2026-01', patrimonio: 1, aporte: 0 }], reguas)).toBeNull();
    expect(
      rentabilidade(
        [
          { mes: '2026-01', patrimonio: 0, aporte: 0 },
          { mes: '2026-02', patrimonio: 5_000, aporte: 5_000 },
        ],
        reguas,
      ),
    ).toBeNull();
  });
});

describe('retornoEntre', () => {
  it('desconta o aporte antes de medir', () => {
    const r = retornoEntre(
      { mes: '2026-01', patrimonio: 100_000, aporte: 0 },
      { mes: '2026-02', patrimonio: 104_000, aporte: 3_000 },
    );
    expect(r).toBeCloseTo(0.01, 12);
  });

  it('sem patrimônio de partida não há retorno', () => {
    expect(
      retornoEntre({ mes: '2026-01', patrimonio: 0, aporte: 0 }, { mes: '2026-02', patrimonio: 5_000, aporte: 5_000 }),
    ).toBeNull();
  });
});

describe('acumuladoDesde', () => {
  const dias = [
    { data: '2026-10-30', taxa: 0.0005 },
    { data: '2026-11-03', taxa: 0.0005 },
    { data: '2026-11-04', taxa: 0.0005 },
  ];

  it('só conta os dias DEPOIS do fechamento', () => {
    const r = acumuladoDesde(dias, '2026-10-31');
    expect(r.diasUteis).toBe(2);
    expect(r.acumulado).toBeCloseTo(1.0005 * 1.0005 - 1, 12);
    expect(r.ate).toBe('2026-11-04');
  });

  it('sem dia novo, acumulado é zero e não há data', () => {
    const r = acumuladoDesde(dias, '2026-11-30');
    expect(r).toEqual({ acumulado: 0, diasUteis: 0, ate: null });
  });
});
