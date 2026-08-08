/**
 * Camada de dados econômicos (§9) — API pública do Banco Central (SGS),
 * sem chave e sem custo.
 *
 * Enquanto o projeto não tem plano Blaze, a busca roda no CLIENT com cache
 * diário em localStorage (alternativa prevista no §9). Quando houver Blaze,
 * migrar para a Cloud Function que grava em `indicadores/atual`.
 *
 * IMPORTANTE: falha de rede/CORS NÃO pode quebrar a tela — todo consumidor
 * deve tratar `null` como "sem dados" e simplesmente não exibir o card.
 */

const BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

/** Códigos das séries no SGS (§9). */
export const SERIES = {
  selicMeta: 432, // % a.a. — meta definida pelo Copom (foto de hoje)
  selicMensal: 4390, // % a.m. — Selic efetivamente acumulada no mês
  ipca: 433, // variação mensal %
  inpc: 188, // variação mensal % (código a confirmar no catálogo SGS)
  igpm: 189, // variação mensal %
} as const;

/** Janela do juro real histórico — 10 anos cobre ciclos de alta e de baixa. */
export const ANOS_HISTORICO = 10;

/**
 * Rede de segurança contra código de série errado.
 *
 * Se algum dia o SGS mudar um código (ou eu tiver errado um), é melhor o card
 * não mostrar nada do que mostrar um número absurdo com cara de verdade.
 * Selic acumulada no mês vive entre ~0,2% e ~1,3% a.m.; IPCA mensal, entre
 * deflação leve e ~3%.
 */
const FAIXA_SELIC_MENSAL = [0, 3] as const;
const FAIXA_IPCA_MENSAL = [-2, 5] as const;

function plausivel(valores: number[], [min, max]: readonly [number, number]): boolean {
  return valores.length > 0 && valores.every((v) => Number.isFinite(v) && v >= min && v <= max);
}

export interface Indicadores {
  /** Selic meta em % a.a. (ex.: 10.5) */
  selicMeta: number | null;
  /** IPCA acumulado 12 meses em % (ex.: 4.2) */
  ipca12m: number | null;
  /** INPC acumulado 12 meses em % */
  inpc12m: number | null;
  /** juro real anual = (1+selic)/(1+ipca) − 1, em % — a FOTO de hoje */
  juroReal: number | null;
  /**
   * Juro real médio anualizado dos últimos `ANOS_HISTORICO` anos, em %.
   * É a comparação justa com a projeção do usuário, que é de longo prazo.
   */
  juroRealHistorico: number | null;
  /** quantos anos o histórico realmente cobriu (pode vir menos que o pedido) */
  anosHistorico: number | null;
  /** quando foi buscado (ISO) */
  atualizadoEm: string;
}

interface PontoSGS {
  data: string;
  valor: string;
}

const CACHE_KEY = 'pf:indicadores';

async function buscarSerie(codigo: number, ultimos: number): Promise<PontoSGS[]> {
  const r = await fetch(`${BASE}.${codigo}/dados/ultimos/${ultimos}?formato=json`);
  if (!r.ok) throw new Error(`SGS ${codigo}: HTTP ${r.status}`);
  return (await r.json()) as PontoSGS[];
}

/** Compõe variações mensais (%) em acumulado do período. */
function acumular(pontos: PontoSGS[]): number {
  const fator = pontos.reduce((acc, p) => acc * (1 + Number(p.valor.replace(',', '.')) / 100), 1);
  return (fator - 1) * 100;
}

function ultimoValor(pontos: PontoSGS[]): number | null {
  const p = pontos[pontos.length - 1];
  return p ? Number(p.valor.replace(',', '.')) : null;
}

const numeros = (pontos: PontoSGS[]): number[] =>
  pontos.map((p) => Number(p.valor.replace(',', '.')));

/** Compõe uma série mensal de % e anualiza: (Πfatores)^(12/n) − 1, em %. */
function anualizar(mensais: number[]): number {
  const fator = mensais.reduce((acc, v) => acc * (1 + v / 100), 1);
  return (Math.pow(fator, 12 / mensais.length) - 1) * 100;
}

/**
 * Juro real médio dos últimos anos: compõe a Selic REALIZADA e o IPCA no
 * mesmo período e tira um do outro (composto, §6 regra 1).
 *
 * Usa a Selic acumulada no mês (4390), não a meta (432): o que rendeu de fato
 * é o que importa aqui. As duas séries são truncadas ao mesmo tamanho porque
 * o IPCA costuma ser publicado com atraso.
 */
function juroRealDoPeriodo(selicMensal: PontoSGS[], ipcaMensal: PontoSGS[]): { taxa: number; anos: number } | null {
  const s = numeros(selicMensal);
  const p = numeros(ipcaMensal);
  const n = Math.min(s.length, p.length);
  if (n < 24) return null; // menos de 2 anos não é histórico, é ruído

  const sJanela = s.slice(-n);
  const pJanela = p.slice(-n);
  if (!plausivel(sJanela, FAIXA_SELIC_MENSAL) || !plausivel(pJanela, FAIXA_IPCA_MENSAL)) return null;

  const selicAA = anualizar(sJanela);
  const ipcaAA = anualizar(pJanela);
  return {
    taxa: ((1 + selicAA / 100) / (1 + ipcaAA / 100) - 1) * 100,
    anos: Math.round(n / 12),
  };
}

/** Busca os indicadores no BACEN. Cada série falha de forma independente. */
async function buscarIndicadores(): Promise<Indicadores> {
  const MESES_HISTORICO = ANOS_HISTORICO * 12;
  const [selic, ipca, inpc, selicHist, ipcaHist] = await Promise.allSettled([
    buscarSerie(SERIES.selicMeta, 1),
    buscarSerie(SERIES.ipca, 12),
    buscarSerie(SERIES.inpc, 12),
    buscarSerie(SERIES.selicMensal, MESES_HISTORICO),
    buscarSerie(SERIES.ipca, MESES_HISTORICO),
  ]);

  const selicMeta = selic.status === 'fulfilled' ? ultimoValor(selic.value) : null;
  const ipca12m = ipca.status === 'fulfilled' ? acumular(ipca.value) : null;
  const inpc12m = inpc.status === 'fulfilled' ? acumular(inpc.value) : null;

  const historico =
    selicHist.status === 'fulfilled' && ipcaHist.status === 'fulfilled'
      ? juroRealDoPeriodo(selicHist.value, ipcaHist.value)
      : null;

  // juro real composto (§6 regra 1): (1+nom)/(1+infl) − 1
  const juroReal =
    selicMeta !== null && ipca12m !== null
      ? ((1 + selicMeta / 100) / (1 + ipca12m / 100) - 1) * 100
      : null;

  return {
    selicMeta,
    ipca12m,
    inpc12m,
    juroReal,
    juroRealHistorico: historico?.taxa ?? null,
    anosHistorico: historico?.anos ?? null,
    atualizadoEm: new Date().toISOString(),
  };
}

/**
 * Indicadores com cache diário em localStorage.
 * Retorna null se não houver dados (rede/CORS fora) — nunca lança.
 */
export async function getIndicadores(): Promise<Indicadores | null> {
  const hoje = new Date().toISOString().slice(0, 10);
  try {
    const cru = localStorage.getItem(CACHE_KEY);
    if (cru) {
      const salvo = JSON.parse(cru) as Indicadores;
      if (salvo.atualizadoEm?.slice(0, 10) === hoje) return salvo;
    }
  } catch {
    /* cache inválido: ignora e busca de novo */
  }

  try {
    const novos = await buscarIndicadores();
    // se nada veio, não vale cachear nem exibir
    if (novos.selicMeta === null && novos.ipca12m === null) return null;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(novos));
    } catch {
      /* localStorage cheio/bloqueado: segue sem cache */
    }
    return novos;
  } catch {
    // rede/CORS fora: devolve o último cache conhecido, se houver
    try {
      const cru = localStorage.getItem(CACHE_KEY);
      return cru ? (JSON.parse(cru) as Indicadores) : null;
    } catch {
      return null;
    }
  }
}
