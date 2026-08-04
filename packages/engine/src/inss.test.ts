import { describe, it, expect } from 'vitest';
import {
  anosContribuicaoMinimo,
  estimarINSS,
  idadeMinimaINSS,
  INSS_2026,
} from './inss';

describe('regras de idade e tempo', () => {
  it('regra permanente: 62 (F) / 65 (M)', () => {
    expect(idadeMinimaINSS(2030, 'F', 'permanente')).toBe(62);
    expect(idadeMinimaINSS(2030, 'M', 'permanente')).toBe(65);
  });

  it('transição sobe 6 meses por ano desde 2019', () => {
    expect(idadeMinimaINSS(2026, 'F', 'transicao')).toBe(59.5); // 56 + 3.5
    expect(idadeMinimaINSS(2026, 'M', 'transicao')).toBe(64.5); // 61 + 3.5
  });

  it('transição não passa do teto permanente', () => {
    expect(idadeMinimaINSS(2040, 'F', 'transicao')).toBe(62);
    expect(idadeMinimaINSS(2040, 'M', 'transicao')).toBe(65);
  });

  it('tempo mínimo de contribuição: 15 (F) / 20 (M)', () => {
    expect(anosContribuicaoMinimo('F')).toBe(15);
    expect(anosContribuicaoMinimo('M')).toBe(20);
  });
});

describe('estimativa do benefício', () => {
  const hoje = new Date(2026, 0, 1);

  it('detecta transição (contribuía antes da reforma) e permanente', () => {
    const base = { dataNascimento: '1991-02-28', salarioBruto: 5000, sexo: 'M' as const, hoje };
    expect(estimarINSS({ ...base, inicioContribuicao: '2009-01' }).regra).toBe('transicao');
    expect(estimarINSS({ ...base, inicioContribuicao: '2020-03' }).regra).toBe('permanente');
  });

  it('quem ganha acima do teto recebe no máximo o teto (o "golpe" do §8)', () => {
    const r = estimarINSS({
      dataNascimento: '1991-02-28',
      inicioContribuicao: '2009-01',
      salarioBruto: 30_000, // muito acima do teto
      sexo: 'M',
      hoje,
    });
    expect(r.mediaEstimada).toBe(INSS_2026.teto); // média limitada ao teto
    expect(r.beneficioEstimado).toBeLessThanOrEqual(INSS_2026.teto);
    expect(r.beneficioEstimado).toBeCloseTo(INSS_2026.teto, 2);
  });

  it('percentual base é 60% com o tempo mínimo exato', () => {
    const r = estimarINSS({
      dataNascimento: '1979-01-01',
      inicioContribuicao: '2026-01', // começa agora → 15 anos exatos aos 62
      salarioBruto: 3000,
      sexo: 'F',
      hoje,
    });
    expect(r.regra).toBe('permanente');
    expect(r.anosContribuicaoNaData).toBeCloseTo(15, 6);
    expect(r.percentual).toBeCloseTo(0.6, 10);
    expect(r.beneficioEstimado).toBeCloseTo(1800, 2); // 3000 × 60%
  });

  it('+2% por ano acima do mínimo, limitado a 100%', () => {
    const r = estimarINSS({
      dataNascimento: '1991-02-28',
      inicioContribuicao: '2009-01', // contribui muito além do mínimo
      salarioBruto: 30_000,
      sexo: 'M',
      hoje,
    });
    expect(r.percentual).toBeLessThanOrEqual(1);
    expect(r.percentual).toBeGreaterThan(0.6);
  });

  it('nunca paga abaixo do piso', () => {
    const r = estimarINSS({
      dataNascimento: '1979-01-01',
      inicioContribuicao: '2026-01',
      salarioBruto: 1000, // 60% daria 600
      sexo: 'F',
      hoje,
    });
    expect(r.beneficioEstimado).toBe(INSS_2026.piso);
    expect(r.elevadoAoPiso).toBe(true);
  });

  it('exige idade E tempo de contribuição (o que vier depois manda)', () => {
    // começa a contribuir tarde: a idade chega antes do tempo mínimo
    const r = estimarINSS({
      dataNascimento: '1970-01-01', // já tem 56 em 2026
      inicioContribuicao: '2024-01', // só 2 anos de contribuição
      salarioBruto: 4000,
      sexo: 'M',
      hoje,
    });
    // precisa esperar completar 20 anos de contribuição (2044), não só a idade
    expect(r.anosContribuicaoNaData).toBeGreaterThanOrEqual(20);
    expect(r.dataElegivel.getFullYear()).toBeGreaterThanOrEqual(2044);
  });

  it('homem jovem cai no teto de 65 anos (transição já saturada)', () => {
    const r = estimarINSS({
      dataNascimento: '1991-02-28',
      inicioContribuicao: '2009-01',
      salarioBruto: 10_500,
      sexo: 'M',
      hoje,
    });
    expect(r.idadeElegivel).toBeCloseTo(65, 1);
    expect(r.idadeMinimaExigida).toBe(65);
  });
});
