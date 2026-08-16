import { describe, it, expect } from 'vitest';
import { CATEGORIA_FATURA, CATEGORIA_TRANSFERENCIA } from '@pontofire/engine';
import {
  deveVoltarAoDeclarado,
  divergiu,
  podeAdotarItens,
  residualDosItens,
  somarItens,
  totaisDosItens,
  totaisAPreservar,
  totaisDe,
} from './reconciliacao';
import type { Snapshot } from './snapshots';
import type { Transacao } from './transactions';

const item = (tipo: Transacao['tipo'], categoria: string, valor: number): Transacao => ({
  id: `${tipo}-${categoria}-${valor}`,
  mes: '2026-07',
  tipo,
  categoria,
  valor,
  origem: 'import',
});

const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({
  mes: '2026-07',
  patrimonioTotal: 300_000,
  receitaLiquida: 10_500,
  gastoTotal: 8_000,
  aportesMes: 2_500,
  rendimentosMes: 0,
  taxaPoupanca: 2_500 / 10_500,
  ...over,
});

describe('soma dos itens', () => {
  it('separa por tipo', () => {
    const s = somarItens([
      item('saida', 'Mercado', 800),
      item('saida', 'Delivery', 200),
      item('ativa', 'Salário', 9_000),
      item('passiva', 'Dividendos', 150),
      item('aporte', 'Ações', 1_000),
    ]);
    expect(s).toEqual({ saida: 1_000, ativa: 9_000, passiva: 150, aporte: 1_000, neutro: 0 });
  });

  it('tira as neutras da conta — o bug que inflava o rombo', () => {
    // Fatura de cartão contava como despesa categorizada e o card acusava
    // milhares de reais "a mais" contra o total declarado.
    const s = somarItens([
      item('saida', 'Mercado', 800),
      item('saida', CATEGORIA_FATURA, 7_018.82),
      item('ativa', CATEGORIA_TRANSFERENCIA, 6_770),
    ]);
    expect(s.saida).toBe(800);
    expect(s.ativa).toBe(0);
    expect(s.neutro).toBeCloseTo(13_788.82, 2);
  });

  it('reconhece a neutra escrita à mão, sem acento', () => {
    const s = somarItens([item('saida', 'fatura de cartao', 500)]);
    expect(s.saida).toBe(0);
    expect(s.neutro).toBe(500);
  });
});

describe('totais que os itens descrevem', () => {
  it('receita é ativa + passiva, e o aporte é a sobra', () => {
    const t = totaisDosItens(somarItens([
      item('ativa', 'Salário', 9_000),
      item('passiva', 'Dividendos', 1_000),
      item('saida', 'Mercado', 6_000),
    ]));
    expect(t.receitaLiquida).toBe(10_000);
    expect(t.gastoTotal).toBe(6_000);
    expect(t.aportesMes).toBe(4_000);
    expect(t.taxaPoupanca).toBeCloseTo(0.4, 6);
  });

  it('mês no vermelho devolve aporte negativo, não zero', () => {
    const t = totaisDosItens(somarItens([
      item('ativa', 'Salário', 5_000),
      item('saida', 'Mercado', 6_000),
    ]));
    expect(t.aportesMes).toBe(-1_000);
  });
});

describe('divergência', () => {
  it('centavo de diferença não é divergência', () => {
    const snap = snapshot();
    expect(divergiu(snap, { ...totaisDe(snap), gastoTotal: 8_000.5 })).toBe(false);
  });

  it('acusa quando os itens contam outra história', () => {
    const snap = snapshot();
    expect(divergiu(snap, { ...totaisDe(snap), gastoTotal: 16_247.29 })).toBe(true);
  });
});

describe('reversibilidade — os números declarados voltam', () => {
  it('a primeira adoção guarda os números digitados', () => {
    const snap = snapshot();
    expect(totaisAPreservar(snap)).toEqual({
      receitaLiquida: 10_500,
      gastoTotal: 8_000,
      aportesMes: 2_500,
      taxaPoupanca: 2_500 / 10_500,
      aporteObservado: false,
    });
  });

  it('adotar DE NOVO não sobrescreve o original', () => {
    // Sem isto, adotar → mexer nos itens → adotar arquivaria a primeira
    // derivada como se fosse o número que o usuário digitou. O modo rápido
    // dele se perderia sem nenhum aviso na tela.
    const declarado = { receitaLiquida: 10_500, gastoTotal: 8_000, aportesMes: 2_500, taxaPoupanca: 0.238 };
    const jaAdotado = snapshot({ receitaLiquida: 22_811, gastoTotal: 16_247, declarado });
    expect(totaisAPreservar(jaAdotado)).toEqual(declarado);
  });

  it('mês vazio com totais guardados volta ao declarado', () => {
    const snap = snapshot({ declarado: totaisDe(snapshot()) });
    expect(deveVoltarAoDeclarado(snap, 0, false)).toBe(true);
  });

  it('NÃO volta enquanto a lista está carregando', () => {
    // A lista nasce vazia antes do primeiro snapshot do Firestore chegar;
    // restaurar ali desfaria o ajuste de quem só abriu a tela.
    const snap = snapshot({ declarado: totaisDe(snapshot()) });
    expect(deveVoltarAoDeclarado(snap, 0, true)).toBe(false);
  });

  it('não volta enquanto ainda houver lançamento', () => {
    const snap = snapshot({ declarado: totaisDe(snapshot()) });
    expect(deveVoltarAoDeclarado(snap, 1, false)).toBe(false);
  });

  it('mês que nunca adotou os itens não tem o que restaurar', () => {
    expect(deveVoltarAoDeclarado(snapshot(), 0, false)).toBe(false);
  });
});

describe('aporte observado × derivado', () => {
  // O caso real de julho: 48 lançamentos, receita 11.040,33, despesa 11.890,11
  // e UM aporte de R$ 2.000. Derivar o aporte de receita − despesa dava
  // −849,78, e a linha da reconciliação comparava esse residual contra os
  // 2.000 dos itens — acusando "R$ 2.849,78 a mais" que não queria dizer nada.
  const julho = somarItens([
    item('ativa', 'Salário', 11_024.39),
    item('passiva', 'Juros / Renda fixa', 15.94),
    item('saida', 'Mercado', 11_890.11),
    item('aporte', 'Outros', 2_000),
  ]);

  it('usa o aporte que os itens registram, não a sobra', () => {
    expect(totaisDosItens(julho).aportesMes).toBe(2_000);
  });

  it('a reconciliação do aporte fecha em zero', () => {
    // é o que faz a terceira linha parar de acusar rombo
    expect(totaisDosItens(julho).aportesMes - julho.aporte).toBe(0);
  });

  it('sem lançamento de aporte, volta ao proxy do modo rápido', () => {
    const s = somarItens([item('ativa', 'Salário', 10_000), item('saida', 'Mercado', 6_000)]);
    expect(totaisDosItens(s).aportesMes).toBe(4_000);
  });

  it('o que os itens não explicam vira residual, não erro de aporte', () => {
    expect(residualDosItens(julho)).toBeCloseTo(-2_849.78, 2);
  });

  it('mês que fecha certinho não tem residual', () => {
    const s = somarItens([
      item('ativa', 'Salário', 10_000),
      item('saida', 'Mercado', 6_000),
      item('aporte', 'Ações', 4_000),
    ]);
    expect(residualDosItens(s)).toBe(0);
  });
});

describe('guarda contra adotar um mês vazio', () => {
  it('não adota sem lançamento — gravaria zeros e arquivaria os números digitados', () => {
    expect(podeAdotarItens(0, false)).toBe(false);
  });

  it('não adota enquanto carrega', () => {
    expect(podeAdotarItens(48, true)).toBe(false);
  });

  it('adota com lançamentos na tela', () => {
    expect(podeAdotarItens(48, false)).toBe(true);
  });
});

describe('procedência do aporte', () => {
  it('totais vindos dos itens são observação', () => {
    const t = totaisDosItens(somarItens([item('aporte', 'Ações', 1_000)]));
    expect(t.aporteObservado).toBe(true);
  });

  it('mês legado (aporte derivado) volta marcado como não observado', () => {
    // sem isto, restaurar os totais devolveria a subtração antiga como se fosse
    // valor digitado — e a mediana da Fase 3 usaria inferência como fato
    expect(totaisDe(snapshot()).aporteObservado).toBe(false);
  });

  it('mês novo preserva a procedência ao ir e voltar', () => {
    const novo = snapshot({ aporteObservado: true });
    expect(totaisAPreservar(novo).aporteObservado).toBe(true);
  });
});
