import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guarda contra o bug voltar.
 *
 * `metaFire` é o valor GRAVADO; a meta que vale é `metaVigente(doc)`, derivada
 * do custo. Ler o campo direto pra calcular faz a meta congelar enquanto o
 * custo anda — foi assim que a data passava a MELHORAR quando o gasto PIORAVA,
 * e nenhum teste de unidade pega isso: cada leitura, isolada, parece correta.
 *
 * Então a regra é estrutural: fora dos pontos de escrita, `.metaFire` não
 * aparece. Se alguém precisar de uma exceção nova, ela entra aqui de propósito
 * e com justificativa — não por descuido.
 */

const RAIZ = new URL('..', import.meta.url).pathname;

/** Onde ler o campo cru é legítimo — todos são escrita ou migração. */
const PERMITIDOS = new Set([
  'data/types.ts', // a declaração
  'data/users.ts', // grava o que o onboarding e o perfil mandaram
  'data/migracoes.ts', // reconstrói a partida a partir do que existe
  'data/migracoes.test.ts',
  'routes/Perfil.tsx', // carrega o valor travado no formulário
  'routes/Onboarding.tsx', // grava a primeira meta
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

describe('ninguém lê metaFire direto', () => {
  it('só os pontos de escrita tocam no campo cru', () => {
    const infratores = arquivosFonte(RAIZ)
      .filter((rel) => !PERMITIDOS.has(rel) && rel !== 'data/meta-vigente.guard.test.ts')
      .filter((rel) => /\.metaFire\b/.test(readFileSync(join(RAIZ, rel), 'utf8')));

    expect(
      infratores,
      `use metaVigente(doc) em vez de doc.metaFire — a meta deriva do custo:\n${infratores.join('\n')}`,
    ).toEqual([]);
  });

  it('a guarda pegaria uma leitura nova', () => {
    // sem isto, um erro no varredor deixaria o teste verde pra sempre
    const regra = /\.metaFire\b/;
    expect(regra.test('const M = doc.metaFire;')).toBe(true);
    expect(regra.test('const M = metaVigente(doc);')).toBe(false);
  });

  it('a lista de permitidos não apodreceu', () => {
    // exceção que aponta pra arquivo que não existe mais é convite pra colar
    // nome novo nela sem pensar
    const existentes = new Set(arquivosFonte(RAIZ));
    for (const p of PERMITIDOS) expect(existentes.has(p), p).toBe(true);
  });
});
