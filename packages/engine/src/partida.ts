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
  /**
   * Reserva de emergência, quando declarada.
   *
   * Ela FICA no patrimônio — é dinheiro real, rende, e tirá-la de `P` quebraria
   * a marcação a mercado todo mês. Mas é dinheiro CARIMBADO: no dia do FIRE ela
   * ainda precisa estar lá inteira, senão não era reserva. Por isso entra na
   * meta em vez de sair do patrimônio.
   */
  reservaEmergencia?: number;
}

/**
 * A parte da meta que gera renda: o 25× puro, sem a reserva.
 *
 * É esta que responde "quanto preciso ter investido pra viver dos juros". A
 * reserva não gera liberdade nenhuma — ela existe pra você não precisar vender
 * a carteira num mês ruim.
 */
export function metaSemReserva(p: PerfilDaMeta): number {
  if (p.metaTravada && p.metaFire > 0) return p.metaFire;
  if (!(p.custoVidaMensal > 0) || !(p.taxaSaqueSegura > 0)) return p.metaFire;
  return numeroFire(p.custoVidaMensal, p.taxaSaqueSegura);
}

/**
 * Sugestão de reserva: 3 a 6 meses de custo (12 pra renda instável).
 *
 * §14 — é faixa com o raciocínio à mostra, nunca "você deveria ter R$ X". Quem
 * tem CLT estável e seguro-desemprego precisa de menos que quem é PJ e fatura
 * por projeto, e só o usuário sabe em qual dos dois vive.
 */
export function faixaDeReserva(custoVidaMensal: number): { min: number; max: number; instavel: number } {
  const c = Math.max(0, custoVidaMensal);
  return { min: c * 3, max: c * 6, instavel: c * 12 };
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
  return metaSemReserva(p) + Math.max(0, p.reservaEmergencia ?? 0);
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
