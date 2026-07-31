/**
 * Patrimônio: distinção investível × uso (ver docs/PLANO.md).
 *
 * Dois números:
 *  - patrimônio líquido TOTAL  = Σ valor − Σ dívidas  (motivacional, net worth)
 *  - patrimônio INVESTÍVEL     = só o que rende e é sacável → base do FIRE (P)
 *
 * Bem de renda (imóvel alugado / sítio arrendado): a RENDA entra como renda
 * passiva R; o VALOR fica no net worth, mas NÃO na base do FIRE por padrão
 * (aplicar TSS ao valor duplicaria a contagem com o aluguel).
 */

export type AssetTipo = 'financeiro' | 'imovel-uso' | 'imovel-renda' | 'veiculo' | 'outro';

export interface Asset {
  tipo: AssetTipo;
  /** valor de mercado atual do bem */
  valor: number;
  /** saldo devedor associado (financiamento) — abate o net worth */
  dividaAssociada?: number;
  /** o bem gera renda recorrente (aluguel/arrendamento)? */
  geraRenda?: boolean;
  /** renda mensal LÍQUIDA que o bem gera */
  rendaMensal?: number;
  /** override explícito do usuário sobre incluir o VALOR na base do FIRE */
  incluirNoFire?: boolean;
}

/**
 * Regra de inclusão do VALOR do bem na base do FIRE:
 *  - se `incluirNoFire` foi setado explicitamente, respeita a escolha do usuário
 *    (autonomia §14 — a UI avisa quando for bem de uso);
 *  - senão, o padrão é: só `financeiro` entra.
 */
export function incluiNaBaseFire(a: Asset): boolean {
  if (a.incluirNoFire !== undefined) return a.incluirNoFire;
  return a.tipo === 'financeiro';
}

export interface ResumoPatrimonio {
  /** Σ valor − Σ dívidas */
  patrimonioLiquidoTotal: number;
  /** base do FIRE (P): Σ valor dos bens incluídos */
  patrimonioInvestivel: number;
  /** renda passiva vinda de bens (entra em R) */
  rendaPassivaBens: number;
  /** Σ dívidas associadas */
  totalDividas: number;
}

export function resumoPatrimonio(assets: readonly Asset[]): ResumoPatrimonio {
  let bruto = 0;
  let dividas = 0;
  let investivel = 0;
  let renda = 0;

  for (const a of assets) {
    bruto += a.valor;
    dividas += a.dividaAssociada ?? 0;
    if (incluiNaBaseFire(a)) investivel += a.valor;
    if (a.geraRenda) renda += a.rendaMensal ?? 0;
  }

  return {
    patrimonioLiquidoTotal: bruto - dividas,
    patrimonioInvestivel: investivel,
    rendaPassivaBens: renda,
    totalDividas: dividas,
  };
}

/**
 * Rendimento do mês derivado por marcação a mercado (§5):
 *   rendimentoMes = P_hoje − P_anterior − aportesMes
 */
export function rendimentoMes(pHoje: number, pAnterior: number, aportesMes: number): number {
  return pHoje - pAnterior - aportesMes;
}
