import { describe, it, expect } from 'vitest';
import {
  aporteVigente,
  custoVigente,
  estadoVigente,
  mediana,
  proporcaoAtipica,
  type MesLancado,
} from './vigente';

const mes = (m: string, gasto: number, over: Partial<MesLancado> = {}): MesLancado => ({
  mes: m,
  gastoTotal: gasto,
  aportesMes: 2_000,
  aporteObservado: true,
  ...over,
});

/** n meses seguidos com o mesmo gasto. */
const meses = (gastos: number[], over: Partial<MesLancado> = {}) =>
  gastos.map((g, k) => mes(`2026-${String(k + 1).padStart(2, '0')}`, g, over));

describe('mediana', () => {
  it('ímpar pega o do meio, par tira a média dos dois', () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 2, 3])).toBe(2.5);
  });

  it('lista vazia é zero, não NaN', () => {
    expect(mediana([])).toBe(0);
  });
});

describe('custo vigente', () => {
  it('com menos de 3 meses usa o declarado e diz quantos faltam', () => {
    const v = custoVigente(meses([12_000, 12_000]), 8_000);
    expect(v).toMatchObject({ valor: 8_000, fonte: 'declarado', mesesUsados: 2, faltam: 1 });
  });

  it('a partir de 3 meses passa a observar', () => {
    const v = custoVigente(meses([12_000, 11_800, 12_200]), 8_000);
    expect(v).toMatchObject({ valor: 12_000, fonte: 'observado', faltam: 0 });
  });

  it('MEDIANA — um mês de reforma não reescreve a rotina', () => {
    // com média daria 15.400 e a data pularia meio ano por causa de um mês
    const v = custoVigente(meses([8_000, 40_000, 8_200]), 8_000);
    expect(v.valor).toBe(8_200);
  });

  it('a janela esquece o que é velho demais', () => {
    // 8 meses lançados: os 2 primeiros (baratos) ficam de fora
    const v = custoVigente(meses([1_000, 1_000, 9_000, 9_000, 9_000, 9_000, 9_000, 9_000]), 8_000);
    expect(v.valor).toBe(9_000);
    expect(v.mesesUsados).toBe(6);
  });

  it('mês atípico sai da conta', () => {
    const normais = meses([8_000, 8_000, 8_000]);
    const comViagem = [...normais, mes('2026-04', 30_000, { atipico: true })];
    expect(custoVigente(comViagem, 5_000).valor).toBe(8_000);
  });

  it('filtra ANTES de recortar — 3 atípicos não derrubam pro declarado', () => {
    // seis normais seguidos de três atípicos: ainda há observação de sobra
    const lista = [
      ...meses([9_000, 9_000, 9_000, 9_000, 9_000, 9_000]),
      mes('2026-07', 50_000, { atipico: true }),
      mes('2026-08', 50_000, { atipico: true }),
      mes('2026-09', 50_000, { atipico: true }),
    ];
    expect(custoVigente(lista, 8_000)).toMatchObject({ valor: 9_000, fonte: 'observado' });
  });
});

describe('aporte vigente', () => {
  it('ignora mês com aporte DERIVADO — inferência não vira fato', () => {
    // meses legados (antes da Fase 2) têm aporte = receita − despesa
    const legados = meses([8_000, 8_000, 8_000], { aporteObservado: false, aportesMes: 5_000 });
    expect(aporteVigente(legados, 2_000)).toMatchObject({ valor: 2_000, fonte: 'declarado' });
  });

  it('conta só os digitados, e a contagem de faltantes reflete isso', () => {
    const lista = [
      ...meses([8_000, 8_000], { aporteObservado: false }),
      mes('2026-03', 8_000, { aportesMes: 3_000 }),
    ];
    expect(aporteVigente(lista, 2_000)).toMatchObject({ fonte: 'declarado', mesesUsados: 1, faltam: 2 });
  });

  it('três meses digitados já valem', () => {
    const lista = meses([8_000, 8_000, 8_000]).map((m, k) => ({ ...m, aportesMes: [1_000, 3_000, 2_000][k]! }));
    expect(aporteVigente(lista, 500)).toMatchObject({ valor: 2_000, fonte: 'observado' });
  });

  it('aporte zerado é resposta, não ausência', () => {
    const lista = meses([8_000, 8_000, 8_000]).map((m) => ({ ...m, aportesMes: 0 }));
    expect(aporteVigente(lista, 2_000)).toMatchObject({ valor: 0, fonte: 'observado' });
  });
});

describe('proporção de atípicos', () => {
  it('conta só a janela recente', () => {
    const lista = [
      ...meses([8_000, 8_000], { atipico: true }),
      ...meses([8_000, 8_000, 8_000, 8_000, 8_000, 8_000]),
    ];
    expect(proporcaoAtipica(lista)).toEqual({ atipicos: 0, total: 6 });
  });

  it('flagra quem marcou quase tudo', () => {
    const lista = [...meses([8_000]), ...meses([9_000, 9_000, 9_000, 9_000, 9_000], { atipico: true })];
    expect(proporcaoAtipica(lista)).toEqual({ atipicos: 5, total: 6 });
  });
});

describe('estado vigente — a fonte única', () => {
  const perfil = { custoVidaMensal: 8_000, aporteMensal: 2_000, taxaSaqueSegura: 0.04, metaFire: 2_400_000 };

  it('a meta acompanha o custo OBSERVADO, não o declarado', () => {
    // é o fecho da Fase 1: sem isto o custo real sobe, a meta fica parada,
    // e a data melhora quando o gasto piora
    const e = estadoVigente(perfil, meses([12_000, 12_000, 12_000]));
    expect(e.custo.valor).toBe(12_000);
    expect(e.meta).toBe(3_600_000);
  });

  it('meta travada não se mexe nem com o custo observado', () => {
    const e = estadoVigente(
      { ...perfil, metaFire: 1_500_000, metaTravada: true },
      meses([12_000, 12_000, 12_000]),
    );
    expect(e.meta).toBe(1_500_000);
  });

  it('sem histórico, tudo cai no declarado', () => {
    const e = estadoVigente(perfil, []);
    expect(e).toMatchObject({ meta: 2_400_000 });
    expect(e.custo).toMatchObject({ valor: 8_000, fonte: 'declarado', faltam: 3 });
    expect(e.aporte).toMatchObject({ valor: 2_000, fonte: 'declarado' });
  });
});
