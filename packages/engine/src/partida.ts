import { numeroFire } from './fire';

/**
 * A linha de partida e a meta vigente.
 *
 * Duas peças do mesmo problema: a data precisa se mexer conforme o usuário
 * vive, e pra isso alguém tem que guardar de onde ele saiu — senão "melhorou 4
 * anos" é uma frase sem prova.
 */

/**
 * O estado congelado no fim do onboarding.
 *
 * Guarda as PREMISSAS junto com a data, e não só a data. Sem elas não dá pra
 * distinguir "sua data melhorou porque você aportou mais" de "sua data melhorou
 * porque você baixou a meta" — e a segunda, comemorada como se fosse a
 * primeira, é métrica de vaidade.
 */
export interface LinhaDePartida {
  /** YYYY-MM-DD */
  em: string;
  custoVidaMensal: number;
  aporteMensal: number;
  patrimonioInicial: number;
  retornoRealEsperado: number;
  metaFire: number;
  taxaSaqueSegura: number;
  /** null quando a meta era inalcançável com aquele aporte */
  mesesAteFire: number | null;
  /**
   * `reconstruida` = o usuário entrou antes de isto existir e a partida foi
   * inferida do perfil atual. É aproximação, e a tela precisa dizer isso.
   */
  origem: 'onboarding' | 'reconstruida';
}

export interface PerfilDaMeta {
  custoVidaMensal: number;
  taxaSaqueSegura: number;
  /** o valor gravado — só vale quando travada */
  metaFire: number;
  /** true = o usuário fixou um número e não quer que ele acompanhe o custo */
  metaTravada?: boolean;
}

/**
 * A meta que vale AGORA.
 *
 * Derivada do custo por padrão. Isto não é preferência de estilo: com o custo
 * virando observado (ele sobe sozinho quando a pessoa gasta mais), uma meta
 * manual congelada faz a DATA MELHORAR QUANDO O GASTO PIORA. Não é imprecisão,
 * é o sinal invertido — calculado com precisão.
 *
 * Quem trava, trava sabendo: `metaDivergiu` alimenta o aviso.
 */
export function metaVigente(p: PerfilDaMeta): number {
  if (p.metaTravada && p.metaFire > 0) return p.metaFire;
  if (!(p.custoVidaMensal > 0) || !(p.taxaSaqueSegura > 0)) return p.metaFire;
  return numeroFire(p.custoVidaMensal, p.taxaSaqueSegura);
}

/** Centavos de diferença são arredondamento, não decisão do usuário. */
const TOLERANCIA = 1;

/** A meta pela regra dos 25×, para o custo informado. */
export function metaPeloCusto(custoVidaMensal: number, taxaSaqueSegura: number): number {
  if (!(custoVidaMensal > 0) || !(taxaSaqueSegura > 0)) return 0;
  return numeroFire(custoVidaMensal, taxaSaqueSegura);
}

/** Meta travada num valor que já não corresponde ao custo — rende um aviso. */
export function metaDivergiu(p: PerfilDaMeta): boolean {
  if (!p.metaTravada) return false;
  const pelaRegra = metaPeloCusto(p.custoVidaMensal, p.taxaSaqueSegura);
  return pelaRegra > 0 && Math.abs(p.metaFire - pelaRegra) > TOLERANCIA;
}

/**
 * Migração: quem já tinha meta diferente da regra escolheu aquele número.
 *
 * Passar a derivar sem perguntar mudaria a meta dessas pessoas do nada. Elas
 * entram travadas, e o aviso de divergência explica o resto.
 */
export function deveNascerTravada(p: {
  metaFire: number;
  custoVidaMensal: number;
  taxaSaqueSegura: number;
}): boolean {
  const pelaRegra = metaPeloCusto(p.custoVidaMensal, p.taxaSaqueSegura);
  if (!(pelaRegra > 0) || !(p.metaFire > 0)) return false;
  return Math.abs(p.metaFire - pelaRegra) > TOLERANCIA;
}
