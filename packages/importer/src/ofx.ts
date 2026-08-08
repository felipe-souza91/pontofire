/**
 * Parser de OFX — o formato que quase todo banco brasileiro exporta.
 *
 * Aceita as duas famílias sem precisar de biblioteca:
 *  - OFX 1.x (SGML): tags sem fechamento, `<MEMO>UBER *TRIP` até o fim da linha;
 *  - OFX 2.x (XML): tags fechadas normalmente.
 *
 * A leitura é tolerante de propósito: valor de tag é "tudo até o próximo `<`
 * ou fim de linha". Isso funciona nas duas famílias e não quebra com arquivo
 * mal formado, que é a regra e não a exceção.
 */

import { parseData, parseNumero } from './texto';
import type { TipoDocumento } from './tipos';

export interface OfxTransacao {
  /** DEBIT, CREDIT, PAYMENT, XFER… quando o banco manda */
  trntype?: string;
  /** YYYY-MM-DD */
  data: string | null;
  /** com sinal, exatamente como veio */
  valor: number;
  memo: string;
  fitid?: string;
}

export interface OfxDoc {
  transacoes: OfxTransacao[];
  /** true quando o arquivo é de cartão de crédito (CCSTMTRS) */
  cartao: boolean;
  documento: TipoDocumento;
  banco?: string;
  conta?: string;
  moeda?: string;
  periodo?: { inicio: string; fim: string };
  /** blocos que existiam mas não deram pra ler */
  ignorados: number;
}

/** `<TAG>valor` — funciona com e sem fechamento. */
function tag(bloco: string, nome: string): string | undefined {
  const re = new RegExp(`<${nome}>([^<\\r\\n]*)`, 'i');
  const m = re.exec(bloco);
  const v = m?.[1]?.trim();
  return v ? v : undefined;
}

export function pareceOFX(texto: string): boolean {
  const cabeca = texto.slice(0, 2048).toUpperCase();
  return cabeca.includes('OFXHEADER') || cabeca.includes('<OFX>') || cabeca.includes('<OFX ');
}

export function parseOFX(texto: string): OfxDoc {
  const corpo = texto.slice(Math.max(0, texto.search(/<OFX[\s>]/i)));
  const cartao = /<CCSTMTRS|<CREDITCARDMSGSRSV1|<CCACCTFROM/i.test(corpo);

  const transacoes: OfxTransacao[] = [];
  let ignorados = 0;

  // <STMTTRN> vale para extrato e fatura — só o envelope muda
  const blocos = corpo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  for (const bloco of blocos) {
    const bruto = tag(bloco, 'TRNAMT');
    const valor = bruto === undefined ? null : parseNumero(bruto);
    if (valor === null) {
      ignorados++;
      continue;
    }
    const memo = tag(bloco, 'MEMO') ?? tag(bloco, 'NAME') ?? tag(bloco, 'CHECKNUM') ?? '';
    transacoes.push({
      trntype: tag(bloco, 'TRNTYPE'),
      data: parseData(tag(bloco, 'DTPOSTED') ?? tag(bloco, 'DTUSER') ?? ''),
      valor,
      memo,
      fitid: tag(bloco, 'FITID'),
    });
  }

  const inicio = parseData(tag(corpo, 'DTSTART') ?? '');
  const fim = parseData(tag(corpo, 'DTEND') ?? '');

  return {
    transacoes,
    cartao,
    documento: cartao ? 'fatura' : 'extrato',
    banco: tag(corpo, 'ORG') ?? tag(corpo, 'BANKID'),
    conta: tag(corpo, 'ACCTID'),
    moeda: tag(corpo, 'CURDEF'),
    periodo: inicio && fim ? { inicio, fim } : undefined,
    ignorados,
  };
}
