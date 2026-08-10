import { describe, it, expect } from 'vitest';
import { CATEGORIA_FATURA, CATEGORIA_TRANSFERENCIA } from '@pontofire/engine';
import {
  deveVoltarAoDeclarado,
  divergiu,
  somarItens,
  totaisDosItens,
  trioAPreservar,
  trioDe,
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
    expect(divergiu(snap, { ...trioDe(snap), gastoTotal: 8_000.5 })).toBe(false);
  });

  it('acusa quando os itens contam outra história', () => {
    const snap = snapshot();
    expect(divergiu(snap, { ...trioDe(snap), gastoTotal: 16_247.29 })).toBe(true);
  });
});

describe('reversibilidade — os 3 números voltam', () => {
  it('a primeira adoção guarda o trio digitado', () => {
    const snap = snapshot();
    expect(trioAPreservar(snap)).toEqual({
      receitaLiquida: 10_500,
      gastoTotal: 8_000,
      aportesMes: 2_500,
      taxaPoupanca: 2_500 / 10_500,
    });
  });

  it('adotar DE NOVO não sobrescreve o original', () => {
    // Sem isto, adotar → mexer nos itens → adotar arquivaria a primeira
    // derivada como se fosse o número que o usuário digitou. O modo rápido
    // dele se perderia sem nenhum aviso na tela.
    const declarado = { receitaLiquida: 10_500, gastoTotal: 8_000, aportesMes: 2_500, taxaPoupanca: 0.238 };
    const jaAdotado = snapshot({ receitaLiquida: 22_811, gastoTotal: 16_247, declarado });
    expect(trioAPreservar(jaAdotado)).toEqual(declarado);
  });

  it('mês vazio com trio guardado volta ao declarado', () => {
    const snap = snapshot({ declarado: trioDe(snapshot()) });
    expect(deveVoltarAoDeclarado(snap, 0, false)).toBe(true);
  });

  it('NÃO volta enquanto a lista está carregando', () => {
    // A lista nasce vazia antes do primeiro snapshot do Firestore chegar;
    // restaurar ali desfaria o ajuste de quem só abriu a tela.
    const snap = snapshot({ declarado: trioDe(snapshot()) });
    expect(deveVoltarAoDeclarado(snap, 0, true)).toBe(false);
  });

  it('não volta enquanto ainda houver lançamento', () => {
    const snap = snapshot({ declarado: trioDe(snapshot()) });
    expect(deveVoltarAoDeclarado(snap, 1, false)).toBe(false);
  });

  it('mês que nunca adotou os itens não tem o que restaurar', () => {
    expect(deveVoltarAoDeclarado(snapshot(), 0, false)).toBe(false);
  });
});
