/**
 * @pontofire/importer — M5.
 *
 * Lê extrato (OFX/CSV), fatura de cartão e planilha do usuário, e devolve
 * lançamentos prontos pra revisão. Puro: não conhece Firebase nem React, o
 * que o mantém testável com fixtures e reaproveitável por uma function.
 */

export * from './tipos';
export * from './texto';
export * from './ofx';
export * from './csv';
export * from './categorizar';
export * from './analisar';
