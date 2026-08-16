/**
 * Dívida × liberdade — financiamento, amortização e "cabe no meu orçamento?".
 *
 * Duas perguntas que o Ponto FIRE pode responder e uma calculadora de banco
 * não: (1) vale mais amortizar ou investir a diferença, e (2) quanto uma
 * dívida nova custa em TEMPO da sua vida.
 *
 * ARMADILHA CENTRAL (a mesma do card econômico): a taxa do contrato é
 * NOMINAL e o retorno que o usuário informa no Ponto FIRE é REAL. Comparar
 * "financiamento a 10%" com "eu rendo 6%" direto é errado e sempre conclui
 * "amortize" — quando na verdade 10% nominal com IPCA a 4,5% é ~5,3% real, ou
 * seja, quase empate. Por isso toda comparação aqui roda em termos NOMINAIS,
 * convertendo a expectativa real do usuário com a inflação, e o resultado é
 * deflacionado só na hora de mostrar.
 */

import { EPS_I } from './fire';
import { realMensalDeAnual } from './rates';

export type SistemaAmortizacao = 'price' | 'sac';

export interface EntradaFinanciamento {
  /** valor financiado (já descontada a entrada) */
  valor: number;
  /** taxa NOMINAL mensal do contrato (ex.: 0,008 = 0,8% a.m.) */
  taxaMensal: number;
  meses: number;
  sistema: SistemaAmortizacao;
}

export interface ParcelaFin {
  mes: number;
  parcela: number;
  juros: number;
  amortizacao: number;
  /** saldo devedor DEPOIS desta parcela */
  saldo: number;
}

export interface Financiamento {
  parcelas: ParcelaFin[];
  primeiraParcela: number;
  ultimaParcela: number;
  totalPago: number;
  totalJuros: number;
  /** em quantos meses a dívida acabou de fato */
  mesesAteQuitar: number;
}

/** Teto de iteração — protege contra taxa/entrada que nunca quitam. */
const MAX_MESES = 1200;

// ---------------------------------------------------------------------------
// prestação

/**
 * Prestação da Tabela Price (parcela fixa):
 *   PMT = PV · i / (1 − (1+i)^−n)
 * Com i ≈ 0 vira a divisão simples PV/n.
 */
export function prestacaoPrice(valor: number, i: number, n: number): number {
  if (!(n > 0)) return 0;
  if (Math.abs(i) < EPS_I) return valor / n;
  return (valor * i) / (1 - Math.pow(1 + i, -n));
}

// ---------------------------------------------------------------------------
// tabela

/**
 * Monta a tabela de amortização.
 *
 * - **Price**: parcela constante; os juros caem e a amortização sobe.
 * - **SAC**: amortização constante; a parcela começa alta e cai todo mês.
 *
 * `extraMensal` e `extraUnico` são amortizações extraordinárias, sempre
 * abatidas do PRINCIPAL. No modo `prazo` a parcela é mantida e a dívida acaba
 * antes; no modo `parcela` o prazo é mantido e a prestação é recalculada.
 */
export function simularFinanciamento(
  e: EntradaFinanciamento,
  extra?: { mensal?: number; unico?: { mes: number; valor: number }; modo?: 'prazo' | 'parcela' },
): Financiamento {
  const { taxaMensal: i, meses: n, sistema } = e;
  const modo = extra?.modo ?? 'prazo';
  const extraMensal = Math.max(0, extra?.mensal ?? 0);

  const parcelas: ParcelaFin[] = [];
  let saldo = Math.max(0, e.valor);
  let pmt = prestacaoPrice(saldo, i, n);
  let amortConstante = n > 0 ? saldo / n : 0;
  let totalPago = 0;
  let totalJuros = 0;

  for (let mes = 1; mes <= Math.min(n, MAX_MESES) && saldo > 0.005; mes++) {
    const juros = saldo * i;
    let parcelaBase = sistema === 'price' ? pmt : amortConstante + juros;
    // última parcela não pode cobrar mais do que se deve
    if (parcelaBase > saldo + juros) parcelaBase = saldo + juros;

    let amortizacao = parcelaBase - juros;
    let pagoNoMes = parcelaBase;

    // amortização extraordinária
    const unico = extra?.unico && extra.unico.mes === mes ? Math.max(0, extra.unico.valor) : 0;
    const adicional = Math.min(extraMensal + unico, Math.max(0, saldo - amortizacao));
    if (adicional > 0) {
      amortizacao += adicional;
      pagoNoMes += adicional;
    }

    saldo = Math.max(0, saldo - amortizacao);
    totalPago += pagoNoMes;
    totalJuros += juros;
    parcelas.push({ mes, parcela: pagoNoMes, juros, amortizacao, saldo });

    // no modo "parcela", o extra derruba a prestação e o prazo original fica
    if (adicional > 0 && modo === 'parcela') {
      const restantes = n - mes;
      if (restantes > 0) {
        pmt = prestacaoPrice(saldo, i, restantes);
        amortConstante = saldo / restantes;
      }
    }
  }

  const primeira = parcelas[0]?.parcela ?? 0;
  const ultima = parcelas[parcelas.length - 1]?.parcela ?? 0;
  return {
    parcelas,
    primeiraParcela: primeira,
    ultimaParcela: ultima,
    totalPago,
    totalJuros,
    mesesAteQuitar: parcelas.length,
  };
}

export interface GanhoAmortizacao {
  original: Financiamento;
  comExtra: Financiamento;
  /** meses a menos de dívida (0 no modo "parcela") */
  mesesEconomizados: number;
  jurosEconomizados: number;
  /** quanto a prestação caiu (0 no modo "prazo") */
  reducaoParcela: number;
}

/** Compara a tabela original com a tabela amortizada. */
export function ganhoDeAmortizar(
  e: EntradaFinanciamento,
  extra: { mensal?: number; unico?: { mes: number; valor: number }; modo?: 'prazo' | 'parcela' },
): GanhoAmortizacao {
  const original = simularFinanciamento(e);
  const comExtra = simularFinanciamento(e, extra);
  return {
    original,
    comExtra,
    mesesEconomizados: original.mesesAteQuitar - comExtra.mesesAteQuitar,
    jurosEconomizados: original.totalJuros - comExtra.totalJuros,
    reducaoParcela: Math.max(0, original.primeiraParcela - comExtra.ultimaParcela),
  };
}

// ---------------------------------------------------------------------------
// amortizar OU investir a diferença?

export interface EntradaAmortizarOuInvestir {
  financiamento: EntradaFinanciamento;
  /** quanto sobra por mês pra usar de um jeito ou de outro */
  extraMensal: number;
  /** retorno REAL anual esperado (o número do perfil do usuário) */
  retornoRealAnual: number;
  /** inflação anual esperada — é o que torna as duas taxas comparáveis */
  ipcaAnual: number;
}

export interface ComparacaoAmortizar {
  /** taxa do contrato em termos REAIS ao ano — o número que decide */
  taxaRealContratoAnual: number;
  /** retorno do usuário em termos NOMINAIS ao ano */
  retornoNominalAnual: number;
  vence: 'amortizar' | 'investir' | 'empate';
  /** patrimônio no fim do prazo original, em cada caminho (nominal) */
  patrimonioAmortizando: number;
  patrimonioInvestindo: number;
  /** diferença a favor do vencedor, em valor de HOJE */
  diferencaHoje: number;
  horizonteMeses: number;
  mesesEconomizados: number;
}

/**
 * A comparação que nenhuma calculadora de banco faz.
 *
 * Caminho A (amortizar): paga parcela + extra até quitar; quitada a dívida,
 * investe tudo o que estava indo pra ela até o fim do prazo original.
 * Caminho B (investir): paga só a parcela e investe o extra desde o mês 1.
 *
 * Os dois terminam no MESMO mês, então dá pra comparar patrimônio com
 * patrimônio. Tudo roda em termos nominais (o contrato é nominal); a
 * diferença é deflacionada no fim pra virar dinheiro de hoje.
 */
export function amortizarOuInvestir(e: EntradaAmortizarOuInvestir): ComparacaoAmortizar {
  const { financiamento: f, extraMensal, retornoRealAnual, ipcaAnual } = e;

  const ipcaMensal = Math.pow(1 + ipcaAnual, 1 / 12) - 1;
  const realMensal = realMensalDeAnual(retornoRealAnual);
  // nominal = (1 + real)(1 + inflação) − 1
  const nominalMensal = (1 + realMensal) * (1 + ipcaMensal) - 1;

  const taxaAnualContrato = Math.pow(1 + f.taxaMensal, 12) - 1;
  const taxaRealContratoAnual = (1 + taxaAnualContrato) / (1 + ipcaAnual) - 1;

  const original = simularFinanciamento(f);
  const horizonte = original.mesesAteQuitar;

  // --- Caminho A: amortizar e depois investir o que sobrou
  const comExtra = simularFinanciamento(f, { mensal: extraMensal, modo: 'prazo' });
  let patrimonioA = 0;
  for (let mes = 1; mes <= horizonte; mes++) {
    patrimonioA *= 1 + nominalMensal;
    const parcelaDoMes = comExtra.parcelas[mes - 1];
    if (!parcelaDoMes) {
      // dívida quitada: tudo o que ia pra ela agora é aporte
      patrimonioA += original.parcelas[mes - 1]?.parcela ?? 0;
      patrimonioA += extraMensal;
    }
  }

  // --- Caminho B: pagar normal e investir o extra desde o começo
  let patrimonioB = 0;
  for (let mes = 1; mes <= horizonte; mes++) {
    patrimonioB = patrimonioB * (1 + nominalMensal) + extraMensal;
  }

  const deflator = Math.pow(1 + ipcaMensal, horizonte);
  const diff = patrimonioA - patrimonioB;
  const relevante = Math.abs(diff) > Math.max(1, Math.max(patrimonioA, patrimonioB) * 0.005);

  return {
    taxaRealContratoAnual,
    retornoNominalAnual: Math.pow(1 + nominalMensal, 12) - 1,
    vence: !relevante ? 'empate' : diff > 0 ? 'amortizar' : 'investir',
    patrimonioAmortizando: patrimonioA,
    patrimonioInvestindo: patrimonioB,
    diferencaHoje: Math.abs(diff) / deflator,
    horizonteMeses: horizonte,
    mesesEconomizados: original.mesesAteQuitar - comExtra.mesesAteQuitar,
  };
}

// ---------------------------------------------------------------------------
// "essa dívida cabe no meu orçamento?"

export interface EntradaCabeNoOrcamento {
  /** valor da prestação mensal da dívida nova */
  parcela: number;
  /** por quantos meses ela vai durar */
  mesesDaDivida: number;
  // situação atual do usuário
  patrimonio: number;
  aporteMensal: number;
  custoVidaMensal: number;
  metaFire: number;
  /** retorno REAL mensal */
  iMensal: number;
}

export type VeredictoOrcamento =
  /** a parcela cabe na sobra que já existe */
  | 'cabe'
  /** cabe, mas consome quase toda a sobra */
  | 'aperta'
  /** a parcela é maior que a sobra: exige cortar o padrão de vida */
  | 'nao-cabe';

export interface CabeNoOrcamento {
  veredicto: VeredictoOrcamento;
  /** quanto sobra pra aportar enquanto a dívida durar */
  aporteDurante: number;
  /** quanto precisaria sair do custo de vida (0 quando cabe) */
  cortarPorMes: number;
  /** parcela ÷ renda mensal (custo + aporte) */
  comprometimento: number;
  /** meses até o FIRE sem a dívida */
  mesesSemDivida: number | null;
  /** meses até o FIRE com a dívida */
  mesesComDivida: number | null;
  /** o número que importa: quanto a liberdade atrasa */
  atrasoMeses: number | null;
  /** soma das parcelas */
  custoTotal: number;
}

/**
 * Meses até o FIRE com o aporte reduzido durante um período.
 *
 * Simula mês a mês porque a fórmula fechada não aceita aporte que muda no
 * meio. Aporte no FIM do mês, igual ao resto do motor.
 */
export function mesesAteFireComAporteVariavel(
  P: number,
  M: number,
  i: number,
  aportePor: (mes: number) => number,
  limite = MAX_MESES,
): number | null {
  if (P >= M) return 0;
  let saldo = P;
  for (let mes = 1; mes <= limite; mes++) {
    saldo = saldo * (1 + i) + aportePor(mes);
    if (saldo >= M) return mes;
  }
  return null;
}

/**
 * Responde "cabe?" e, mais importante, "quanto custa em tempo da minha vida?".
 *
 * A premissa: a parcela sai primeiro do APORTE (é o que sobra), e só depois
 * do padrão de vida. Enquanto a dívida durar, o aporte cai; quitada, volta ao
 * normal. Esse degrau é o que atrasa a data.
 */
export function cabeNoOrcamento(e: EntradaCabeNoOrcamento): CabeNoOrcamento {
  const renda = e.custoVidaMensal + e.aporteMensal;
  const comprometimento = renda > 0 ? e.parcela / renda : 1;

  const aporteDurante = e.aporteMensal - e.parcela;
  const cortarPorMes = aporteDurante < 0 ? -aporteDurante : 0;

  const veredicto: VeredictoOrcamento =
    aporteDurante < 0 ? 'nao-cabe' : aporteDurante < e.aporteMensal * 0.25 ? 'aperta' : 'cabe';

  const mesesSemDivida = mesesAteFireComAporteVariavel(e.patrimonio, e.metaFire, e.iMensal, () => e.aporteMensal);

  // quando não cabe, o aporte zera e o resto vem do corte de custo de vida —
  // o padrão de vida não é negociado aqui, então o aporte simplesmente para
  const aporteReduzido = Math.max(0, aporteDurante);
  const mesesComDivida = mesesAteFireComAporteVariavel(e.patrimonio, e.metaFire, e.iMensal, (mes) =>
    mes <= e.mesesDaDivida ? aporteReduzido : e.aporteMensal,
  );

  return {
    veredicto,
    aporteDurante,
    cortarPorMes,
    comprometimento,
    mesesSemDivida,
    mesesComDivida,
    atrasoMeses:
      mesesSemDivida !== null && mesesComDivida !== null ? mesesComDivida - mesesSemDivida : null,
    custoTotal: e.parcela * e.mesesDaDivida,
  };
}

// ---------------------------------------------------------------------------
// "quando eu paro de amortizar?"

/**
 * IR sobre o rendimento no prazo mais longo da tabela regressiva (720+ dias).
 * Quem investe pra FIRE está sempre nessa faixa.
 */
export const IR_LONGO_PRAZO = 0.15;

export interface EntradaVirada {
  financiamento: EntradaFinanciamento;
  /** quanto ela já tem investido hoje */
  patrimonioHoje: number;
  /** quanto entra na carteira por mês */
  aporteMensal: number;
  /** quanto vai a mais pro financiamento por mês */
  amortizacaoMensal: number;
  /** retorno REAL anual esperado (o número do perfil) */
  retornoRealAnual: number;
  ipcaAnual: number;
  /** alíquota sobre o rendimento; default: tabela longa */
  ir?: number;
}

export interface Virada {
  /** taxa do contrato em termos REAIS ao ano */
  taxaRealContrato: number;
  /** retorno real ao ano DEPOIS do IR — o que de fato compete com o contrato */
  retornoRealLiquido: number;
  /** quanto o IR come do retorno real, em pontos percentuais */
  custoDoIR: number;
  vence: 'amortizar' | 'investir' | 'empate';
  /** distância entre as duas taxas, em pontos percentuais ao ano */
  margem: number;
  /** o retorno real BRUTO que empataria com o contrato */
  retornoDeEmpate: number;
  /**
   * Mês em que o patrimônio passa o saldo devedor. Deste ponto em diante a
   * dívida deixa de ser risco e vira escolha: dá pra quitar quando quiser.
   */
  mesDeIndependencia: number | null;
  patrimonioNaVirada: number;
  saldoNaVirada: number;
  /** meses até quitar, no ritmo atual de amortização */
  mesesAteQuitar: number;
}

/**
 * "Quando devo parar de amortizar e passar a aportar?"
 *
 * A resposta que a pergunta não espera: **nunca depende de quanto você já tem**.
 * Amortizar R$ 1 rende exatamente a taxa do contrato — os juros que você deixa
 * de pagar —, garantido e sem IR. Investir R$ 1 rende o retorno da carteira,
 * menos IR. É taxa contra taxa, e se uma ganha, ela já ganhava desde o primeiro
 * real. Não existe um montante a partir do qual vira.
 *
 * O que a comparação exige pra não mentir:
 *
 * 1. TERMOS IGUAIS. A taxa do contrato é NOMINAL; o retorno que o usuário
 *    declara aqui é REAL. Comparar "financiamento a 11,5%" com "eu rendo 6%"
 *    é a armadilha que sempre conclui "amortize" — e está errada.
 * 2. IR SOBRE O GANHO NOMINAL. A inflação é tributada junto com o rendimento.
 *    Quanto maior o IPCA, mais o IR come do retorno REAL — e ninguém desconta
 *    isso antes de comparar com uma amortização, que é líquida de imposto.
 *
 * O que DEPENDE do montante é outra coisa, e é provavelmente o que a pergunta
 * queria: o mês em que o investido passa o saldo devedor.
 */
export function pontoDeVirada(e: EntradaVirada): Virada {
  const ir = e.ir ?? IR_LONGO_PRAZO;

  const taxaAnualContrato = Math.pow(1 + e.financiamento.taxaMensal, 12) - 1;
  const taxaRealContrato = (1 + taxaAnualContrato) / (1 + e.ipcaAnual) - 1;

  // real → nominal → tira o IR do ganho → volta pra real
  const nominalBruto = (1 + e.retornoRealAnual) * (1 + e.ipcaAnual) - 1;
  const nominalLiquido = nominalBruto * (1 - ir);
  const retornoRealLiquido = (1 + nominalLiquido) / (1 + e.ipcaAnual) - 1;

  // o retorno real BRUTO que empataria com o contrato, já contando o IR
  const nominalDeEmpate = ((1 + taxaRealContrato) * (1 + e.ipcaAnual) - 1) / (1 - ir);
  const retornoDeEmpate = (1 + nominalDeEmpate) / (1 + e.ipcaAnual) - 1;

  const margem = retornoRealLiquido - taxaRealContrato;
  const EMPATE = 0.005; // meio ponto percentual não decide nada

  // --- o marco que depende do montante
  const comExtra = simularFinanciamento(e.financiamento, {
    mensal: e.amortizacaoMensal,
    modo: 'prazo',
  });
  const nominalMensalLiquido = Math.pow(1 + nominalLiquido, 1 / 12) - 1;

  let patrimonio = e.patrimonioHoje;
  let mesDeIndependencia: number | null = null;
  let patrimonioNaVirada = e.patrimonioHoje;
  let saldoNaVirada = e.financiamento.valor;

  for (let mes = 1; mes <= comExtra.mesesAteQuitar; mes++) {
    patrimonio = patrimonio * (1 + nominalMensalLiquido) + e.aporteMensal;
    const saldo = comExtra.parcelas[mes - 1]?.saldo ?? 0;
    // `saldo > 0` importa: no último mês a dívida zera e `0 >= 0` marcaria
    // "independência" pra quem chegou lá pagando, não por ter o dinheiro. O
    // marco é poder QUITAR ANTES — dívida quitada não é marco, é o fim.
    if (mesDeIndependencia === null && saldo > 0 && patrimonio >= saldo) {
      mesDeIndependencia = mes;
      patrimonioNaVirada = patrimonio;
      saldoNaVirada = saldo;
    }
  }

  return {
    taxaRealContrato,
    retornoRealLiquido,
    custoDoIR: e.retornoRealAnual - retornoRealLiquido,
    vence: Math.abs(margem) < EMPATE ? 'empate' : margem > 0 ? 'investir' : 'amortizar',
    margem,
    retornoDeEmpate,
    mesDeIndependencia,
    patrimonioNaVirada,
    saldoNaVirada,
    mesesAteQuitar: comExtra.mesesAteQuitar,
  };
}
