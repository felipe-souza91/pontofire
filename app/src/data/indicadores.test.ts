import { describe, it, expect } from 'vitest';
import { normalizar } from './indicadores';

/**
 * Regressão de um bug que chegou na tela do usuário.
 *
 * Ao adicionar `juroRealHistorico` em `Indicadores`, o objeto que já estava no
 * localStorage (cache diário) continuou sem o campo. Ele chegou no componente
 * como `undefined`, passou por uma guarda `!== null` — porque
 * `undefined !== null` é `true` — e explodiu no `toFixed`, derrubando o Início
 * inteiro.
 *
 * A lição: cache versionado + campo ausente vira `null`, nunca `undefined`.
 */
describe('normalizar — cache do localStorage', () => {
  const completo = {
    selicMeta: 14,
    ipca12m: 4.64,
    inpc12m: 4.5,
    juroReal: 8.94,
    juroRealHistorico: 6.1,
    anosHistorico: 10,
    atualizadoEm: '2026-08-08T12:00:00.000Z',
  };

  it('deixa passar o payload completo sem mexer', () => {
    expect(normalizar(completo)).toEqual(completo);
  });

  it('CAMPO AUSENTE VIRA null, não undefined — o bug em si', () => {
    const antigo = {
      selicMeta: 14,
      ipca12m: 4.64,
      inpc12m: 4.5,
      juroReal: 8.94,
      atualizadoEm: '2026-08-07T12:00:00.000Z',
      // sem juroRealHistorico nem anosHistorico: é o cache da véspera
    };
    const r = normalizar(antigo)!;
    expect(r).not.toBeNull();
    expect(r.juroRealHistorico).toBeNull();
    expect(r.anosHistorico).toBeNull();
    // a garantia que faltava: nenhum campo numérico sai como undefined
    for (const [chave, valor] of Object.entries(r)) {
      expect(valor, chave).not.toBeUndefined();
    }
  });

  it('descarta número inválido em vez de propagar NaN', () => {
    const r = normalizar({ ...completo, juroReal: NaN, selicMeta: Infinity })!;
    expect(r.juroReal).toBeNull();
    expect(r.selicMeta).toBeNull();
  });

  it('rejeita valor de tipo errado vindo de cache corrompido', () => {
    const r = normalizar({ ...completo, ipca12m: '4,64', anosHistorico: '10' })!;
    expect(r.ipca12m).toBeNull();
    expect(r.anosHistorico).toBeNull();
  });

  it('recusa payload que nem é indicador', () => {
    expect(normalizar(null)).toBeNull();
    expect(normalizar('lixo')).toBeNull();
    expect(normalizar(42)).toBeNull();
    expect(normalizar({})).toBeNull(); // sem atualizadoEm não dá pra saber a idade
    expect(normalizar({ atualizadoEm: 123 })).toBeNull();
  });

  it('preserva a data pra decisão de expiração do cache', () => {
    expect(normalizar(completo)!.atualizadoEm).toBe(completo.atualizadoEm);
  });
});
