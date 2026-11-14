import { describe, expect, it } from 'vitest';
import {
  dataSGSParaISO,
  diarioEmOrdem,
  mensalPorCompetencia,
  montarMercado,
  normalizarMercado,
} from './mercado';

const HOJE = new Date(2026, 10, 14); // 14/nov/2026

/** Dias úteis (seg–sex) de um mês, todos com a mesma taxa em % a.d. */
function diasUteis(ano: number, mes: number, taxaPct: number, ateDia = 31) {
  const out: { data: string; valor: string }[] = [];
  for (let d = 1; d <= ateDia; d++) {
    const dt = new Date(ano, mes - 1, d);
    if (dt.getMonth() !== mes - 1) break;
    if (dt.getDay() === 0 || dt.getDay() === 6) continue;
    out.push({
      data: `${String(d).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`,
      valor: String(taxaPct),
    });
  }
  return out;
}

const compor = (n: number, taxaPct: number) => (Math.pow(1 + taxaPct / 100, n) - 1) * 100;

describe('leitura do SGS', () => {
  it('converte a data', () => {
    expect(dataSGSParaISO('03/11/2026')).toBe('2026-11-03');
    expect(dataSGSParaISO('2026-11-03')).toBeNull();
  });

  it('mensal vira decimal por competência', () => {
    const t = mensalPorCompetencia([{ data: '01/10/2026', valor: '1.05' }], [0, 3]);
    expect(t).toEqual({ '2026-10': 0.0105 });
  });

  it('um valor absurdo derruba a série inteira', () => {
    // 13,25 é Selic ANUAL: se apareceu aqui, o código da série está errado e
    // os outros pontos também são de outra coisa
    const t = mensalPorCompetencia(
      [{ data: '01/09/2026', valor: '1.02' }, { data: '01/10/2026', valor: '13.25' }],
      [0, 3],
    );
    expect(t).toBeNull();
  });

  it('diário sai em ordem de data', () => {
    const d = diarioEmOrdem(
      [{ data: '04/11/2026', valor: '0.05' }, { data: '03/11/2026', valor: '0.05' }],
      [0, 0.2],
    );
    expect(d?.map((x) => x.data)).toEqual(['2026-11-03', '2026-11-04']);
  });
});

describe('montarMercado', () => {
  const outubro = diasUteis(2026, 10, 0.05);
  const novembro = diasUteis(2026, 11, 0.05, 13);
  const cdiOut = compor(outubro.length, 0.05);

  it('tira o mês aberto das séries mensais', () => {
    const m = montarMercado(
      {
        cdiMensal: [
          { data: '01/10/2026', valor: String(cdiOut) },
          { data: '01/11/2026', valor: '0.40' }, // meio mês, publicado como se fosse o mês
        ],
        ipca: [{ data: '01/10/2026', valor: '0.40' }, { data: '01/11/2026', valor: '0.10' }],
        cdiDiario: null,
      },
      HOJE,
    )!;
    expect(Object.keys(m.cdiMensal)).toEqual(['2026-10']);
    expect(Object.keys(m.ipcaMensal)).toEqual(['2026-10']);
  });

  it('refaz o CDI do mês corrente a partir do diário', () => {
    const m = montarMercado(
      {
        cdiMensal: [{ data: '01/10/2026', valor: String(cdiOut) }],
        ipca: null,
        cdiDiario: [...outubro, ...novembro],
      },
      HOJE,
    )!;
    expect(m.cdiMensal['2026-11']).toBeCloseTo(compor(novembro.length, 0.05) / 100, 10);
    expect(m.cdiDiario.length).toBe(outubro.length + novembro.length);
  });

  it('descarta o diário que não reproduz o mensal publicado', () => {
    // diário a 0,5% a.d. comporia ~11% no mês — não é CDI diário
    const m = montarMercado(
      {
        cdiMensal: [{ data: '01/10/2026', valor: '1.05' }],
        ipca: [{ data: '01/10/2026', valor: '0.40' }],
        cdiDiario: [...diasUteis(2026, 10, 0.15), ...diasUteis(2026, 11, 0.15, 13)],
      },
      HOJE,
    )!;
    expect(m.cdiDiario).toEqual([]);
    expect(m.cdiMensal['2026-11']).toBeUndefined();
    expect(m.cdiMensal['2026-10']).toBeCloseTo(0.0105, 10); // o mensal sobrevive
  });

  it('série que falhou não derruba as outras', () => {
    const m = montarMercado(
      { cdiMensal: null, ipca: [{ data: '01/10/2026', valor: '0.40' }], cdiDiario: null },
      HOJE,
    )!;
    expect(m.cdiMensal).toEqual({});
    expect(m.ipcaMensal['2026-10']).toBeCloseTo(0.004, 10);
  });

  it('nada veio: null', () => {
    expect(montarMercado({ cdiMensal: null, ipca: null, cdiDiario: null }, HOJE)).toBeNull();
  });
});

describe('normalizarMercado — cache do localStorage', () => {
  it('aceita o payload certo', () => {
    const ok = {
      cdiMensal: { '2026-10': 0.0105 },
      ipcaMensal: { '2026-10': 0.004 },
      cdiDiario: [{ data: '2026-11-03', taxa: 0.0005 }],
      atualizadoEm: '2026-11-14T12:00:00.000Z',
    };
    expect(normalizarMercado(ok)).toEqual(ok);
  });

  it('campo ausente vira vazio, nunca undefined', () => {
    const m = normalizarMercado({ atualizadoEm: '2026-11-14T12:00:00.000Z' })!;
    expect(m.cdiMensal).toEqual({});
    expect(m.ipcaMensal).toEqual({});
    expect(m.cdiDiario).toEqual([]);
  });

  it('joga fora entrada torta sem derrubar o resto', () => {
    const m = normalizarMercado({
      cdiMensal: { '2026-10': 0.0105, lixo: 1, '2026-09': 'x' },
      cdiDiario: [{ data: '2026-11-03', taxa: 0.0005 }, { data: 'ontem', taxa: 1 }, null],
      atualizadoEm: '2026-11-14T12:00:00.000Z',
    })!;
    expect(m.cdiMensal).toEqual({ '2026-10': 0.0105 });
    expect(m.cdiDiario).toHaveLength(1);
  });

  it('lixo vira null', () => {
    expect(normalizarMercado(null)).toBeNull();
    expect(normalizarMercado('x')).toBeNull();
    expect(normalizarMercado({})).toBeNull();
  });
});
