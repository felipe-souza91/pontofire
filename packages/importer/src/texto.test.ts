import { describe, it, expect } from 'vitest';
import {
  chaveEstabelecimento,
  decodificar,
  detectarFormatoData,
  normalizar,
  parseData,
  parseNumero,
} from './texto';

describe('parseNumero', () => {
  it('lê os dialetos de dinheiro que os bancos usam', () => {
    expect(parseNumero('1.234,56')).toBeCloseTo(1234.56, 2); // BR
    expect(parseNumero('1,234.56')).toBeCloseTo(1234.56, 2); // US
    expect(parseNumero('-45,90')).toBeCloseTo(-45.9, 2);
    expect(parseNumero('45,90-')).toBeCloseTo(-45.9, 2); // sinal no fim
    expect(parseNumero('(45,90)')).toBeCloseTo(-45.9, 2); // contábil
    expect(parseNumero('R$ 1.234,56')).toBeCloseTo(1234.56, 2);
    expect(parseNumero('  8.475,55 ')).toBeCloseTo(8475.55, 2);
    expect(parseNumero('0,00')).toBe(0);
    expect(parseNumero('120,00 D')).toBeCloseTo(-120, 2); // Bradesco
    expect(parseNumero('120,00 C')).toBeCloseTo(120, 2);
  });

  it('distingue milhar de decimal pelo nº de casas', () => {
    expect(parseNumero('1.234')).toBe(1234); // 3 casas = milhar
    expect(parseNumero('1.23')).toBeCloseTo(1.23, 2); // 2 casas = decimal
    expect(parseNumero('1.234.567,89')).toBeCloseTo(1234567.89, 2);
  });

  it('devolve null pro que não é número', () => {
    expect(parseNumero('')).toBeNull();
    expect(parseNumero('Saldo')).toBeNull();
    expect(parseNumero('12/03/2026')).toBeNull();
    expect(parseNumero('-')).toBeNull();
  });
});

describe('parseData', () => {
  it('lê os formatos comuns', () => {
    expect(parseData('14/08/2026')).toBe('2026-08-14');
    expect(parseData('14-08-2026')).toBe('2026-08-14');
    expect(parseData('14.08.2026')).toBe('2026-08-14');
    expect(parseData('2026-08-14')).toBe('2026-08-14');
    expect(parseData('20260814')).toBe('2026-08-14'); // OFX
    expect(parseData('20260814120000[-3:BRT]')).toBe('2026-08-14');
    expect(parseData('08/14/2026', 'mdy')).toBe('2026-08-14');
  });

  it('completa ano de 2 dígitos na janela certa', () => {
    expect(parseData('14/08/26')).toBe('2026-08-14');
    expect(parseData('14/08/98')).toBe('1998-08-14');
  });

  it('recusa data que não existe', () => {
    expect(parseData('31/02/2026')).toBeNull();
    expect(parseData('32/01/2026')).toBeNull();
    expect(parseData('14/13/2026')).toBeNull();
    expect(parseData('nada')).toBeNull();
  });
});

describe('detectarFormatoData', () => {
  it('usa o dia > 12 como prova de DD/MM', () => {
    const r = detectarFormatoData(['05/03/2026', '14/03/2026', '28/03/2026']);
    expect(r).toEqual({ formato: 'dmy', certo: true });
  });

  it('reconhece MM/DD quando a prova está na 2ª posição', () => {
    const r = detectarFormatoData(['03/05/2026', '03/22/2026']);
    expect(r).toEqual({ formato: 'mdy', certo: true });
  });

  it('reconhece ISO', () => {
    expect(detectarFormatoData(['2026-03-05', '2026-03-14']).formato).toBe('ymd');
  });

  it('sem prova, assume Brasil e avisa que assumiu', () => {
    expect(detectarFormatoData(['03/05/2026', '04/06/2026'])).toEqual({ formato: 'dmy', certo: false });
  });
});

describe('chaveEstabelecimento', () => {
  it('agrupa a mesma loja apesar do código da transação', () => {
    const a = chaveEstabelecimento('UBER *TRIP 8H2K9');
    const b = chaveEstabelecimento('Uber *Trip 91XYZ');
    expect(a).toBe(b);
  });

  it('descarta prefixo de maquininha e de tipo de compra', () => {
    expect(chaveEstabelecimento('PAG*Padaria Sao Jose')).toBe('PADARIA SAO JOSE');
    expect(chaveEstabelecimento('COMPRA CARTAO DROGARIA PACHECO')).toBe('DROGARIA PACHECO');
  });

  it('usa o nome de quem recebeu o PIX', () => {
    expect(chaveEstabelecimento('PIX ENVIADO JOAO DA SILVA')).toBe('JOAO DA SILVA');
  });

  it('nunca devolve vazio', () => {
    expect(chaveEstabelecimento('123 456')).not.toBe('');
    expect(chaveEstabelecimento('*')).not.toBe('');
  });
});

describe('decodificar', () => {
  it('lê UTF-8 e tira o BOM', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from('Alimentação', 'utf-8')]);
    expect(decodificar(bytes)).toEqual({ texto: 'Alimentação', codificacao: 'UTF-8' });
  });

  it('cai pra Windows-1252 quando o arquivo do banco não é UTF-8', () => {
    const bytes = new Uint8Array(Buffer.from('Alimentação e Serviços', 'latin1'));
    const r = decodificar(bytes);
    expect(r.codificacao).toBe('Windows-1252');
    expect(r.texto).toBe('Alimentação e Serviços');
  });
});

describe('normalizar', () => {
  it('tira acento, caixa e pontuação', () => {
    expect(normalizar('Alimentação & Bebidas')).toBe('ALIMENTACAO BEBIDAS');
  });
});
