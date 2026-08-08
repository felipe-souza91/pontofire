/**
 * O orquestrador: bytes + o que o usuário declarou → itens prontos pra revisão.
 *
 * Nada é salvo aqui. Esta função só decide o que ELA acha, marca o que não
 * conseguiu decidir e devolve tudo pra tela de aprovação. O usuário é a última
 * palavra em cada linha.
 */

import { classificar } from './categorizar';
import { detectarSeparador, extrairRegistros, mapearColunas, parseCSV, type RegistroCSV } from './csv';
import { pareceOFX, parseOFX } from './ofx';
import { chaveEstabelecimento, decodificar, detectarFormatoData, limparMemo, mesDe, parseData } from './texto';
import type {
  AlertaItem,
  ContextoImport,
  Diagnostico,
  FormatoData,
  ItemImportado,
  JaSalvo,
  MemoriaCategoria,
  ResultadoAnalise,
  TipoDocumento,
} from './tipos';

/** Teto de segurança: acima disso a tela de revisão vira inutilizável. */
export const MAX_ITENS = 2000;

export interface EntradaAnalise {
  nome: string;
  bytes: Uint8Array;
  contexto?: ContextoImport;
  /** regras memo→categoria que o usuário já ensinou */
  memoria?: readonly MemoriaCategoria[];
  /** o que já está salvo, pra não importar duas vezes */
  jaSalvos?: readonly JaSalvo[];
}

/** Registro cru, comum a OFX e CSV. */
interface Cru {
  data: string | null;
  descricao: string;
  valor: number;
  sinalConfiavel: boolean;
  fitid?: string;
  categoriaSugerida?: string;
}

// ---------------------------------------------------------------------------

export function analisar(e: EntradaAnalise): ResultadoAnalise {
  const ctx = e.contexto ?? {};
  const { texto, codificacao } = decodificar(e.bytes);
  const avisos: string[] = [];

  return pareceOFX(texto)
    ? montar(lerOFX(texto, ctx, avisos), { codificacao, formato: 'ofx' }, ctx, e, avisos)
    : montar(lerCSV(texto, ctx, avisos), { codificacao, formato: 'csv' }, ctx, e, avisos);
}

// ---------------------------------------------------------------------------
// leitura por formato

interface Lido {
  crus: Cru[];
  documentoDetectado?: TipoDocumento;
  linhasIgnoradas: number;
  formatoData: FormatoData;
  formatoDataCerto: boolean;
  separador?: string;
  colunas?: Record<string, string>;
  periodo?: { inicio: string; fim: string };
  instituicao?: string;
  conta?: string;
}

function lerOFX(texto: string, ctx: ContextoImport, avisos: string[]): Lido {
  const ofx = parseOFX(texto);
  if (ofx.ignorados > 0) {
    avisos.push(`${ofx.ignorados} lançamento(s) do arquivo vieram sem valor e ficaram de fora.`);
  }
  if (!ctx.tipoDocumento && ofx.cartao) {
    avisos.push('Pelo conteúdo, este arquivo é uma fatura de cartão — tratei as compras como despesa.');
  }
  return {
    crus: ofx.transacoes.map((t) => ({
      data: t.data,
      descricao: t.memo,
      valor: t.valor,
      // OFX é especificado: o sinal do TRNAMT é a direção
      sinalConfiavel: true,
      fitid: t.fitid,
    })),
    documentoDetectado: ofx.documento,
    linhasIgnoradas: ofx.ignorados,
    formatoData: 'ymd',
    formatoDataCerto: true,
    periodo: ofx.periodo,
    instituicao: ofx.banco,
    conta: ofx.conta,
  };
}

function lerCSV(texto: string, ctx: ContextoImport, avisos: string[]): Lido {
  const separador = detectarSeparador(texto);
  const linhas = parseCSV(texto, separador);
  const mapa = mapearColunas(linhas);

  if (mapa.porPalpite) {
    avisos.push(
      'Não reconheci o cabeçalho da planilha — deduzi as colunas pelo conteúdo. Confira as datas e os valores antes de aprovar.',
    );
  }
  if (mapa.indices.data === undefined || (mapa.indices.valor === undefined && mapa.indices.credito === undefined)) {
    avisos.push('Não achei coluna de data ou de valor. Se o arquivo tiver cabeçalho, confira se ele está na primeira linha.');
  }

  const { registros, ignoradas } = extrairRegistros(linhas, mapa);

  const det = ctx.formatoData
    ? { formato: ctx.formatoData, certo: true }
    : detectarFormatoData(registros.map((r) => r.dataBruta));
  if (!det.certo && registros.length) {
    avisos.push('As datas são ambíguas (nenhum dia passa de 12). Assumi DD/MM/AAAA — confira na revisão.');
  }

  return {
    crus: registros.map((r: RegistroCSV) => ({
      data: parseData(r.dataBruta, det.formato),
      descricao: r.descricao,
      valor: r.valor ?? 0,
      sinalConfiavel: r.sinalConfiavel,
      categoriaSugerida: r.categoriaSugerida,
    })),
    linhasIgnoradas: ignoradas,
    formatoData: det.formato,
    formatoDataCerto: det.certo,
    separador,
    colunas: Object.keys(mapa.rotulos).length ? (mapa.rotulos as Record<string, string>) : undefined,
  };
}

// ---------------------------------------------------------------------------
// direção: entrada ou saída?

type Politica =
  | { modo: 'sinal'; negativoESaida: boolean }
  | { modo: 'tudo-saida' }
  | { modo: 'incerta' };

/**
 * A decisão mais delicada do importador.
 *
 * - Coluna crédito/débito ou OFX: o sinal é lei.
 * - Sinais misturados num extrato: negativo é saída (convenção universal).
 * - Sinais misturados numa fatura: o sinal da MAIORIA é compra — banco emite
 *   compra positiva ou negativa dependendo do humor, mas estorno é sempre a
 *   minoria.
 * - Tudo negativo: saída, sem ambiguidade em nenhuma convenção.
 * - Tudo positivo: só é seguro numa fatura declarada. Fora isso, pergunta.
 */
export function decidirPolitica(crus: readonly Cru[], documento?: TipoDocumento): Politica {
  if (!crus.length) return { modo: 'incerta' };

  const positivos = crus.filter((c) => c.valor > 0).length;
  const negativos = crus.filter((c) => c.valor < 0).length;

  if (negativos > 0 && positivos > 0) {
    if (documento === 'fatura') return { modo: 'sinal', negativoESaida: negativos >= positivos };
    return { modo: 'sinal', negativoESaida: true };
  }
  if (negativos > 0) return { modo: 'sinal', negativoESaida: true };
  // daqui pra baixo é tudo positivo (ou zero)
  if (documento === 'fatura') return { modo: 'tudo-saida' };
  if (crus.some((c) => c.sinalConfiavel)) return { modo: 'sinal', negativoESaida: true };
  return { modo: 'incerta' };
}

function direcaoDe(valor: number, p: Politica): 'entrada' | 'saida' {
  if (p.modo === 'tudo-saida') return 'saida';
  if (p.modo === 'incerta') return 'saida'; // provisório — o item vai marcado
  const negativo = valor < 0;
  return negativo === p.negativoESaida ? 'saida' : 'entrada';
}

// ---------------------------------------------------------------------------
// montagem final

function montar(
  lido: Lido,
  base: { codificacao: string; formato: 'ofx' | 'csv' },
  ctx: ContextoImport,
  e: EntradaAnalise,
  avisos: string[],
): ResultadoAnalise {
  const documento = ctx.tipoDocumento ?? lido.documentoDetectado;
  const usaveis = lido.crus.filter((c) => c.data !== null && c.valor !== 0);
  const semData = lido.crus.length - usaveis.length;

  const cortados = usaveis.length > MAX_ITENS;
  const lote = cortados ? usaveis.slice(0, MAX_ITENS) : usaveis;
  if (cortados) {
    avisos.push(`O arquivo tem ${usaveis.length} lançamentos. Trouxe os primeiros ${MAX_ITENS} — importe o resto num segundo arquivo.`);
  }

  const politica = decidirPolitica(lote, documento);
  const memoria = e.memoria ?? [];

  const itens: ItemImportado[] = lote.map((c, i) => {
    const direcao = direcaoDe(c.valor, politica);
    const descricao = limparMemo(c.descricao) || '(sem descrição)';
    const chave = chaveEstabelecimento(descricao);
    const cls = classificar(descricao, direcao, memoria, chave);
    const valor = Math.abs(c.valor);
    const data = c.data!;

    const alertas: AlertaItem[] = [];
    if (politica.modo === 'incerta') alertas.push('direcao-incerta');
    if (cls.transferencia) alertas.push('transferencia');
    if (ctx.mesEsperado && mesDe(data) !== ctx.mesEsperado) alertas.push('fora-do-periodo');

    return {
      id: `i${i}`,
      data,
      descricao,
      descricaoOriginal: c.descricao,
      valor,
      tipo: cls.tipo,
      categoria: cls.categoria === 'Transferência' ? '' : cls.categoria || c.categoriaSugerida?.trim() || '',
      incluir: !cls.transferencia,
      motivo: cls.motivo,
      alertas,
      fitid: c.fitid,
      impressao: `${data}|${valor.toFixed(2)}|${chave}`,
      chave,
    };
  });

  marcarDuplicatas(itens, e.jaSalvos ?? []);

  // --- avisos que dependem do resultado final
  if (semData > 0) {
    avisos.push(`${semData} linha(s) sem data válida ou com valor zero ficaram de fora.`);
  }
  if (politica.modo === 'incerta' && itens.length) {
    avisos.push('Não deu pra saber o que é entrada e o que é saída neste arquivo. Marquei tudo como despesa — corrija abaixo antes de salvar.');
  }
  const transf = itens.filter((i) => i.alertas.includes('transferencia')).length;
  if (transf) {
    avisos.push(`${transf} lançamento(s) parecem movimento entre contas suas (pagamento de fatura, aplicação). Vieram desmarcados pra não contar em dobro.`);
  }
  const jaTinha = itens.filter((i) => i.alertas.includes('duplicata-salva')).length;
  if (jaTinha) {
    avisos.push(`${jaTinha} lançamento(s) já estavam no Ponto FIRE e vieram desmarcados.`);
  }
  const repetidos = itens.filter((i) => i.alertas.includes('duplicata-arquivo')).length;
  if (repetidos) {
    avisos.push(`${repetidos} lançamento(s) aparecem mais de uma vez no arquivo. Pode ser compra repetida de verdade — confira.`);
  }
  const fora = itens.filter((i) => i.alertas.includes('fora-do-periodo')).length;
  if (fora) {
    avisos.push(`${fora} lançamento(s) são de outro mês. Eles vão pro mês certo, não pro que você declarou.`);
  }
  const semCat = itens.filter((i) => i.incluir && !i.categoria).length;
  if (semCat) {
    avisos.push(`${semCat} lançamento(s) ficaram sem categoria — categorize antes de salvar (ou salve como "Outros").`);
  }

  const datas = itens.map((i) => i.data).sort();
  const diagnostico: Diagnostico = {
    formato: base.formato,
    codificacao: base.codificacao,
    linhasLidas: itens.length,
    linhasIgnoradas: lido.linhasIgnoradas + semData,
    formatoData: rotuloFormato(lido.formatoData, lido.formatoDataCerto),
    separador: lido.separador,
    colunas: lido.colunas,
    periodo: lido.periodo ?? (datas.length ? { inicio: datas[0]!, fim: datas[datas.length - 1]! } : undefined),
    instituicao: ctx.instituicao || lido.instituicao,
    conta: lido.conta,
    documentoDetectado: documento,
    direcaoIncerta: politica.modo === 'incerta',
  };

  return { itens, diagnostico, avisos };
}

function rotuloFormato(f: FormatoData, certo: boolean): string {
  const nome = f === 'ymd' ? 'AAAA-MM-DD' : f === 'mdy' ? 'MM/DD/AAAA' : 'DD/MM/AAAA';
  return certo ? nome : `${nome} (assumido)`;
}

/**
 * Duplicata em dois níveis:
 *  - contra o que já foi salvo: FITID (garantido pelo banco) ou a impressão
 *    digital. Reimportar o mesmo arquivo vira no-op, que é o comportamento
 *    que evita o susto de ver o gasto do mês dobrar.
 *  - dentro do próprio arquivo: só avisa, porque duas compras iguais no mesmo
 *    dia acontecem de verdade — quem decide é o usuário.
 */
function marcarDuplicatas(itens: ItemImportado[], jaSalvos: readonly JaSalvo[]): void {
  const fitidsSalvos = new Set(jaSalvos.map((j) => j.fitid).filter(Boolean) as string[]);
  const impressoesSalvas = new Set(jaSalvos.map((j) => j.impressao).filter(Boolean) as string[]);
  const vistos = new Set<string>();

  for (const it of itens) {
    if ((it.fitid && fitidsSalvos.has(it.fitid)) || impressoesSalvas.has(it.impressao)) {
      it.alertas.push('duplicata-salva');
      it.incluir = false;
      continue;
    }
    const marca = it.fitid ?? it.impressao;
    if (vistos.has(marca)) {
      it.alertas.push('duplicata-arquivo');
      // FITID repetido é duplicata de verdade; impressão igual pode ser compra repetida
      if (it.fitid) it.incluir = false;
    }
    vistos.add(marca);
  }
}
