/**
 * Categorização — dicionário determinístico + memória do usuário.
 *
 * O dicionário cobre o que é repetitivo no Brasil (iFood, posto, farmácia,
 * streaming). O que ele não souber fica SEM categoria e a tela de revisão
 * pergunta — nada de empurrar tudo pra "Outros" e o número virar ficção.
 *
 * A memória (`memo → categoria`) vem do Firestore e SEMPRE ganha do
 * dicionário: se o usuário corrigiu uma vez, é ele quem manda.
 *
 * Convenção dos padrões: todos começam com `\b` (início de palavra) e a
 * maioria é RADICAL, não palavra inteira — "SUPERMERC" precisa pegar
 * "SUPERMERCADO". Onde o radical seria ambíguo em português ("EXTRA" dentro de
 * "EXTRATO", "MAX", "TIM"), o `\b` final está escrito na própria alternativa.
 */

import { normalizar } from './texto';
import type { MemoriaCategoria, TipoLancamento } from './tipos';

interface RegraCategoria {
  padrao: RegExp;
  categoria: string;
  /** força o tipo (ex.: dividendo é sempre renda passiva) */
  tipo?: TipoLancamento;
}

/** Casado contra a descrição normalizada (MAIÚSCULA, sem acento). */
const SAIDAS: RegraCategoria[] = [
  { padrao: /\b(IFOOD|RAPPI|UBER EATS|JAMES DELIVERY|AIQFOME|DELIVERY|99 ?FOOD)/, categoria: 'Delivery' },
  { padrao: /\b(UBER\b|99 ?POP|99 ?TAXI|99 TECNOLOGIA|CABIFY|TAXI\b|BLABLACAR|BUSER|CLICKBUS)/, categoria: 'Transporte' },
  { padrao: /\b(POSTO|IPIRANGA|SHELL\b|ALESAT|BR MANIA|PETROBRAS|COMBUSTIVEL)/, categoria: 'Transporte' },
  { padrao: /\b(ESTACIONAMENTO|ZONA AZUL|SEM PARAR|CONECTCAR|VELOE|PEDAGIO|METRO\b|BILHETE UNICO)/, categoria: 'Transporte' },
  { padrao: /\b(DETRAN|IPVA|LICENCIAMENTO|MECANICA|AUTO CENTER|PNEU)/, categoria: 'Transporte' },
  { padrao: /\b(DROGA|FARMACIA|PACHECO|RAIA\b|PAGUE MENOS|VENANCIO|PANVEL)/, categoria: 'Saúde' },
  { padrao: /\b(HOSPITAL|CLINICA|LABORATORIO|UNIMED|AMIL\b|SULAMERICA|ODONTO|DENTISTA|PSICOLOG|FISIOTERAP)/, categoria: 'Saúde' },
  { padrao: /\b(ACADEMIA|SMART ?FIT|BLUEFIT|GYM\b|CROSSFIT|PILATES|TOTALPASS|GYMPASS|WELLHUB)/, categoria: 'Saúde' },
  { padrao: /\b(SUPERMERC|CARREFOUR|ASSAI|ATACAD|PAO DE ACUCAR|SENDAS|BOMPRECO|BOM PRECO|HORTIFRUTI|SACOLAO|ACOUGUE|PADARIA|MERCADINHO|EXTRA\b|MERCADO(?! ?(LIVRE|PAGO|BITCOIN)))/, categoria: 'Mercado' },
  { padrao: /\b(RESTAURANTE|LANCHONETE|BURGER|PIZZA|CAFE|STARBUCKS|MC ?DONALDS|SUBWAY|HABIBS|OUTBACK|CHURRAS|SORVETE|CONFEITARIA)/, categoria: 'Alimentação' },
  { padrao: /\b(NETFLIX|SPOTIFY|DISNEY|HBO\b|MAX\b|PARAMOUNT|GLOBOPLAY|DEEZER|YOUTUBE|PRIME VIDEO|APPLE ?COM|ITUNES|ICLOUD|GOOGLE ?ONE|MICROSOFT|ADOBE|CHATGPT|OPENAI|CLAUDE ?AI|ANTHROPIC|CANVA)/, categoria: 'Assinaturas' },
  { padrao: /\b(ENERGIA|ELETRIC|CEMIG|LIGHT\b|ENEL\b|COPEL|CPFL|ELEKTRO|EQUATORIAL|NEOENERGIA|CELESC|CELPE|COELBA)/, categoria: 'Contas' },
  { padrao: /\b(SANEAMENTO|SABESP|CEDAE|COPASA|CAGECE|EMBASA|SANEPAR|CORSAN|AGUA E ESGOTO)/, categoria: 'Contas' },
  { padrao: /\b(COMGAS|ULTRAGAZ|LIQUIGAS|NACIONAL GAS|GAS NATURAL)/, categoria: 'Contas' },
  { padrao: /\b(VIVO\b|CLARO\b|TIM\b|OI FIXO|ALGAR|NEXTEL|INTERNET|BANDA LARGA|TELEFONIA|TELECOM)/, categoria: 'Contas' },
  { padrao: /\b(TARIFA|ANUIDADE|CESTA DE SERVICOS|IOF\b|JUROS|MULTA|MORA\b|ENCARGOS|TAXA BANCARIA|MANUTENCAO DE CONTA)/, categoria: 'Contas' },
  { padrao: /\b(ALUGUEL|IMOBILIARIA|CONDOMINIO|IPTU|SINDICO|LOCACAO DE IMOVEL)/, categoria: 'Moradia' },
  { padrao: /\b(LEROY|TELHANORTE|MADEIREIRA|MATERIAL DE CONSTRUCAO|TOK ?STOK|MOBLY|CASAS BAHIA|MAGAZINE ?LUIZA|MAGALU|MOVEIS)/, categoria: 'Moradia' },
  { padrao: /\b(ESCOLA|COLEGIO|FACULDADE|UNIVERSIDADE|MENSALIDADE|UDEMY|ALURA|COURSERA|HOTMART|LIVRARIA|MATERIAL ESCOLAR)/, categoria: 'Educação' },
  { padrao: /\b(CINEMA|CINEMARK|INGRESSO|TICKET ?MASTER|SYMPLA|TEATRO|CERVEJARIA|BOTECO|CHOPERIA|STEAM ?GAMES|PLAYSTATION|XBOX|NINTENDO|EPIC ?GAMES)/, categoria: 'Lazer' },
  { padrao: /\b(RENNER|RIACHUELO|ZARA\b|HERING|CENTAURO|NIKE\b|ADIDAS|NETSHOES|VESTUARIO|CALCADOS|BOUTIQUE)/, categoria: 'Vestuário' },
  { padrao: /\b(PETZ|COBASI|PETLOVE|PET ?SHOP|VETERINARI|AGROPET)/, categoria: 'Pets' },
  { padrao: /\b(LATAM|GOL LINHAS|AZUL LINHAS|SMILES|DECOLAR|BOOKING|AIRBNB|HOTEL|POUSADA|CVC\b|HURB)/, categoria: 'Viagem' },
  { padrao: /\b(AMAZON|MERCADO ?LIVRE|MERCADO ?PAGO|SHOPEE|ALIEXPRESS|AMERICANAS|SUBMARINO|SHEIN|TEMU)/, categoria: 'Compras' },
  { padrao: /\b(DARF|IRPF|RECEITA FEDERAL|IMPOSTO|SIMPLES NACIONAL|GPS\b|INSS)/, categoria: 'Impostos' },
  { padrao: /\b(SEGURO|PORTO SEGURO|ALLIANZ|SEGURADORA)/, categoria: 'Seguros' },
];

const ENTRADAS: RegraCategoria[] = [
  { padrao: /\b(SALARIO|PROVENTOS|FOLHA DE PAGAMENTO|REMUNERACAO|ADIANTAMENTO SALARIAL|VENCIMENTOS)/, categoria: 'Salário', tipo: 'ativa' },
  { padrao: /\b(13 SALARIO|DECIMO TERCEIRO|FERIAS|ABONO)/, categoria: '13º / férias', tipo: 'ativa' },
  { padrao: /\b(PLR\b|PARTICIPACAO NOS LUCROS|BONUS|COMISS)/, categoria: 'Bônus', tipo: 'ativa' },
  { padrao: /\b(NOTA FISCAL|PRESTACAO DE SERVICO|HONORARIOS|FREELA|PRO ?LABORE)/, categoria: 'Freelance / PJ', tipo: 'ativa' },
  { padrao: /\b(DIVIDENDO|JCP\b|JUROS SOBRE CAPITAL)/, categoria: 'Dividendos', tipo: 'passiva' },
  { padrao: /\b(FII\b|FUNDO IMOBILIARIO)/, categoria: 'FIIs', tipo: 'passiva' },
  { padrao: /\b(RENDIMENTO|RENDA FIXA|CDB\b|TESOURO|LCI\b|LCA\b|CRI\b|CRA\b|DEBENTURE|SELIC)/, categoria: 'Juros / Renda fixa', tipo: 'passiva' },
  { padrao: /\b(ALUGUEL|LOCACAO|LOCATARIO)/, categoria: 'Aluguéis', tipo: 'passiva' },
  { padrao: /\b(RESTITUICAO|REEMBOLSO|ESTORNO|DEVOLUCAO|CASHBACK)/, categoria: 'Reembolsos', tipo: 'ativa' },
];

/**
 * Movimento entre contas suas: NÃO é receita nem despesa.
 *
 * `tipo` é o balde certo caso o usuário decida incluir mesmo assim — pagamento
 * de fatura continua sendo saída, mas aplicação em CDB é APORTE, não consumo.
 */
const TRANSFERENCIAS: { padrao: RegExp; tipo: TipoLancamento; explicacao: string }[] = [
  {
    padrao: /\b(PAGAMENTO DE FATURA|PAGAMENTO FATURA|PAGTO FATURA|PAGAMENTO CARTAO|PAGTO CARTAO|PAGAMENTO DE CARTAO|FATURA CARTAO)/,
    tipo: 'saida',
    explicacao: 'pagamento de fatura — as compras entram pelo arquivo da fatura, não por aqui',
  },
  {
    padrao: /\b(APLICACAO|APLIC AUTOMATICA|INVEST FACIL|RESGATE|TRANSF ENTRE CONTAS|TRANSFERENCIA ENTRE CONTAS|CONTA INVESTIMENTO|POUPANCA)/,
    tipo: 'aporte',
    explicacao: 'dinheiro indo pra sua carteira — o patrimônio já registra isso',
  },
  {
    // Cofrinho do Mercado Pago: "Reserva por gastos", "Dinheiro retirado",
    // "Reserva programada". São ~30 lançamentos por mês num extrato real e
    // inflavam o gasto do mês inteiro se contassem como despesa.
    padrao: /\b(RESERVA POR GASTOS|RESERVA PROGRAMADA|DINHEIRO RESERVADO|DINHEIRO RETIRADO|COFRINHO|CAIXINHA|GUARDAR DINHEIRO)/,
    tipo: 'aporte',
    explicacao: 'movimento do seu cofrinho — o dinheiro continua seu',
  },
];

/**
 * Rendimento de saldo em conta. Precisa ser testado ANTES das transferências:
 * "Rentab.invest Facilcred" do Bradesco casava com o padrão de aplicação e
 * virava transferência, quando na verdade é renda passiva entrando.
 */
const RENDIMENTO_DE_SALDO = /\b(RENTAB|RENDIMENTO|REMUNERACAO DE SALDO|RENDE FACIL)/;

/** Saída pra corretora: é aporte, não consumo. */
const APORTES = /\b(TESOURO DIRETO|CORRETORA|XP INVESTIMENTOS|RICO INVEST|CLEAR\b|BTG\b|NUINVEST|EASYNVEST|AVENUE|BINANCE|MERCADO ?BITCOIN|FOXBIT|APORTE|COMPRA DE ACOES|COMPRA DE TITULO)/;

export interface Classificacao {
  categoria: string;
  tipo: TipoLancamento;
  /** por que ficou assim — vira a pista embaixo da linha na revisão */
  motivo?: string;
  /** transferência entre contas: não deve entrar no mês */
  transferencia?: string;
}

/**
 * Classifica um lançamento. `direcao` já foi resolvida antes (pelo sinal, pela
 * coluna crédito/débito ou pela resposta do usuário).
 *
 * Precedência: memória do usuário → transferência → aporte → dicionário →
 * nada (categoria vazia, e a revisão pergunta).
 */
export function classificar(
  descricao: string,
  direcao: 'entrada' | 'saida',
  memoria: readonly MemoriaCategoria[] = [],
  chave = '',
): Classificacao {
  const n = normalizar(descricao);

  const lembrado = memoria.find((m) => m.chave === chave);
  if (lembrado) {
    return { categoria: lembrado.categoria, tipo: lembrado.tipo, motivo: 'você já classificou assim antes' };
  }

  if (direcao === 'entrada' && RENDIMENTO_DE_SALDO.test(n)) {
    return { categoria: 'Juros / Renda fixa', tipo: 'passiva', motivo: 'rendimento do saldo em conta' };
  }

  for (const t of TRANSFERENCIAS) {
    if (t.padrao.test(n)) {
      return {
        categoria: 'Transferência',
        tipo: direcao === 'entrada' ? 'ativa' : t.tipo,
        transferencia: t.explicacao,
        motivo: t.explicacao,
      };
    }
  }

  if (direcao === 'saida' && APORTES.test(n)) {
    return { categoria: 'Outros', tipo: 'aporte', motivo: 'parece dinheiro indo pra carteira, não consumo' };
  }

  for (const r of direcao === 'entrada' ? ENTRADAS : SAIDAS) {
    if (r.padrao.test(n)) {
      return {
        categoria: r.categoria,
        tipo: r.tipo ?? (direcao === 'entrada' ? 'ativa' : 'saida'),
        motivo: 'reconhecido pela descrição',
      };
    }
  }

  return { categoria: '', tipo: direcao === 'entrada' ? 'ativa' : 'saida' };
}
