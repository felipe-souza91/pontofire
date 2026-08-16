import { describe, expect, it } from 'vitest';
import { NOVIDADES, VERSAO_ATUAL, novidadesDesde } from './novidades';

describe('novidadesDesde', () => {
  it('conta anterior ao changelog recebe tudo', () => {
    // `undefined` não é "está em dia": é quem viu os números antigos.
    expect(novidadesDesde(undefined)).toEqual(NOVIDADES);
  });

  it('quem já leu a versão atual não recebe nada', () => {
    expect(novidadesDesde(VERSAO_ATUAL)).toEqual([]);
  });

  it('recebe só o que veio depois do que leu', () => {
    const anterior = '2026-01-01';
    const pendentes = novidadesDesde(anterior);
    expect(pendentes.length).toBeGreaterThan(0);
    expect(pendentes.every((n) => n.versao > anterior)).toBe(true);
  });
});

describe('catálogo', () => {
  it('está do mais recente pro mais antigo', () => {
    // A ordem é o que faz VERSAO_ATUAL ser a atual. Se alguém acrescentar uma
    // versão no fim da lista, contas novas nascem carimbadas com uma versão
    // velha e recebem o modal na primeira entrada — que é o oposto do combinado.
    const versoes = NOVIDADES.map((n) => n.versao);
    expect(versoes).toEqual([...versoes].sort().reverse());
  });

  it('não tem versão repetida', () => {
    const versoes = NOVIDADES.map((n) => n.versao);
    expect(new Set(versoes).size).toBe(versoes.length);
  });

  it('toda versão usa YYYY-MM-DD, que é o que a comparação de string assume', () => {
    for (const n of NOVIDADES) expect(n.versao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('nenhuma versão está vazia de itens', () => {
    for (const n of NOVIDADES) expect(n.itens.length).toBeGreaterThan(0);
  });

  it('correção aparece na lista com o mesmo destaque que novidade (§6)', () => {
    // Um changelog que só se gaba treina o usuário a não ler.
    const tipos = new Set(NOVIDADES.flatMap((n) => n.itens.map((i) => i.tipo)));
    expect(tipos.has('correcao')).toBe(true);
  });
});
