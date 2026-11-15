import { describe, expect, it } from 'vitest';
import {
  COR_DA_BARRA,
  PREFERENCIA_PADRAO,
  normalizarPreferencia,
  proximaPreferencia,
  resolverTema,
} from './tema';

describe('normalizarPreferencia', () => {
  it('aceita as três escolhas', () => {
    expect(normalizarPreferencia('escuro')).toBe('escuro');
    expect(normalizarPreferencia('claro')).toBe('claro');
    expect(normalizarPreferencia('sistema')).toBe('sistema');
  });

  it('qualquer outra coisa no localStorage vira o padrão', () => {
    for (const lixo of [null, undefined, '', 'light', 'dark', 'CLARO', 42, {}]) {
      expect(normalizarPreferencia(lixo)).toBe(PREFERENCIA_PADRAO);
    }
  });

  it('o padrão é escuro — quem nunca escolheu vê o app como sempre viu', () => {
    expect(PREFERENCIA_PADRAO).toBe('escuro');
  });
});

describe('resolverTema', () => {
  it('escolha explícita ignora o sistema', () => {
    expect(resolverTema('claro', false)).toBe('light');
    expect(resolverTema('escuro', true)).toBe('dark');
  });

  it('"igual ao sistema" segue o sistema', () => {
    expect(resolverTema('sistema', true)).toBe('light');
    expect(resolverTema('sistema', false)).toBe('dark');
  });
});

describe('proximaPreferencia', () => {
  it('o atalho leva sempre pro oposto do que está na tela', () => {
    expect(proximaPreferencia('dark')).toBe('claro');
    expect(proximaPreferencia('light')).toBe('escuro');
  });

  it('tocar duas vezes volta ao tema de partida', () => {
    const ida = resolverTema(proximaPreferencia('dark'), false);
    expect(resolverTema(proximaPreferencia(ida), false)).toBe('dark');
  });
});

describe('cor da barra do sistema', () => {
  it('tem as duas, em hex', () => {
    expect(COR_DA_BARRA.dark).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COR_DA_BARRA.light).toMatch(/^#[0-9A-F]{6}$/i);
    expect(COR_DA_BARRA.dark).not.toBe(COR_DA_BARRA.light);
  });
});
