import { metaVigente } from './partida';

/**
 * O que vale HOJE: custo e aporte tirados dos meses lançados.
 *
 * A data FIRE saía de dois números digitados uma vez no onboarding. Quem
 * lançava doze meses de dados reais via a data ignorar todos eles — o app
 * prometia responder à vida da pessoa e não respondia.
 *
 * Aqui o mundo observa e o usuário declara: custo e aporte viram observação,
 * retorno esperado continua declarado (seis meses de mercado não dizem nada
 * sobre vinte anos), patrimônio já era observação.
 */

/** Quantos meses a janela olha pra trás. Em 3 anos a vida muda. */
export const JANELA_MESES = 6;

/** Abaixo disso a mediana é ruído; melhor assumir o declarado e dizer isso. */
export const MINIMO_MESES = 3;

export interface MesLancado {
  mes: string;
  gastoTotal: number;
  aportesMes: number;
  /** false/ausente = aporte derivado de receita − despesa, não digitado */
  aporteObservado?: boolean;
  /** fora do padrão: sai da conta por escolha do usuário */
  atipico?: boolean;
}

export interface Vigente {
  valor: number;
  fonte: 'observado' | 'declarado';
  /** quantos meses entraram na mediana */
  mesesUsados: number;
  /** quantos ainda faltam pra sair do declarado; 0 quando já é observado */
  faltam: number;
}

/**
 * Mediana, não média.
 *
 * A média deixa um mês de reforma reescrever a rotina inteira. A mediana
 * ignora o extremo por construção — e é isso que faz a data parar de pular
 * quando a vida tem um sobressalto.
 */
export function mediana(valores: readonly number[]): number {
  if (!valores.length) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2
    ? ordenados[meio]!
    : (ordenados[meio - 1]! + ordenados[meio]!) / 2;
}

/**
 * Filtra e recorta a janela.
 *
 * FILTRA ANTES de recortar, de propósito: quem marcou três meses seguidos como
 * atípicos tem mais informação nos seis meses normais anteriores do que num
 * número digitado no onboarding. O aviso de "atípicos demais" cobre o caso
 * patológico de alguém marcar tudo.
 */
function janela<T extends MesLancado>(meses: readonly T[], serve: (m: T) => boolean): T[] {
  return meses.filter((m) => !m.atipico && serve(m)).slice(-JANELA_MESES);
}

function resolver(valores: readonly number[], declarado: number): Vigente {
  if (valores.length < MINIMO_MESES) {
    return {
      valor: declarado,
      fonte: 'declarado',
      mesesUsados: valores.length,
      faltam: MINIMO_MESES - valores.length,
    };
  }
  return {
    valor: mediana(valores),
    fonte: 'observado',
    mesesUsados: valores.length,
    faltam: 0,
  };
}

/** Custo de vida vigente. Todo mês lançado serve — `gastoTotal` sempre foi entrada real. */
export function custoVigente(meses: readonly MesLancado[], declarado: number): Vigente {
  return resolver(
    janela(meses, () => true).map((m) => m.gastoTotal),
    declarado,
  );
}

/**
 * Aporte vigente. Só conta mês com aporte DIGITADO.
 *
 * Antes da Fase 2 o aporte era `receita − despesa`, uma inferência. Usá-la aqui
 * seria promover palpite a fato — e logo no número que decide a data.
 */
export function aporteVigente(meses: readonly MesLancado[], declarado: number): Vigente {
  return resolver(
    janela(meses, (m) => m.aporteObservado === true).map((m) => m.aportesMes),
    declarado,
  );
}

/** Quantos dos meses recentes o usuário marcou como fora do padrão. */
export function proporcaoAtipica(meses: readonly MesLancado[]): {
  atipicos: number;
  total: number;
} {
  const recentes = meses.slice(-JANELA_MESES);
  return { atipicos: recentes.filter((m) => m.atipico).length, total: recentes.length };
}

export interface PerfilVigente {
  custoVidaMensal: number;
  aporteMensal: number;
  taxaSaqueSegura: number;
  metaFire: number;
  metaTravada?: boolean;
}

export interface EstadoVigente {
  custo: Vigente;
  aporte: Vigente;
  /** derivada do custo VIGENTE — é o que faz a meta acompanhar a vida real */
  meta: number;
}

/**
 * O estado que alimenta o motor. Ponto único: qualquer tela que precise de
 * custo, aporte ou meta pergunta aqui.
 *
 * Ter duas telas resolvendo isso por conta própria produziria duas datas
 * diferentes pro mesmo usuário — e a data é a promessa do produto.
 */
export function estadoVigente(
  perfil: PerfilVigente,
  meses: readonly MesLancado[],
): EstadoVigente {
  const custo = custoVigente(meses, perfil.custoVidaMensal);
  return {
    custo,
    aporte: aporteVigente(meses, perfil.aporteMensal),
    meta: metaVigente({ ...perfil, custoVidaMensal: custo.valor }),
  };
}
