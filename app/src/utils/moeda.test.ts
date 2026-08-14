import { describe, it, expect } from 'vitest';
import {
  aplicarTecla,
  digitosParaValor,
  formatarDigitos,
  soDigitos,
  valorParaDigitos,
} from './moeda';

/** Digita uma sequência do zero, como quem vai batendo as teclas. */
const digitar = (teclas: string) =>
  [...teclas].reduce((acc, t) => aplicarTecla(acc, t), '');

describe('odômetro — os dígitos entram pela direita', () => {
  it('o exemplo que a usuária descreveu', () => {
    expect(formatarDigitos(digitar('1'))).toBe('0,01');
    expect(formatarDigitos(digitar('12'))).toBe('0,12');
    expect(formatarDigitos(digitar('125'))).toBe('1,25');
    expect(formatarDigitos(digitar('1250'))).toBe('12,50');
  });

  it('milhar aparece sozinho enquanto se digita', () => {
    expect(formatarDigitos(digitar('800000'))).toBe('8.000,00');
    expect(formatarDigitos(digitar('123456789'))).toBe('1.234.567,89');
  });

  it('campo vazio não mostra zero — mostra nada (o placeholder cobre)', () => {
    expect(formatarDigitos('')).toBe('');
  });

  it('zeros à esquerda não grudam', () => {
    expect(formatarDigitos(digitar('000125'))).toBe('1,25');
  });

  it('a casa dos centavos nunca some', () => {
    // o campo antigo mostrava "8.000" pra inteiro e "8.000,50" pra quebrado
    expect(formatarDigitos(digitar('800000'))).toBe('8.000,00');
    expect(formatarDigitos(digitar('800050'))).toBe('8.000,50');
  });
});

describe('backspace apaga um dígito, não um caractere', () => {
  it('desfaz na ordem inversa da digitação', () => {
    let d = digitar('1250');
    expect(formatarDigitos(d)).toBe('12,50');
    d = aplicarTecla(d, 'Backspace');
    expect(formatarDigitos(d)).toBe('1,25');
    d = aplicarTecla(d, 'Backspace');
    expect(formatarDigitos(d)).toBe('0,12');
  });

  it('atravessa a vírgula e o ponto de milhar sem travar', () => {
    // "8.000,00" → apagar 2 vezes tem que dar "80,00", não mexer na pontuação
    let d = digitar('800000');
    d = aplicarTecla(aplicarTecla(d, 'Backspace'), 'Backspace');
    expect(formatarDigitos(d)).toBe('80,00');
  });

  it('backspace no campo vazio não quebra', () => {
    expect(aplicarTecla('', 'Backspace')).toBe('');
  });

  it('tecla que não é dígito nem backspace é ignorada', () => {
    const d = digitar('125');
    for (const t of [',', '.', 'a', 'Enter', 'ArrowLeft', '-']) {
      expect(aplicarTecla(d, t), t).toBe(d);
    }
  });
});

describe('dígitos ↔ valor', () => {
  it('os dois últimos dígitos são sempre os centavos', () => {
    expect(digitosParaValor('1')).toBe(0.01);
    expect(digitosParaValor('125')).toBe(1.25);
    expect(digitosParaValor('800000')).toBe(8_000);
  });

  it('vazio é zero', () => {
    expect(digitosParaValor('')).toBe(0);
  });

  it('ida e volta preserva o valor', () => {
    for (const v of [0.01, 1.25, 47.9, 8_000, 11_890.11, 1_234_567.89]) {
      expect(digitosParaValor(valorParaDigitos(v)), String(v)).toBeCloseTo(v, 2);
    }
  });

  it('float sujo não perde centavo na volta', () => {
    // 8000.499999999999 truncado viraria 8000,49
    expect(valorParaDigitos(8_000.499999999999)).toBe('800050');
  });

  it('valor zero ou negativo vira campo vazio', () => {
    expect(valorParaDigitos(0)).toBe('');
    expect(valorParaDigitos(-5)).toBe('');
    expect(valorParaDigitos(NaN)).toBe('');
  });
});

describe('colar e teclado virtual', () => {
  it('extrai só os dígitos de um texto colado', () => {
    expect(formatarDigitos(soDigitos('R$ 11.890,11'))).toBe('11.890,11');
    expect(formatarDigitos(soDigitos('1234.56'))).toBe('1.234,56');
    expect(soDigitos('abc')).toBe('');
  });

  it('trava o comprimento pra não estourar a precisão do double', () => {
    const enorme = '9'.repeat(30);
    expect(soDigitos(enorme)).toHaveLength(15);
    expect(Number.isSafeInteger(Number(soDigitos(enorme)))).toBe(true);
  });
});

describe('caminho do teclado virtual (celular)', () => {
  /**
   * No celular o keydown não traz a tecla, então o campo cai no onChange e o
   * que chega é o TEXTO INTEIRO já alterado pelo navegador. Simula isso.
   */
  const noCelular = (exibido: string, edicao: (t: string) => string) =>
    formatarDigitos(soDigitos(edicao(exibido)));

  const apagarUltimo = (t: string) => t.slice(0, -1);

  it('digitar acrescenta pela direita', () => {
    expect(noCelular('1,25', (t) => t + '5')).toBe('12,55');
    expect(noCelular('', (t) => t + '7')).toBe('0,07');
  });

  it('apagar anda um dígito', () => {
    expect(noCelular('8.000,00', apagarUltimo)).toBe('800,00');
    expect(noCelular('1,25', apagarUltimo)).toBe('0,12');
  });

  it('NÃO fica preso no zero ao apagar até o fim', () => {
    // "0,01" → apagar dava dígitos "00" → voltava a exibir "0,00" pra sempre
    let t = '0,01';
    for (let i = 0; i < 5; i++) t = noCelular(t, apagarUltimo);
    expect(t).toBe('');
  });

  it('chega ao mesmo lugar que o teclado físico', () => {
    let virtual = '';
    for (const d of '1250') virtual = noCelular(virtual, (t) => t + d);
    expect(virtual).toBe(formatarDigitos(digitar('1250')));
  });
});
