import { describe, it, expect } from 'vitest';
import { CATEGORIA_FATURA, CATEGORIA_TRANSFERENCIA } from '@pontofire/engine';
import { compararPtBr, ordenar, ordenarPor } from './ordenar';
import { CATEGORIAS, NOMES_BEM } from '../data/categorias';
import { INSTITUICOES } from '../data/instituicoes';
import { PORQUES } from '../data/humanizacao';

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

describe('rótulo com emoji', () => {
  it('emoji na frente não decide a ordem', () => {
    // sem tirar o emoji, a ordem sairia pelo code point do símbolo — nada a ver
    // com o que o usuário lê
    // mesmos rótulos de data/feedback.ts (aqui inline: aquele módulo abre
    // conexão com o Firestore ao ser importado)
    const rotulo: Record<string, string> = {
      ideia: '💡 Ideia',
      problema: '🐛 Problema',
      elogio: '❤️ Elogio',
      outro: '💬 Outro',
    };
    expect(ordenarPor(['ideia', 'problema', 'elogio', 'outro'], (t) => rotulo[t]!)).toEqual([
      'elogio',
      'ideia',
      'outro',
      'problema',
    ]);
  });

  it('ordena pelo rótulo, não pelo código', () => {
    // 'imovel-uso' < 'imovel-renda' por código; por rótulo é o contrário
    const rotulo: Record<string, string> = {
      'imovel-uso': 'Imóvel (uso)',
      'imovel-renda': 'Imóvel de renda',
      veiculo: 'Veículo',
      outro: 'Outro',
    };
    expect(ordenarPor(['veiculo', 'outro', 'imovel-renda', 'imovel-uso'], (t) => rotulo[t]!)).toEqual([
      'imovel-uso',
      'imovel-renda',
      'outro',
      'veiculo',
    ]);
  });
});

describe('motivações do porquê', () => {
  it('saem alfabéticas', () => {
    expect(PORQUES[0]).toBe('Cuidar da minha família');
    expect(PORQUES).toEqual(ordenar(PORQUES));
  });
});
