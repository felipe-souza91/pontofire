import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guardas do tema — o tipo de quebra que nenhum teste de função pega.
 *
 * Com dois temas, uma cor escrita à mão é um bug que só aparece no tema em que
 * ninguém está olhando: `rgba(255,255,255,.04)` é um realce sutil no escuro e
 * NADA no claro; `#3FD69B` é legível no escuro e some no branco. Cada linha
 * dessas parece certa sozinha, na tela de quem a escreveu.
 *
 * Então a regra é estrutural: cor só existe em `tokens.css`. O resto do app
 * usa `var(--…)`, e tinta derivada sai de `color-mix()` em cima de um token.
 */

const SRC = join(__dirname, '..');
const TOKENS = join(SRC, 'theme', 'tokens.css');

/** Onde cor literal é legítima. */
const PODE_TER_COR = new Set([
  'theme/tokens.css', // a fonte da verdade
  'theme/Flame.tsx', // a chama é a marca: mesmo gradiente nos dois temas
  'theme/tema.ts', // cor da barra do sistema (meta theme-color não lê CSS)
]);

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(css|tsx|ts)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

/** Tira comentários: `#141838` citado numa explicação não é cor em uso. */
function semComentarios(texto: string): string {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const COR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;

describe('tema — guardas estruturais', () => {
  const todos = arquivos(SRC);

  it('nenhuma cor escrita à mão fora dos tokens', () => {
    const achados: string[] = [];
    for (const caminho of todos) {
      const rel = relative(SRC, caminho).replace(/\\/g, '/');
      if (PODE_TER_COR.has(rel)) continue;
      const linhas = semComentarios(readFileSync(caminho, 'utf8')).split('\n');
      linhas.forEach((linha, i) => {
        // `#fff` puro sobre fundo de marca/perigo é o mesmo nos dois temas
        const limpa = linha.replace(/'#fff'/g, '');
        if (COR_LITERAL.test(limpa)) achados.push(`${rel}:${i + 1}: ${linha.trim().slice(0, 90)}`);
        COR_LITERAL.lastIndex = 0;
      });
    }
    expect(achados, `cor fixa quebra um dos temas — use um token de tokens.css:\n${achados.join('\n')}`).toEqual([]);
  });

  it('toda variável CSS usada existe', () => {
    // `var(--space-5)` não existia: o navegador descarta a declaração inteira em
    // silêncio, e o card de novidades ficou sem padding nenhum durante meses.
    const tokens = readFileSync(TOKENS, 'utf8');
    const definidas = new Set([...tokens.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]!));
    // postas inline pelo componente, no próprio elemento
    for (const local of ['--cor', '--parte']) definidas.add(local);

    const faltando = new Set<string>();
    for (const caminho of todos) {
      const texto = semComentarios(readFileSync(caminho, 'utf8'));
      for (const m of texto.matchAll(/var\((--[a-z0-9-]+)/g)) {
        if (!definidas.has(m[1]!)) faltando.add(`${m[1]} em ${relative(SRC, caminho)}`);
      }
    }
    expect([...faltando], 'variável CSS usada mas nunca definida').toEqual([]);
  });

  it('o tema claro redefine tudo que depende do fundo', () => {
    // esquecer um destes deixa texto claro sobre fundo claro (ou o contrário)
    const tokens = readFileSync(TOKENS, 'utf8');
    const inicio = tokens.indexOf(":root[data-theme='light']");
    expect(inicio).toBeGreaterThan(-1);
    const bloco = tokens.slice(inicio, tokens.indexOf('}', inicio));
    for (const t of [
      '--ink', '--ink-2', '--ink-3', '--paper', '--muted', '--line', '--line-2',
      '--mint', '--ember-2', '--flutuante', '--barra-fundo', '--veu', '--sombra',
      '--serie-voce', '--serie-cdi', '--serie-ipca', '--serie-ritmo', '--serie-data',
      'color-scheme',
    ]) {
      expect(bloco, `tema claro não redefine ${t}`).toMatch(new RegExp(`(^|\\s)${t}\\s*:`, 'm'));
    }
  });

  it('o script do index.html e o tema.ts falam da mesma chave e das mesmas cores', () => {
    const html = readFileSync(join(SRC, '..', 'index.html'), 'utf8');
    const tema = readFileSync(join(SRC, 'theme', 'tema.ts'), 'utf8');
    expect(html).toContain("localStorage.getItem('pf:tema')");
    expect(tema).toContain("CHAVE_TEMA = 'pf:tema'");
    for (const cor of ['#F4F3FA', '#0C0F2E']) {
      expect(html).toContain(cor);
      expect(tema).toContain(cor);
    }
  });
});
