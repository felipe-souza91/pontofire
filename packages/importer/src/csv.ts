/**
 * CSV — extratos, faturas e planilhas do próprio usuário.
 *
 * Não tem adaptador por banco: em vez de manter uma lista que envelhece a cada
 * mudança de layout, o parser descobre separador, cabeçalho e o papel de cada
 * coluna por heurística. O que ele entendeu vai pro diagnóstico, e o usuário
 * confere na tela de revisão antes de qualquer coisa ser salva.
 */

import { normalizar, pareceNumero, parseData, parseNumero } from './texto';

// ---------------------------------------------------------------------------
// leitura

/** Conta o separador que produz o maior nº de colunas com mais consistência. */
export function detectarSeparador(texto: string): string {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim()).slice(0, 30);
  if (!linhas.length) return ',';

  let melhor = ',';
  let melhorNota = -1;
  for (const sep of [';', ',', '\t', '|']) {
    const contagens = linhas.map((l) => dividirLinha(l, sep).length);
    const max = Math.max(...contagens);
    if (max < 2) continue;
    // consistência: quantas linhas têm o nº de colunas mais comum
    const moda = maisComum(contagens);
    const consistentes = contagens.filter((c) => c === moda).length / contagens.length;
    const nota = moda * consistentes;
    if (nota > melhorNota) {
      melhorNota = nota;
      melhor = sep;
    }
  }
  return melhor;
}

function maisComum(ns: number[]): number {
  const c = new Map<number, number>();
  for (const n of ns) c.set(n, (c.get(n) ?? 0) + 1);
  let melhor = ns[0] ?? 0;
  let qtd = 0;
  for (const [n, q] of c) {
    if (q > qtd || (q === qtd && n > melhor)) {
      melhor = n;
      qtd = q;
    }
  }
  return melhor;
}

/** Quebra uma linha respeitando aspas ("a;b" fica inteiro) e "" escapado. */
function dividirLinha(linha: string, sep: string): string[] {
  const out: string[] = [];
  let campo = '';
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i]!;
    if (aspas) {
      if (ch === '"') {
        if (linha[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += ch;
    } else if (ch === '"') {
      aspas = true;
    } else if (ch === sep) {
      out.push(campo.trim());
      campo = '';
    } else {
      campo += ch;
    }
  }
  out.push(campo.trim());
  return out;
}

/** Texto → matriz. Trata quebra de linha dentro de aspas. */
export function parseCSV(texto: string, sep: string): string[][] {
  const linhas: string[] = [];
  let atual = '';
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]!;
    if (ch === '"') {
      aspas = !aspas;
      atual += ch;
    } else if (!aspas && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      linhas.push(atual);
      atual = '';
    } else {
      atual += ch;
    }
  }
  if (atual) linhas.push(atual);

  return linhas
    .map((l) => dividirLinha(l, sep))
    .filter((cs) => cs.some((c) => c !== ''));
}

// ---------------------------------------------------------------------------
// mapeamento de colunas

export type Papel = 'data' | 'descricao' | 'valor' | 'credito' | 'debito' | 'categoria' | 'natureza';

export interface MapaColunas {
  /** índice da linha de cabeçalho; -1 quando não achou */
  cabecalhoEm: number;
  indices: Partial<Record<Papel, number>>;
  /** papel → rótulo original, pro diagnóstico */
  rotulos: Partial<Record<Papel, string>>;
  /** true quando o mapa saiu de palpite posicional, não de cabeçalho */
  porPalpite: boolean;
}

/** Palavras que identificam o papel da coluna, da mais específica pra menos. */
const CHAVES: [Papel, string[]][] = [
  ['credito', ['CREDITO', 'ENTRADA', 'ENTRADAS', 'RECEITA', 'RECEITAS', 'CREDIT']],
  ['debito', ['DEBITO', 'SAIDA', 'SAIDAS', 'DESPESA', 'DESPESAS', 'DEBIT']],
  ['categoria', ['CATEGORIA', 'CATEGORY', 'CLASSIFICACAO', 'CLASSE']],
  ['natureza', ['NATUREZA', 'TIPO', 'TYPE', 'OPERACAO', 'D C', 'DC']],
  [
    'descricao',
    [
      'DESCRICAO', 'DESCRIPTION', 'HISTORICO', 'LANCAMENTO', 'LANCAMENTOS', 'MEMO', 'TITLE',
      'TITULO', 'ESTABELECIMENTO', 'DETALHE', 'DETALHES', 'OBSERVACAO', 'MOVIMENTACAO', 'NOME',
    ],
  ],
  ['valor', ['VALOR', 'AMOUNT', 'MONTANTE', 'QUANTIA', 'VALOR R', 'VALOR BRL', 'VL']],
  ['data', ['DATA', 'DATE', 'DATA LANCAMENTO', 'DATA MOVIMENTO', 'DATA COMPRA', 'DT', 'DIA']],
];

/** Colunas que nunca devem virar valor/descrição, mesmo parecendo. */
const IGNORAR = [
  'SALDO', 'BALANCE', 'IDENTIFICADOR', 'DOCUMENTO', 'DOCTO', 'AGENCIA', 'CONTA',
  'DEPENDENCIA', 'NUMERO DO DOCUMENTO', 'DATA DO BALANCETE', 'PARCELA',
];

function papelDoCabecalho(celula: string): Papel | null {
  const n = normalizar(celula);
  if (!n) return null;
  if (IGNORAR.some((k) => n === k || n.startsWith(k + ' '))) return null;
  for (const [papel, chaves] of CHAVES) {
    for (const k of chaves) {
      if (n === k || n.startsWith(k + ' ') || n.endsWith(' ' + k)) return papel;
    }
  }
  return null;
}

/**
 * Acha o cabeçalho nas primeiras linhas (Bradesco e BB jogam lixo antes) e
 * mapeia os papéis. Sem cabeçalho reconhecível, cai no palpite posicional.
 */
export function mapearColunas(linhas: string[][]): MapaColunas {
  let melhor = { linha: -1, indices: {} as Partial<Record<Papel, number>>, rotulos: {} as Partial<Record<Papel, string>>, nota: 0 };

  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    const linha = linhas[i]!;
    const indices: Partial<Record<Papel, number>> = {};
    const rotulos: Partial<Record<Papel, string>> = {};
    linha.forEach((celula, j) => {
      const papel = papelDoCabecalho(celula);
      if (papel && indices[papel] === undefined) {
        indices[papel] = j;
        rotulos[papel] = celula.trim();
      }
    });
    // precisa de data + (valor ou crédito/débito) pra valer como cabeçalho
    const temValor = indices.valor !== undefined || indices.credito !== undefined || indices.debito !== undefined;
    const nota = Object.keys(indices).length + (indices.data !== undefined && temValor ? 10 : 0);
    if (nota > melhor.nota) melhor = { linha: i, indices, rotulos, nota };
  }

  if (melhor.nota >= 10) {
    return validarNatureza(linhas, {
      cabecalhoEm: melhor.linha,
      indices: melhor.indices,
      rotulos: melhor.rotulos,
      porPalpite: false,
    });
  }
  return palpitePosicional(linhas);
}

/**
 * Vocabulário de uma coluna de natureza de verdade. "TRANSACTION_TYPE" do
 * Mercado Pago casa com a palavra `TYPE`, mas o conteúdo dela é a descrição
 * do lançamento — e mapear errado custava TODAS as descrições do arquivo.
 */
const NATUREZA_VALIDA = /^(D|C|DEBITO|CREDITO|ENTRADA|SAIDA|RECEITA|DESPESA|DEB|CRED)$/;

/**
 * Confere se a coluna marcada como `natureza` realmente carrega D/C.
 * Se o conteúdo for texto livre, ela é rebaixada — e vira `descricao` quando
 * ainda não houver uma.
 */
function validarNatureza(linhas: string[][], mapa: MapaColunas): MapaColunas {
  const j = mapa.indices.natureza;
  if (j === undefined) return mapa;

  const amostra = linhas
    .slice(mapa.cabecalhoEm + 1, mapa.cabecalhoEm + 40)
    .map((l) => normalizar(l[j] ?? ''))
    .filter(Boolean);

  const parecemNatureza = amostra.filter((v) => NATUREZA_VALIDA.test(v)).length;
  if (amostra.length === 0 || parecemNatureza >= amostra.length * 0.8) return mapa;

  const indices = { ...mapa.indices };
  const rotulos = { ...mapa.rotulos };
  delete indices.natureza;
  if (indices.descricao === undefined) {
    indices.descricao = j;
    rotulos.descricao = mapa.rotulos.natureza;
  }
  delete rotulos.natureza;
  return { ...mapa, indices, rotulos };
}

/** Sem cabeçalho: olha o conteúdo das colunas e chuta — sempre avisando. */
function palpitePosicional(linhas: string[][]): MapaColunas {
  const amostra = linhas.slice(0, 60);
  const nCols = Math.max(...amostra.map((l) => l.length), 0);
  const datas: number[] = [];
  const numeros: number[] = [];
  const textos: number[] = [];

  for (let j = 0; j < nCols; j++) {
    let d = 0;
    let n = 0;
    let t = 0;
    for (const l of amostra) {
      const c = l[j] ?? '';
      if (!c) continue;
      if (parseData(c) !== null) d++;
      else if (pareceNumero(c)) n++;
      else t += c.length;
    }
    datas[j] = d;
    numeros[j] = n;
    textos[j] = t;
  }

  const indices: Partial<Record<Papel, number>> = {};
  const iData = melhorIndice(datas);
  if (iData >= 0) indices.data = iData;
  const iValor = melhorIndice(numeros.map((v, j) => (j === indices.data ? 0 : v)));
  if (iValor >= 0) indices.valor = iValor;
  const iDesc = melhorIndice(textos.map((v, j) => (j === indices.data || j === indices.valor ? 0 : v)));
  if (iDesc >= 0) indices.descricao = iDesc;

  return { cabecalhoEm: -1, indices, rotulos: {}, porPalpite: true };
}

function melhorIndice(pontos: number[]): number {
  let melhor = -1;
  let max = 0;
  pontos.forEach((p, j) => {
    if (p > max) {
      max = p;
      melhor = j;
    }
  });
  return melhor;
}

// ---------------------------------------------------------------------------
// linhas → registros

export interface RegistroCSV {
  dataBruta: string;
  descricao: string;
  /** quem recebeu ou enviou — vem das linhas de continuação (Bradesco) */
  contraparte?: string;
  /** já com sinal quando dá pra saber; null quando não tem número */
  valor: number | null;
  /** true quando o sinal veio de coluna crédito/débito ou natureza (confiável) */
  sinalConfiavel: boolean;
  categoriaSugerida?: string;
}

/** Aplica o mapa nas linhas de dados. Linha sem data OU sem valor é ignorada. */
export function extrairRegistros(
  linhas: string[][],
  mapa: MapaColunas,
): { registros: RegistroCSV[]; ignoradas: number } {
  const inicio = mapa.cabecalhoEm + 1;
  const { indices } = mapa;
  const registros: RegistroCSV[] = [];
  let ignoradas = 0;

  for (let i = inicio; i < linhas.length; i++) {
    const linha = linhas[i]!;
    const dataBruta = celula(linha, indices.data);
    const descricao = celula(linha, indices.descricao);

    let valor: number | null = null;
    let sinalConfiavel = false;

    if (indices.credito !== undefined || indices.debito !== undefined) {
      const c = parseNumero(celula(linha, indices.credito)) ?? 0;
      const d = parseNumero(celula(linha, indices.debito)) ?? 0;
      if (c !== 0 || d !== 0) {
        valor = Math.abs(c) - Math.abs(d);
        sinalConfiavel = true;
      }
    }
    if (valor === null && indices.valor !== undefined) {
      valor = parseNumero(celula(linha, indices.valor));
      if (valor !== null && indices.natureza !== undefined) {
        const nat = normalizar(celula(linha, indices.natureza));
        if (/^(D|DEBITO|SAIDA|DESPESA)/.test(nat)) {
          valor = -Math.abs(valor);
          sinalConfiavel = true;
        } else if (/^(C|CREDITO|ENTRADA|RECEITA)/.test(nat)) {
          valor = Math.abs(valor);
          sinalConfiavel = true;
        }
      }
    }

    if (valor === null || !dataBruta || parseData(dataBruta) === null) {
      // Linha sem data e sem valor, mas COM texto, logo depois de um
      // lançamento: é continuação. O Bradesco põe aí o nome de quem recebeu
      // ou enviou ("Des: Fulano", "Rem: Fulano", o nome do empregador) — a
      // informação que mais ajuda a identificar a transação.
      const anterior = registros[registros.length - 1];
      const texto = continuacao(linha);
      if (anterior && valor === null && texto && !anterior.contraparte) {
        anterior.contraparte = texto;
        continue;
      }
      // cabeçalho repetido, linha de total, rodapé — some sem drama
      if (linha.some((c) => c !== '')) ignoradas++;
      continue;
    }

    registros.push({
      dataBruta,
      descricao,
      valor,
      sinalConfiavel,
      categoriaSugerida: celula(linha, indices.categoria) || undefined,
    });
  }

  return { registros, ignoradas };
}

function celula(linha: string[], i: number | undefined): string {
  return i === undefined ? '' : (linha[i] ?? '').trim();
}

/**
 * Rodapé e títulos de seção que o Bradesco emenda no fim do arquivo. Sem esse
 * filtro, "Os dados acima têm como base…" e "Saldos Invest Fácil" grudavam na
 * última transação — e o segundo ainda a classificava como aporte.
 */
const RUIDO_DE_RODAPE = /(os dados acima|sujeitos a altera|ultimos lan|últimos lan|saldos invest|saldo anterior|^total$)/i;

/** O texto útil de uma linha de continuação: a célula mais longa que não é número nem data. */
function continuacao(linha: string[]): string {
  const candidatos = linha
    .map((c) => c.trim())
    .filter((c) => c.length > 2 && c.length <= 60 && parseData(c) === null && !pareceNumero(c))
    .filter((c) => !RUIDO_DE_RODAPE.test(c));
  if (!candidatos.length) return '';
  const texto = candidatos.reduce((a, b) => (b.length > a.length ? b : a));
  // "Des: Fulano 04/07", "Rem: Fulano", "Remet.amazon" — tira o prefixo e a
  // data solta do fim. Remet ANTES de Rem, senão sobra "et.amazon".
  return texto.replace(/^(Remet|Des|Rem)\.?:?\s*/i, '').replace(/\s+\d{2}\/\d{2}$/, '').trim();
}
