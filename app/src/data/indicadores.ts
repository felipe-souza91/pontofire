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
  selicMeta: 432, // % a.a.
  ipca: 433, // variação mensal %
  inpc: 188, // variação mensal % (código a confirmar no catálogo SGS)
  igpm: 189, // variação mensal %
} as const;

export interface Indicadores {
  /** Selic meta em % a.a. (ex.: 10.5) */
  selicMeta: number | null;
  /** IPCA acumulado 12 meses em % (ex.: 4.2) */
  ipca12m: number | null;
  /** INPC acumulado 12 meses em % */
  inpc12m: number | null;
  /** juro real anual = (1+selic)/(1+ipca) − 1, em % */
  juroReal: number | null;
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

/** Busca os indicadores no BACEN. Cada série falha de forma independente. */
async function buscarIndicadores(): Promise<Indicadores> {
  const [selic, ipca, inpc] = await Promise.allSettled([
    buscarSerie(SERIES.selicMeta, 1),
    buscarSerie(SERIES.ipca, 12),
    buscarSerie(SERIES.inpc, 12),
  ]);

  const selicMeta = selic.status === 'fulfilled' ? ultimoValor(selic.value) : null;
  const ipca12m = ipca.status === 'fulfilled' ? acumular(ipca.value) : null;
  const inpc12m = inpc.status === 'fulfilled' ? acumular(inpc.value) : null;

  // juro real composto (§6 regra 1): (1+nom)/(1+infl) − 1
  const juroReal =
    selicMeta !== null && ipca12m !== null
      ? ((1 + selicMeta / 100) / (1 + ipca12m / 100) - 1) * 100
      : null;

  return { selicMeta, ipca12m, inpc12m, juroReal, atualizadoEm: new Date().toISOString() };
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
