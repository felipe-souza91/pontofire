import { describe, it, expect } from 'vitest';
import { CATEGORIA_FATURA, CATEGORIA_TRANSFERENCIA } from '@pontofire/engine';
import { compararPtBr, ordenar } from './ordenar';
import { CATEGORIAS, NOMES_BEM } from '../data/categorias';
import { INSTITUICOES } from '../data/instituicoes';

describe('ordenação pt-BR', () => {
  it('acento não joga a palavra pro fim do alfabeto', () => {
    // com sort() puro, "Saúde" cai depois de "Viagem" e "Ações" depois de tudo
    expect(ordenar(['Viagem', 'Saúde', 'Transporte'])).toEqual(['Saúde', 'Transporte', 'Viagem']);
    expect(ordenar(['Cripto', 'Ações', 'Fundos'])).toEqual(['Ações', 'Cripto', 'Fundos']);
  });

  it('compara número como número', () => {
    expect(compararPtBr('13º / férias', '2ª via')).toBeGreaterThan(0);
  });

  it('mantém no fim o que foi pedido pro fim', () => {
    const l = ordenar(['Mercado', 'Alimentação'], ['Transferência entre contas']);
    expect(l).toEqual(['Alimentação', 'Mercado', 'Transferência entre contas']);
  });

  it('não duplica quando o item do fim já está na lista', () => {
    const l = ordenar(['Mercado', 'Zzz'], ['Zzz']);
    expect(l).toEqual(['Mercado', 'Zzz']);
  });
});

describe('as listas do app saem ordenadas', () => {
  const alfabetica = (l: readonly string[]) =>
    l.every((_, i) => i === 0 || compararPtBr(l[i - 1]!, l[i]!) <= 0);

  it('instituições', () => {
    expect(alfabetica(INSTITUICOES)).toBe(true);
    expect(INSTITUICOES[0]).toBe('Agibank');
  });

  it('nomes de bem', () => {
    for (const [tipo, lista] of Object.entries(NOMES_BEM)) {
      expect(alfabetica(lista), tipo).toBe(true);
    }
  });

  it('categorias, com as neutras no rodapé', () => {
    for (const [tipo, lista] of Object.entries(CATEGORIAS)) {
      const neutras = lista.filter((c) => c === CATEGORIA_FATURA || c === CATEGORIA_TRANSFERENCIA);
      const reais = lista.slice(0, lista.length - neutras.length);
      expect(alfabetica(reais), tipo).toBe(true);
      expect(lista.slice(reais.length), tipo).toEqual(neutras);
    }
  });

  it('fatura de cartão só existe como despesa', () => {
    expect(CATEGORIAS.saida).toContain(CATEGORIA_FATURA);
    for (const t of ['ativa', 'passiva', 'aporte'] as const) {
      expect(CATEGORIAS[t], t).not.toContain(CATEGORIA_FATURA);
    }
  });
});
