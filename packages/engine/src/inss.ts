/**
 * Módulo INSS vs. Liberdade (§8) — o "choque de realidade".
 *
 * ESTIMATIVA SIMPLIFICADA, não promessa. A média real do INSS considera TODAS
 * as contribuições desde jul/1994 corrigidas; aqui usamos o salário atual como
 * proxy (o app não tem o histórico). O consumidor DEVE exibir isso como
 * estimativa e mandar conferir no Meu INSS.
 */

/** Constantes por ano — atualizáveis por config (§ plano M6). */
export interface ConstantesINSS {
  ano: number;
  teto: number;
  piso: number;
}

export const INSS_2026: ConstantesINSS = {
  ano: 2026,
  teto: 8475.55,
  piso: 1621.0,
};

/** A lei do INSS usa regras distintas por sexo — daí o campo. */
export type SexoINSS = 'F' | 'M';

/** Reforma da Previdência: quem já contribuía antes disto cai nas transições. */
const REFORMA = '2019-11';

export interface EntradaINSS {
  /** ISO yyyy-mm-dd */
  dataNascimento: string;
  /** yyyy-mm */
  inicioContribuicao: string;
  /** salário bruto atual — proxy da média das contribuições */
  salarioBruto: number;
  sexo: SexoINSS;
  hoje?: Date;
  constantes?: ConstantesINSS;
}

export interface EstimativaINSS {
  regra: 'permanente' | 'transicao';
  /** anos de contribuição exigidos */
  anosContribuicaoMinimo: number;
  /** idade mínima exigida no ano da elegibilidade */
  idadeMinimaExigida: number;
  dataElegivel: Date;
  idadeElegivel: number;
  anosContribuicaoNaData: number;
  /** média usada no cálculo (salário limitado ao teto) */
  mediaEstimada: number;
  /** 60% + 2% por ano acima do mínimo */
  percentual: number;
  beneficioEstimado: number;
  limitadoAoTeto: boolean;
  elevadoAoPiso: boolean;
}

function mesesEntre(inicio: Date, fim: Date): number {
  return (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
}

function addMeses(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setMonth(r.getMonth() + n);
  return r;
}

function idadeEm(nascimento: Date, data: Date): number {
  return mesesEntre(nascimento, data) / 12;
}

/**
 * Idade mínima exigida no ano `ano`.
 *  - permanente (entrou após a reforma): 62 (F) / 65 (M).
 *  - transição por idade progressiva: sobe 6 meses por ano desde 2019
 *    (F: 56 → teto 62 · M: 61 → teto 65).
 */
export function idadeMinimaINSS(ano: number, sexo: SexoINSS, regra: 'permanente' | 'transicao'): number {
  const limite = sexo === 'F' ? 62 : 65;
  if (regra === 'permanente') return limite;
  const base = sexo === 'F' ? 56 : 61;
  return Math.min(limite, base + 0.5 * (ano - 2019));
}

/** Anos de contribuição exigidos: 15 (F) / 20 (M). */
export function anosContribuicaoMinimo(sexo: SexoINSS): number {
  return sexo === 'F' ? 15 : 20;
}

export function estimarINSS(e: EntradaINSS): EstimativaINSS {
  const c = e.constantes ?? INSS_2026;
  const hoje = e.hoje ?? new Date();
  const nascimento = new Date(`${e.dataNascimento}T00:00:00`);
  const inicio = new Date(`${e.inicioContribuicao}-01T00:00:00`);

  const regra: 'permanente' | 'transicao' = e.inicioContribuicao < REFORMA ? 'transicao' : 'permanente';
  const contribMin = anosContribuicaoMinimo(e.sexo);

  // procura o primeiro mês em que idade E tempo de contribuição são atingidos
  let data = hoje;
  let idade = idadeEm(nascimento, data);
  let anosContrib = mesesEntre(inicio, data) / 12;
  let idadeMin = idadeMinimaINSS(data.getFullYear(), e.sexo, regra);

  for (let m = 0; m <= 12 * 80; m++) {
    data = addMeses(hoje, m);
    idade = idadeEm(nascimento, data);
    anosContrib = mesesEntre(inicio, data) / 12;
    idadeMin = idadeMinimaINSS(data.getFullYear(), e.sexo, regra);
    if (idade >= idadeMin && anosContrib >= contribMin) break;
  }

  // valor: 60% da média + 2% por ano completo acima do mínimo
  const media = Math.min(e.salarioBruto, c.teto);
  const anosExtras = Math.max(0, Math.floor(anosContrib) - contribMin);
  const percentual = Math.min(1, 0.6 + 0.02 * anosExtras);

  const bruto = media * percentual;
  const limitadoAoTeto = bruto > c.teto;
  const elevadoAoPiso = bruto < c.piso;
  const beneficio = Math.min(c.teto, Math.max(c.piso, bruto));

  return {
    regra,
    anosContribuicaoMinimo: contribMin,
    idadeMinimaExigida: idadeMin,
    dataElegivel: data,
    idadeElegivel: idade,
    anosContribuicaoNaData: anosContrib,
    mediaEstimada: media,
    percentual,
    beneficioEstimado: beneficio,
    limitadoAoTeto,
    elevadoAoPiso,
  };
}
