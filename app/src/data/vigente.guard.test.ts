import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guarda contra a fonte da data se dividir em duas.
 *
 * `custoVidaMensal`, `aporteMensal` e `metaFire` no doc são o DECLARADO — o que
 * o usuário digitou no onboarding. O que vale é o VIGENTE (`estadoVigente`):
 * mediana dos meses lançados, com a meta derivada dela.
 *
 * Ler o declarado direto pra calcular ou exibir produz duas verdades na mesma
 * tela: a data sai da mediana e o card ao lado mostra o número velho. Nenhum
 * teste de unidade pega isso — cada leitura, isolada, parece correta. Foi assim
 * que a meta congelou enquanto o custo andava, e a data passou a MELHORAR
 * quando o gasto PIOROU.
 *
 * A regra é estrutural: fora dos pontos de escrita, os campos declarados não
 * aparecem. Exceção nova entra aqui de propósito e com justificativa.
 */

const RAIZ = new URL('..', import.meta.url).pathname;

/** O declarado, que não pode vazar pros cálculos. */
const CAMPOS = /\.(metaFire|custoVidaMensal|aporteMensal)\b/;

/** Onde ler o campo cru é legítimo — todos são escrita, migração ou fallback. */
const PERMITIDOS = new Set([
  'data/types.ts', // a declaração
  'data/users.ts', // grava o que o onboarding e o perfil mandaram
  'data/migracoes.ts', // reconstrói a partida a partir do que existe
  'data/migracoes.test.ts',
  'routes/Perfil.tsx', // o formulário que edita justamente esses campos
  'routes/Onboarding.tsx', // grava os primeiros valores
  'hooks/usePainel.ts', // monta o vigente e expõe o declarado pra comparação
]);

function arquivosFonte(dir: string, base = ''): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    const rel = base ? `${base}/${nome}` : nome;
    if (statSync(caminho).isDirectory()) {
      saida.push(...arquivosFonte(caminho, rel));
    } else if (/\.tsx?$/.test(nome)) {
      saida.push(rel);
    }
  }
  return saida;
}

describe('ninguém lê o declarado direto', () => {
  it('só os pontos de escrita tocam nos campos crus', () => {
    const infratores = arquivosFonte(RAIZ)
      .filter((rel) => !PERMITIDOS.has(rel) && rel !== 'data/vigente.guard.test.ts')
      .filter((rel) => CAMPOS.test(readFileSync(join(RAIZ, rel), 'utf8')));

    expect(
      infratores,
      `use o estado vigente (usePainel().vigente) em vez do declarado:\n${infratores.join('\n')}`,
    ).toEqual([]);
  });

  it('a guarda pegaria uma leitura nova', () => {
    // sem isto, um erro no varredor deixaria o teste verde pra sempre
    expect(CAMPOS.test('const M = doc.metaFire;')).toBe(true);
    expect(CAMPOS.test('const C = doc.custoVidaMensal;')).toBe(true);
    expect(CAMPOS.test('const A = doc.aporteMensal;')).toBe(true);
    expect(CAMPOS.test('const C = vigente.custo.valor;')).toBe(false);
    expect(CAMPOS.test('aporteMensal: vigente.aporte.valor,')).toBe(false);
  });

  it('a lista de permitidos não apodreceu', () => {
    // exceção que aponta pra arquivo que não existe mais é convite pra colar
    // nome novo nela sem pensar
    const existentes = new Set(arquivosFonte(RAIZ));
    for (const p of PERMITIDOS) expect(existentes.has(p), p).toBe(true);
  });
});
