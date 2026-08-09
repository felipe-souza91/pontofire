/**
 * Normalização de texto, número e data.
 *
 * É a parte chata e a que mais quebra na prática: banco brasileiro exporta em
 * Windows-1252, com vírgula decimal, ponto de milhar e data DD/MM — e cada um
 * de um jeito. Tudo aqui é puro e testado caso a caso.
 */

import type { FormatoData } from './tipos';

// ---------------------------------------------------------------------------
// codificação

/**
 * Decodifica os bytes tentando UTF-8 primeiro. Arquivo de banco que não é
 * UTF-8 quase sempre é Windows-1252 (superset do Latin-1) — é o fallback.
 */
export function decodificar(bytes: Uint8Array): { texto: string; codificacao: string } {
  // BOM UTF-8
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { texto: new TextDecoder('utf-8').decode(bytes.subarray(3)), codificacao: 'UTF-8' };
  }
  try {
    return { texto: new TextDecoder('utf-8', { fatal: true }).decode(bytes), codificacao: 'UTF-8' };
  } catch {
    return { texto: new TextDecoder('windows-1252').decode(bytes), codificacao: 'Windows-1252' };
  }
}

// ---------------------------------------------------------------------------
// texto

/** MAIÚSCULAS, sem acento, sem pontuação — base de toda comparação. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Espaços colapsados e aparados — o memo como o usuário vai ler. */
export function limparMemo(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Prefixos de adquirente/maquininha que só poluem a identificação. */
const RUIDO = [
  'COMPRA CARTAO',
  'COMPRA COM CARTAO',
  'CARTAO DE DEBITO',
  'CARTAO DEBITO',
  'CARTAO CREDITO',
  'DEBITO AUTOMATICO',
  'PAGAMENTO PIX',
  'PIX ENVIADO',
  'PIX RECEBIDO',
  'PIX TRANSF',
  'TRANSFERENCIA ENVIADA',
  'TRANSFERENCIA RECEBIDA',
  'TED ENVIADA',
  'TED RECEBIDA',
  'COMPRA NACIONAL',
  'COMPRA INTERNACIONAL',
];

/** Marcas de maquininha coladas no nome: PAG*, MP*, PP*, IFD*, EC*. */
const PREFIXO_ADQUIRENTE = /^(PAG|PAGS|PAGSEGURO|MP|MERCPAGO|PP|PAYPAL|IFD|EC|SUM|STONE|CIELO|REDE)\s+/;

/**
 * Chave do estabelecimento: agrupa "UBER *TRIP 8H2K" e "UBER *TRIP 91XY" no
 * mesmo balde. É o que a memória memo→categoria guarda.
 */
export function chaveEstabelecimento(descricao: string): string {
  let s = normalizar(descricao);
  for (const r of RUIDO) {
    if (s.startsWith(r)) {
      s = s.slice(r.length).trim();
      break;
    }
  }
  s = s.replace(PREFIXO_ADQUIRENTE, '');

  // A primeira palavra é o nome da loja e fica sempre. Depois dela, qualquer
  // palavra com dígito é código de autorização ou parcela ("8H2K9", "03 10")
  // e só atrapalha o agrupamento.
  const uteis = s
    .split(' ')
    .filter(Boolean)
    .filter((p, i) => (i === 0 ? true : p.length > 1 && !/\d/.test(p)));

  return uteis.slice(0, 3).join(' ') || limparMemo(descricao).toUpperCase().slice(0, 24) || 'SEM DESCRICAO';
}

// ---------------------------------------------------------------------------
// número

/**
 * Lê dinheiro em qualquer dialeto: "1.234,56", "1,234.56", "-45,90",
 * "45,90-", "(45,90)", "R$ 1.234,56". Devolve null quando não é número.
 *
 * Regra do separador decimal: quando aparecem os dois, vale o último; quando
 * aparece só um, ele é decimal se sobrarem 1 ou 2 dígitos depois (3 dígitos é
 * separador de milhar).
 */
export function parseNumero(bruto: string): number | null {
  let s = bruto.trim();
  if (!s) return null;

  let negativo = false;
  if (/^\(.*\)$/.test(s)) {
    negativo = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/R\$| |\s/gi, '');
  if (s.startsWith('-') || s.startsWith('+')) {
    negativo = s.startsWith('-');
    s = s.slice(1);
  } else if (s.endsWith('-')) {
    // alguns extratos põem o sinal depois: "45,90-"
    negativo = true;
    s = s.slice(0, -1);
  } else if (s.endsWith('D') || s.endsWith('C')) {
    // Bradesco/Itaú às vezes marcam D(ébito)/C(rédito) no fim
    negativo = s.endsWith('D');
    s = s.slice(0, -1);
  }
  if (!s || !/^[\d.,]+$/.test(s)) return null;

  const p = s.lastIndexOf('.');
  const v = s.lastIndexOf(',');
  let corte = -1;
  if (p >= 0 && v >= 0) corte = Math.max(p, v);
  else if (v >= 0) corte = s.length - v - 1 <= 2 ? v : -1;
  else if (p >= 0) corte = s.length - p - 1 <= 2 ? p : -1;

  const inteiro = (corte >= 0 ? s.slice(0, corte) : s).replace(/[.,]/g, '');
  const frac = corte >= 0 ? s.slice(corte + 1) : '';
  if (!/^\d*$/.test(inteiro) || !/^\d*$/.test(frac)) return null;

  const n = Number(`${inteiro || '0'}.${frac || '0'}`);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

/** Serve pra decidir se uma coluna é numérica sem se importar com o valor. */
export function pareceNumero(s: string): boolean {
  return parseNumero(s) !== null;
}

// ---------------------------------------------------------------------------
// data

const SEPARADORES = /[/\-.]/;

interface Partes {
  a: number;
  b: number;
  c: number;
  /** o ano estava na frente? */
  anoPrimeiro: boolean;
}

function partir(s: string): Partes | null {
  const t = s.trim();
  // OFX: 20260115 ou 20260115120000[-3:BRT]
  const compacto = /^(\d{4})(\d{2})(\d{2})/.exec(t);
  if (compacto && !SEPARADORES.test(t.slice(0, 10))) {
    return { a: +compacto[1]!, b: +compacto[2]!, c: +compacto[3]!, anoPrimeiro: true };
  }
  const m = /^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{2,4})/.exec(t);
  if (!m) return null;
  const a = +m[1]!;
  const b = +m[2]!;
  const c = +m[3]!;
  return { a, b, c, anoPrimeiro: m[1]!.length === 4 };
}

function completaAno(y: number): number {
  if (y >= 100) return y;
  // 70..99 → 1970..1999; 00..69 → 2000..2069
  return y >= 70 ? 1900 + y : 2000 + y;
}

function iso(ano: number, mes: number, dia: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || ano < 1900 || ano > 2200) return null;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Descobre o formato olhando o arquivo inteiro: se algum dia passa de 12 na
 * primeira posição, é DD/MM; se passa na segunda, é MM/DD. Sem evidência,
 * assume DD/MM (Brasil) — e o chamador avisa que assumiu.
 */
export function detectarFormatoData(amostras: readonly string[]): { formato: FormatoData; certo: boolean } {
  let ymd = 0;
  let dmy = 0;
  let mdy = 0;
  let total = 0;

  for (const s of amostras) {
    const p = partir(s);
    if (!p) continue;
    total++;
    if (p.anoPrimeiro) {
      ymd++;
      continue;
    }
    if (p.a > 12) dmy++;
    if (p.b > 12) mdy++;
  }

  if (total === 0) return { formato: 'dmy', certo: false };
  if (ymd > total / 2) return { formato: 'ymd', certo: true };
  if (dmy > 0 && mdy === 0) return { formato: 'dmy', certo: true };
  if (mdy > 0 && dmy === 0) return { formato: 'mdy', certo: true };
  // ambíguo (ou contraditório): Brasil manda
  return { formato: 'dmy', certo: false };
}

/** Converte pra YYYY-MM-DD. Devolve null quando não é data de verdade. */
export function parseData(bruto: string, formato: FormatoData = 'dmy'): string | null {
  const p = partir(bruto);
  if (!p) return null;
  if (p.anoPrimeiro) return iso(p.a, p.b, p.c);
  if (formato === 'mdy') return iso(completaAno(p.c), p.a, p.b);
  return iso(completaAno(p.c), p.b, p.a);
}

/** "2026-08-14" → "2026-08" */
export function mesDe(dataIso: string): string {
  return dataIso.slice(0, 7);
}
