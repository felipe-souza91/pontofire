/**
 * Calculadoras públicas (§ M9) — usadas no app e espelhadas nas páginas
 * estáticas de /ferramentas (SEO).
 *
 * Regra da casa (§14): informar o trade-off com honestidade, sem prometer
 * retorno e sem recomendar investimento.
 */

// ---------------------------------------------------------------------------
// Juros compostos × simples
// ---------------------------------------------------------------------------

export interface EntradaJuros {
  /** capital inicial */
  inicial: number;
  /** aporte mensal (fim do mês) */
  aporteMensal: number;
  /** taxa MENSAL (ex.: 0,01 = 1% a.m.) */
  taxaMensal: number;
  /** prazo em meses */
  meses: number;
}

export interface ResultadoJuros {
  /** montante com juros compostos */
  montante: number;
  /** total que saiu do seu bolso */
  totalInvestido: number;
  /** quanto veio de juros */
  totalJuros: number;
  /** montante se fosse juros simples (só o capital inicial rende linear) */
  montanteSimples: number;
  /** diferença composto − simples (o "poder" dos juros compostos) */
  diferenca: number;
}

export function calcularJuros(e: EntradaJuros): ResultadoJuros {
  const { inicial, aporteMensal: A, taxaMensal: i, meses: n } = e;

  const montante =
    Math.abs(i) < 1e-9
      ? inicial + A * n
      : inicial * Math.pow(1 + i, n) + A * ((Math.pow(1 + i, n) - 1) / i);

  const totalInvestido = inicial + A * n;

  // juros simples: o capital rende linear; cada aporte rende pelos meses restantes
  const jurosSimplesInicial = inicial * i * n;
  const jurosSimplesAportes = A * i * ((n * (n - 1)) / 2);
  const montanteSimples = totalInvestido + jurosSimplesInicial + jurosSimplesAportes;

  return {
    montante,
    totalInvestido,
    totalJuros: montante - totalInvestido,
    montanteSimples,
    diferenca: montante - montanteSimples,
  };
}

/** Converte taxa anual → mensal (composta, não /12). */
export function anualParaMensal(taxaAnual: number): number {
  return Math.pow(1 + taxaAnual, 1 / 12) - 1;
}

// ---------------------------------------------------------------------------
// Combustível: álcool × gasolina
// ---------------------------------------------------------------------------

export interface ResultadoCombustivel {
  /** razão preço álcool ÷ preço gasolina */
  razao: number;
  /** limite a partir do qual a gasolina compensa (default 0,70) */
  limite: number;
  vencedor: 'alcool' | 'gasolina' | 'empate';
  /** economia percentual do vencedor por km rodado */
  economiaPct: number;
}

/**
 * Compara por CUSTO POR KM. O clássico "70%" é o caso em que o carro faz 70%
 * da autonomia com álcool; se o usuário souber os consumos reais, o limite
 * vira `kmAlcool / kmGasolina`.
 */
export function compararCombustivel(
  precoAlcool: number,
  precoGasolina: number,
  kmPorLitroAlcool?: number,
  kmPorLitroGasolina?: number,
): ResultadoCombustivel {
  const temConsumo =
    kmPorLitroAlcool !== undefined &&
    kmPorLitroGasolina !== undefined &&
    kmPorLitroAlcool > 0 &&
    kmPorLitroGasolina > 0;

  const limite = temConsumo ? kmPorLitroAlcool! / kmPorLitroGasolina! : 0.7;
  const razao = precoGasolina > 0 ? precoAlcool / precoGasolina : Infinity;

  // custo por km (normalizado): álcool = preco/km_a, gasolina = preco/km_g
  const custoAlcool = temConsumo ? precoAlcool / kmPorLitroAlcool! : precoAlcool / (0.7 * 10);
  const custoGasolina = temConsumo ? precoGasolina / kmPorLitroGasolina! : precoGasolina / 10;

  const diff = custoGasolina - custoAlcool;
  const vencedor: ResultadoCombustivel['vencedor'] =
    Math.abs(diff) < 1e-6 ? 'empate' : diff > 0 ? 'alcool' : 'gasolina';

  const maior = Math.max(custoAlcool, custoGasolina);
  const economiaPct = maior > 0 ? Math.abs(diff) / maior : 0;

  return { razao, limite, vencedor, economiaPct };
}

// ---------------------------------------------------------------------------
// À vista × parcelado
// ---------------------------------------------------------------------------

export interface ResultadoParcelado {
  totalParcelado: number;
  /** quanto o parcelamento custa a mais, em reais */
  acrescimo: number;
  /** taxa de juros MENSAL embutida no parcelamento (null se não há juros) */
  taxaEmbutida: number | null;
  /** valor presente das parcelas descontadas pelo seu rendimento */
  valorPresente: number;
  /** 'parcelar' se o VP das parcelas < preço à vista */
  melhor: 'avista' | 'parcelar';
  /** diferença absoluta entre as opções, em valor de hoje */
  diferenca: number;
}

/** Taxa mensal que iguala o preço à vista ao fluxo das parcelas (bisseção). */
export function taxaEmbutida(precoAVista: number, parcela: number, n: number): number | null {
  if (precoAVista <= 0 || parcela <= 0 || n <= 0) return null;
  if (parcela * n <= precoAVista + 1e-9) return null; // sem juros (ou com desconto)

  const vp = (i: number) =>
    Math.abs(i) < 1e-12 ? parcela * n : parcela * ((1 - Math.pow(1 + i, -n)) / i);

  let lo = 0;
  let hi = 1; // 100% a.m. cobre qualquer caso real
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (vp(mid) > precoAVista) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Compara pagar à vista vs. parcelar mantendo o dinheiro rendendo.
 * `rendimentoMensal` é quanto SEU dinheiro rende (ex.: 0,008 = 0,8% a.m.).
 */
export function compararParcelado(
  precoAVista: number,
  parcela: number,
  n: number,
  rendimentoMensal: number,
): ResultadoParcelado {
  const totalParcelado = parcela * n;
  const i = rendimentoMensal;

  const valorPresente =
    Math.abs(i) < 1e-12 ? totalParcelado : parcela * ((1 - Math.pow(1 + i, -n)) / i);

  const diferenca = Math.abs(precoAVista - valorPresente);
  const melhor: ResultadoParcelado['melhor'] = valorPresente < precoAVista ? 'parcelar' : 'avista';

  return {
    totalParcelado,
    acrescimo: totalParcelado - precoAVista,
    taxaEmbutida: taxaEmbutida(precoAVista, parcela, n),
    valorPresente,
    melhor,
    diferenca,
  };
}
