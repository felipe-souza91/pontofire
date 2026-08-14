import { describe, it, expect } from 'vitest';
import { variacaoDaData } from '@pontofire/engine';

/**
 * A conversão prazo → data de chegada, que é o que faz o gráfico da data
 * significar alguma coisa. A fórmula vive no Dashboard; aqui fica a prova da
 * propriedade, que é o que pode quebrar em silêncio.
 */
const dataDeChegada = (mes: string, mesesAteFire: number): number => {
  const [ano, m] = mes.split('-').map(Number);
  return ((ano ?? 0) * 12 + (m ?? 1) - 1 + mesesAteFire) / 12;
};

describe('trajetória da data', () => {
  it('prazo encurtando com o tempo NÃO move a data', () => {
    // 300 meses em jan/26 e 288 em jan/27 é a mesma chegada — só passou um ano.
    // Plotar o prazo cru daria uma linha sempre descendo, sugerindo progresso
    // que não existe.
    expect(dataDeChegada('2026-01', 300)).toBeCloseTo(dataDeChegada('2027-01', 288), 10);
  });

  it('ganhar terreno faz a linha descer de verdade', () => {
    expect(dataDeChegada('2027-01', 276)).toBeLessThan(dataDeChegada('2026-01', 300));
  });

  it('perder terreno faz subir', () => {
    expect(dataDeChegada('2027-01', 300)).toBeGreaterThan(dataDeChegada('2026-01', 300));
  });

  it('bate com o que o motor calcula pra mesma dupla', () => {
    const v = variacaoDaData(
      { em: new Date(2026, 0, 1), mesesAteFire: 300 },
      { em: new Date(2027, 0, 1), mesesAteFire: 276 },
    );
    const delta = (dataDeChegada('2027-01', 276) - dataDeChegada('2026-01', 300)) * 12;
    expect(delta).toBeCloseTo(v!, 6);
  });
});
