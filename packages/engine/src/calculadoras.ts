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

export interface EntradaCompra {
  /** preço pagando no PIX/dinheiro hoje (costuma ter desconto) */
  precoAVista: number;
  /** preço TOTAL no cartão (à vista ou parcelado). Igual ao à vista = sem desconto no PIX */
  precoCartao: number;
  /** máximo de parcelas oferecido pela loja */
  maxParcelas: number;
  /** quanto SEU dinheiro rende ao mês (ex.: 0,008) */
  rendimentoMensal: number;
  /** cashback do cartão (ex.: 0,02) */
  cashback?: number;
  /**
   * Meses até a 1ª cobrança do cartão cair (float da fatura). Default 1.
   * É a vantagem real do cartão sobre o PIX: o dinheiro rende nesse meio-tempo.
   */
  mesesAteFatura?: number;
}

export interface OpcaoCompra {
  id: string;
  rotulo: string;
  /** 0 = PIX/dinheiro */
  parcelas: number;
  valorParcela: number;
  totalPago: number;
  cashbackRecebido: number;
  /** custo em VALOR DE HOJE — é isto que decide */
  custoHoje: number;
  /** quanto esta opção custa a mais que a melhor */
  diferencaVsMelhor: number;
}

export interface ResultadoCompra {
  /** todas as formas, da melhor (menor custo hoje) para a pior */
  opcoes: OpcaoCompra[];
  melhor: OpcaoCompra;
  pior: OpcaoCompra;
  /** diferença entre a melhor e a pior, em valor de hoje */
  economiaMaxima: number;
  /** juros embutidos no parcelamento cheio (null se o cartão não é mais caro) */
  taxaEmbutida: number | null;
}

/**
 * Compara TODAS as formas de pagamento: PIX à vista, cartão à vista e cada
 * quantidade de parcelas até o máximo — tudo em valor presente.
 *
 * O cartão ganha "de graça" o float da fatura (você paga depois, o dinheiro
 * rende até lá) e o cashback; o PIX ganha quando tem desconto.
 */
export function compararCompra(e: EntradaCompra): ResultadoCompra {
  const cb = Math.max(0, e.cashback ?? 0);
  const i = e.rendimentoMensal;
  const atraso = e.mesesAteFatura ?? 1;
  const precoCartao = e.precoCartao > 0 ? e.precoCartao : e.precoAVista;
  const maxN = Math.max(1, Math.floor(e.maxParcelas || 1));

  const desconta = (valor: number, meses: number) =>
    Math.abs(i) < 1e-12 ? valor : valor / Math.pow(1 + i, meses);

  const opcoes: OpcaoCompra[] = [
    {
      id: 'pix',
      rotulo: 'PIX / dinheiro à vista',
      parcelas: 0,
      valorParcela: e.precoAVista,
      totalPago: e.precoAVista,
      cashbackRecebido: 0,
      custoHoje: e.precoAVista, // pago hoje: já está em valor de hoje
      diferencaVsMelhor: 0,
    },
  ];

  for (let k = 1; k <= maxN; k++) {
    const parcela = precoCartao / k;
    const liquida = parcela * (1 - cb);
    let custoHoje = 0;
    // parcela j cai em (atraso + j − 1) meses
    for (let j = 1; j <= k; j++) custoHoje += desconta(liquida, atraso + j - 1);

    opcoes.push({
      id: `cartao-${k}`,
      rotulo: k === 1 ? 'Cartão à vista (1×)' : `Cartão em ${k}×`,
      parcelas: k,
      valorParcela: parcela,
      totalPago: precoCartao,
      cashbackRecebido: precoCartao * cb,
      custoHoje,
      diferencaVsMelhor: 0,
    });
  }

  opcoes.sort((a, b) => a.custoHoje - b.custoHoje);
  const melhor = opcoes[0]!;
  const pior = opcoes[opcoes.length - 1]!;
  for (const o of opcoes) o.diferencaVsMelhor = o.custoHoje - melhor.custoHoje;

  return {
    opcoes,
    melhor,
    pior,
    economiaMaxima: pior.custoHoje - melhor.custoHoje,
    taxaEmbutida: precoCartao > e.precoAVista ? taxaEmbutida(e.precoAVista, precoCartao / maxN, maxN) : null,
  };
}

export interface PontoSaldo {
  mes: number;
  /** saldo de quem pagou à vista e ficou com o troco rendendo */
  avista: number;
  /** saldo de quem manteve o dinheiro rendendo e paga as parcelas dele */
  cartao: number;
}

export interface SimulacaoCompra {
  serie: PontoSaldo[];
  capitalInicial: number;
  saldoFinalAVista: number;
  saldoFinalCartao: number;
  /** quanto o cartão termina à frente (negativo = à vista ganhou) */
  vantagemCartao: number;
  /** último mês simulado */
  horizonte: number;
}

/**
 * Simula os dois caminhos mês a mês, partindo do MESMO dinheiro e da MESMA
 * renda mensal:
 *  - à vista: gasta o dinheiro agora e, como não tem fatura, investe todo mês
 *    o valor que seria a parcela;
 *  - parcelando: mantém o dinheiro rendendo e paga a parcela da renda (o
 *    cashback volta e também é investido).
 *
 * Nos dois casos o saldo CRESCE — o que muda é a distância entre eles.
 * É a "prova" visual do ranking: a diferença final é exatamente a economia
 * em valor de hoje, capitalizada até o fim do parcelamento.
 */
export function simularCompra(e: EntradaCompra, parcelas: number): SimulacaoCompra {
  const cb = Math.max(0, e.cashback ?? 0);
  const i = e.rendimentoMensal;
  const atraso = e.mesesAteFatura ?? 1;
  const precoCartao = e.precoCartao > 0 ? e.precoCartao : e.precoAVista;
  const k = Math.max(1, Math.floor(parcelas));

  const capitalInicial = Math.max(e.precoAVista, precoCartao);
  const parcela = precoCartao / k;
  const horizonte = atraso + k - 1;

  let avista = capitalInicial - e.precoAVista; // gastou o preço à vista
  let cartao = capitalInicial; // manteve tudo rendendo
  const serie: PontoSaldo[] = [{ mes: 0, avista, cartao }];

  for (let m = 1; m <= horizonte; m++) {
    avista *= 1 + i;
    cartao *= 1 + i;
    // nos meses de fatura: quem pagou à vista investe a parcela;
    // quem parcelou paga a fatura da renda e recebe o cashback de volta
    if (m >= atraso && m <= atraso + k - 1) {
      avista += parcela;
      cartao += parcela * cb;
    }
    serie.push({ mes: m, avista, cartao });
  }

  return {
    serie,
    capitalInicial,
    saldoFinalAVista: avista,
    saldoFinalCartao: cartao,
    vantagemCartao: cartao - avista,
    horizonte,
  };
}

export interface ResultadoParcelado {
  totalParcelado: number;
  /** quanto o parcelamento custa a mais, em reais */
  acrescimo: number;
  /** taxa de juros MENSAL embutida no parcelamento (null se não há juros) */
  taxaEmbutida: number | null;
  /** valor presente das parcelas descontadas pelo seu rendimento */
  valorPresente: number;
  /** 'parcelar' se o custo do parcelamento em valor de hoje < custo à vista */
  melhor: 'avista' | 'parcelar';
  /** diferença absoluta entre as opções, em valor de hoje */
  diferenca: number;
  /** cashback total recebido no parcelamento (R$) */
  cashbackParcelado: number;
  /** cashback recebido pagando à vista (R$) — 0 se for PIX/dinheiro */
  cashbackAVista: number;
  /** custo efetivo à vista, já abatido o cashback */
  custoAVista: number;
  /** o cashback incide nos dois lados e portanto não muda a decisão */
  cashbackNeutro: boolean;
}

export interface OpcoesParcelado {
  /** % de cashback do cartão (ex.: 0,02 = 2%) */
  cashback?: number;
  /** o preço à vista também é pago no cartão? (false = PIX/dinheiro) */
  aVistaNoCartao?: boolean;
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
  opcoes: OpcoesParcelado = {},
): ResultadoParcelado {
  const cb = Math.max(0, opcoes.cashback ?? 0);
  const aVistaNoCartao = opcoes.aVistaNoCartao ?? false;

  const totalParcelado = parcela * n;
  const i = rendimentoMensal;

  // fator de anuidade: soma de 1/(1+i)^k, k = 1..n
  const fator = Math.abs(i) < 1e-12 ? n : (1 - Math.pow(1 + i, -n)) / i;

  // o cashback volta junto de cada parcela → abate o valor efetivo dela
  const parcelaLiquida = parcela * (1 - cb);
  const valorPresente = parcelaLiquida * fator;

  const cashbackParcelado = totalParcelado * cb;
  const cashbackAVista = aVistaNoCartao ? precoAVista * cb : 0;
  const custoAVista = precoAVista - cashbackAVista;

  const diferenca = Math.abs(custoAVista - valorPresente);
  const melhor: ResultadoParcelado['melhor'] = valorPresente < custoAVista ? 'parcelar' : 'avista';

  return {
    totalParcelado,
    acrescimo: totalParcelado - precoAVista,
    taxaEmbutida: taxaEmbutida(precoAVista, parcela, n),
    valorPresente,
    melhor,
    diferenca,
    cashbackParcelado,
    cashbackAVista,
    custoAVista,
    // se o cashback incide nos dois lados, ele escala ambos igualmente
    cashbackNeutro: cb > 0 && aVistaNoCartao,
  };
}
