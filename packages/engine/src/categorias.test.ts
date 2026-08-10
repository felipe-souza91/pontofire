import { describe, it, expect } from 'vitest';
import {
  CATEGORIAS_NEUTRAS,
  CATEGORIA_FATURA,
  CATEGORIA_TRANSFERENCIA,
  ehCategoriaNeutra,
} from './categorias';

describe('categorias neutras', () => {
  it('reconhece as duas', () => {
    expect(ehCategoriaNeutra(CATEGORIA_TRANSFERENCIA)).toBe(true);
    expect(ehCategoriaNeutra(CATEGORIA_FATURA)).toBe(true);
    expect(CATEGORIAS_NEUTRAS).toHaveLength(2);
  });

  it('não confunde com categoria de consumo de verdade', () => {
    for (const c of ['Mercado', 'Delivery', 'Transporte', 'Outros', '']) {
      expect(ehCategoriaNeutra(c), c).toBe(false);
    }
  });

  it('aceita o rótulo digitado à mão — sem acento, em caixa qualquer', () => {
    // o campo é livre: quem digita não vai acertar o acento sempre
    for (const c of [
      'transferencia entre contas',
      'TRANSFERÊNCIA ENTRE CONTAS',
      '  Transferencia Entre Contas  ',
      'fatura de cartao',
    ]) {
      expect(ehCategoriaNeutra(c), c).toBe(true);
    }
  });

  it('"Cartão" sozinho NÃO é neutra', () => {
    // Se fosse, qualquer gasto rotulado por forma de pagamento sumiria da
    // análise de onde o dinheiro está indo — que é o oposto do objetivo.
    expect(ehCategoriaNeutra('Cartão')).toBe(false);
  });
});
