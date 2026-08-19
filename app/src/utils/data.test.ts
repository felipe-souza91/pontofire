import { describe, expect, it } from 'vitest';
import {
  BLOCOS_DATA,
  BLOCOS_MES,
  aplicarTecla,
  digitosParaISO,
  digitosParaMesISO,
  formatarBlocos,
  isoParaDigitos,
  mesISOParaDigitos,
  soDigitos,
} from './data';

describe('formatarBlocos', () => {
  it('põe a barra só entre dígitos', () => {
    expect(formatarBlocos('', BLOCOS_DATA)).toBe('');
    expect(formatarBlocos('1', BLOCOS_DATA)).toBe('1');
    expect(formatarBlocos('15', BLOCOS_DATA)).toBe('15');
    expect(formatarBlocos('150', BLOCOS_DATA)).toBe('15/0');
    expect(formatarBlocos('15081991', BLOCOS_DATA)).toBe('15/08/1991');
  });

  it('não deixa barra sobrando no fim — senão o Backspace trava', () => {
    // '15/' faria a máscara devolver a barra que o Backspace acabou de apagar,
    // e o campo nunca sairia de dois dígitos.
    expect(formatarBlocos('15', BLOCOS_DATA).endsWith('/')).toBe(false);
    expect(formatarBlocos('08', BLOCOS_MES).endsWith('/')).toBe(false);
  });

  it('formata mês', () => {
    expect(formatarBlocos('081991', BLOCOS_MES)).toBe('08/1991');
  });
});

describe('aplicarTecla', () => {
  it('Backspace anda um dígito', () => {
    expect(aplicarTecla('1508', 'Backspace', 8)).toBe('150');
    expect(aplicarTecla('', 'Backspace', 8)).toBe('');
  });

  it('respeita o limite de dígitos', () => {
    expect(aplicarTecla('15081991', '5', 8)).toBe('15081991');
    expect(aplicarTecla('1508199', '1', 8)).toBe('15081991');
  });

  it('ignora tecla que não é dígito', () => {
    expect(aplicarTecla('15', 'a', 8)).toBe('15');
    expect(aplicarTecla('15', '/', 8)).toBe('15');
  });

  it('apagar tudo e redigitar volta ao mesmo lugar', () => {
    let d = '15081991';
    for (let k = 0; k < 8; k++) d = aplicarTecla(d, 'Backspace', 8);
    expect(d).toBe('');
    for (const t of '15081991') d = aplicarTecla(d, t, 8);
    expect(d).toBe('15081991');
  });
});

describe('digitosParaISO', () => {
  it('converte data completa', () => {
    expect(digitosParaISO('15081991')).toBe('1991-08-15');
  });

  it('data incompleta não vira valor', () => {
    // meia data gravada é pior que campo vazio: parece resposta
    expect(digitosParaISO('1508199')).toBe('');
    expect(digitosParaISO('')).toBe('');
  });

  it('rejeita dia que não existe no mês', () => {
    expect(digitosParaISO('31021991')).toBe('');
    expect(digitosParaISO('29022001')).toBe('');
    expect(digitosParaISO('29022000')).toBe('2000-02-29'); // bissexto de verdade
  });

  it('rejeita mês e dia fora de faixa', () => {
    expect(digitosParaISO('15131991')).toBe('');
    expect(digitosParaISO('00081991')).toBe('');
  });

  it('rejeita data futura por padrão', () => {
    const ano = new Date().getFullYear();
    expect(digitosParaISO(`0101${ano + 5}`)).toBe('');
  });

  it('respeita a faixa informada', () => {
    expect(digitosParaISO('15081991', { minimo: '2000-01-01' })).toBe('');
    expect(digitosParaISO('15082020', { maximo: '2010-01-01' })).toBe('');
  });

  it('vai e volta', () => {
    expect(isoParaDigitos(digitosParaISO('15081991'))).toBe('15081991');
    expect(isoParaDigitos('')).toBe('');
    expect(isoParaDigitos('1991-08')).toBe('');
  });
});

describe('digitosParaMesISO', () => {
  it('converte mês completo', () => {
    expect(digitosParaMesISO('081991')).toBe('1991-08');
  });

  it('rejeita mês fora de 1..12', () => {
    expect(digitosParaMesISO('131991')).toBe('');
    expect(digitosParaMesISO('001991')).toBe('');
  });

  it('rejeita incompleto e futuro', () => {
    expect(digitosParaMesISO('08199')).toBe('');
    expect(digitosParaMesISO(`01${new Date().getFullYear() + 5}`)).toBe('');
  });

  it('vai e volta', () => {
    expect(mesISOParaDigitos(digitosParaMesISO('081991'))).toBe('081991');
    expect(mesISOParaDigitos('1991-08-15')).toBe('');
  });
});

describe('soDigitos', () => {
  it('tira barra e corta no limite (colar)', () => {
    expect(soDigitos('15/08/1991', 8)).toBe('15081991');
    expect(soDigitos('15/08/1991', 6)).toBe('150819');
    expect(soDigitos('abc', 8)).toBe('');
  });
});
