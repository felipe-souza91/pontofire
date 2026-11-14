/**
 * Réguas do mercado — CDI e IPCA mês a mês, e o CDI de cada dia útil.
 *
 * É o que deixa o app comparar a carteira do usuário com "deixar no CDI" e com
 * a inflação, e o que dá ao Início algo verdadeiro pra dizer num dia qualquer
 * do mês (o patrimônio só é conhecido no fechamento; o CDI anda todo dia).
 *
 * Mesma fonte e mesmas regras de `indicadores.ts`: API pública do Banco Central
 * (SGS), cache diário em localStorage, e falha de rede NUNCA quebra tela —
 * quem consome trata `null` como "sem régua" e simplesmente não compara.
 *
 * Separado de `indicadores.ts` de propósito: aquele guarda fotos (um número por
 * indicador); este guarda séries datadas. Misturar os dois obrigaria a
 * invalidar o cache das fotos toda vez que o formato das séries mudasse.
 */

import type { TaxaDoDia, TaxasPorMes } from '@pontofire/engine';
import { BASE, ddmmaaaa, pedir, type PontoSGS } from './indicadores';

/** Códigos no SGS. Conferidos toda semana pelo CI (scripts/verificar-series.mjs). */
export const SERIES_MERCADO = {
  cdiMensal: 4391, // % a.m. — CDI acumulado no mês
  cdiDiario: 12, // % a.d. — CDI de cada dia útil
  ipca: 433, // % a.m.
} as const;

/** Dez anos de histórico mensal cobrem qualquer usuário do beta com folga. */
const MESES_HISTORICO = 120;
/** Diário: o suficiente pra cobrir do último fechamento até hoje, com atraso. */
const DIAS_HISTORICO = 100;

/**
 * Faixas de sanidade. Código de série errado não dá erro — dá NÚMEROS, só que
 * de outra coisa. CDI mensal vive entre ~0,1% e ~1,5%; CDI diário, na casa de
 * 0,05%. Qualquer coisa fora disso é outra série, e é melhor não comparar nada
 * do que comparar com um número absurdo com cara de verdade.
 */
const FAIXA_CDI_MENSAL = [0, 3] as const; // % a.m.
const FAIXA_CDI_DIARIO = [0, 0.2] as const; // % a.d.
const FAIXA_IPCA_MENSAL = [-2, 5] as const; // % a.m.

export interface Mercado {
  /** competência → taxa decimal do mês */
  cdiMensal: TaxasPorMes;
  ipcaMensal: TaxasPorMes;
  /** CDI de cada dia útil recente, em ordem crescente de data */
  cdiDiario: TaxaDoDia[];
  /** quando foi buscado (ISO) */
  atualizadoEm: string;
}

const numero = (v: string): number => Number(String(v).replace(',', '.'));

/** `'03/11/2026'` → `'2026-11-03'`. `null` se não for data do SGS. */
export function dataSGSParaISO(data: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/**
 * Série mensal em % → mapa por competência, em decimal.
 *
 * Um ponto fora da faixa derruba a série INTEIRA, não só ele: se um valor é
 * absurdo, o código da série está errado, e os outros valores também são de
 * outra coisa — só que com cara plausível.
 */
export function mensalPorCompetencia(
  pontos: readonly PontoSGS[],
  [min, max]: readonly [number, number],
): TaxasPorMes | null {
  const out: Record<string, number> = {};
  for (const p of pontos) {
    const iso = dataSGSParaISO(p.data);
    const v = numero(p.valor);
    if (!iso || !Number.isFinite(v) || v < min || v > max) return null;
    out[iso.slice(0, 7)] = v / 100;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function diarioEmOrdem(
  pontos: readonly PontoSGS[],
  [min, max]: readonly [number, number],
): TaxaDoDia[] | null {
  const out: TaxaDoDia[] = [];
  for (const p of pontos) {
    const iso = dataSGSParaISO(p.data);
    const v = numero(p.valor);
    if (!iso || !Number.isFinite(v) || v < min || v > max) return null;
    out.push({ data: iso, taxa: v / 100 });
  }
  return out.sort((a, b) => a.data.localeCompare(b.data));
}

/** CDI diário composto dentro de um mês de competência. */
function compostoNoMes(diario: readonly TaxaDoDia[], mes: string): { fator: number; dias: number } {
  let fator = 1;
  let dias = 0;
  for (const d of diario) {
    if (d.data.slice(0, 7) !== mes) continue;
    fator *= 1 + d.taxa;
    dias++;
  }
  return { fator, dias };
}

/**
 * Junta as três séries no formato que o app usa.
 *
 * Duas decisões que não são óbvias:
 *
 * 1. O MÊS CORRENTE sai das séries mensais. O SGS publica o "acumulado no mês"
 *    ainda com o mês aberto, e usar meio mês como se fosse o mês inteiro faria
 *    a régua parecer mais lenta do que é. O CDI do mês corrente é refeito a
 *    partir do diário (que é exato até o último dia útil); o IPCA do mês
 *    corrente simplesmente não existe ainda.
 *
 * 2. O diário é CRUZADO com o mensal: composto num mês fechado, ele tem que
 *    reproduzir o número mensal publicado. Se não reproduzir, uma das duas
 *    séries não é o que pensamos — e o diário (a mais nova e menos testada) é
 *    descartado, levando junto a estimativa do dia.
 */
export function montarMercado(
  cru: { cdiMensal: readonly PontoSGS[] | null; ipca: readonly PontoSGS[] | null; cdiDiario: readonly PontoSGS[] | null },
  hoje: Date,
): Mercado | null {
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const semMesAberto = (t: TaxasPorMes | null): Record<string, number> =>
    Object.fromEntries(Object.entries(t ?? {}).filter(([mes]) => mes < mesAtual));

  const cdiMensal = semMesAberto(cru.cdiMensal ? mensalPorCompetencia(cru.cdiMensal, FAIXA_CDI_MENSAL) : null);
  const ipcaMensal = semMesAberto(cru.ipca ? mensalPorCompetencia(cru.ipca, FAIXA_IPCA_MENSAL) : null);
  let cdiDiario = (cru.cdiDiario ? diarioEmOrdem(cru.cdiDiario, FAIXA_CDI_DIARIO) : null) ?? [];

  // cruzamento diário × mensal, no mês fechado mais recente que os dois cobrem
  const fechados = Object.keys(cdiMensal).sort().reverse();
  for (const mes of fechados) {
    const { fator, dias } = compostoNoMes(cdiDiario, mes);
    if (dias < 15) continue; // mês só parcialmente coberto pelo diário: não serve de prova
    if (Math.abs((fator - 1) - cdiMensal[mes]!) > 0.0008) cdiDiario = [];
    break;
  }

  // CDI do mês corrente, refeito do diário
  const aberto = compostoNoMes(cdiDiario, mesAtual);
  if (aberto.dias > 0) cdiMensal[mesAtual] = aberto.fator - 1;

  if (Object.keys(cdiMensal).length === 0 && Object.keys(ipcaMensal).length === 0) return null;
  return { cdiMensal, ipcaMensal, cdiDiario, atualizadoEm: hoje.toISOString() };
}

// ---------------------------------------------------------------------------
// cache

/** Mudou o formato de `Mercado`? Sobe a versão (ver a nota em indicadores.ts). */
const CACHE_KEY = 'pf:mercado:v1';

const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function taxasValidas(cru: unknown): Record<string, number> {
  if (!cru || typeof cru !== 'object') return {};
  return Object.fromEntries(
    Object.entries(cru as Record<string, unknown>).filter(
      (par): par is [string, number] => /^\d{4}-\d{2}$/.test(par[0]) && ehNumero(par[1]),
    ),
  );
}

/** O que veio do localStorage é dado de fora: tudo conferido por tipo. */
export function normalizarMercado(cru: unknown): Mercado | null {
  if (!cru || typeof cru !== 'object') return null;
  const o = cru as Record<string, unknown>;
  if (typeof o.atualizadoEm !== 'string') return null;
  const diario = Array.isArray(o.cdiDiario)
    ? o.cdiDiario.filter(
        (d): d is TaxaDoDia =>
          !!d && typeof d === 'object' &&
          /^\d{4}-\d{2}-\d{2}$/.test(String((d as TaxaDoDia).data)) &&
          ehNumero((d as TaxaDoDia).taxa),
      )
    : [];
  return {
    cdiMensal: taxasValidas(o.cdiMensal),
    ipcaMensal: taxasValidas(o.ipcaMensal),
    cdiDiario: diario,
    atualizadoEm: o.atualizadoEm,
  };
}

async function janela(codigo: number, desde: Date, ate: Date): Promise<PontoSGS[]> {
  // sempre por janela de datas: `/ultimos/N` recusa N grande em várias séries
  return pedir(
    `${BASE}.${codigo}/dados?formato=json&dataInicial=${ddmmaaaa(desde)}&dataFinal=${ddmmaaaa(ate)}`,
  );
}

async function buscarMercado(): Promise<Mercado | null> {
  const hoje = new Date();
  const inicioMensal = new Date(hoje.getFullYear(), hoje.getMonth() - MESES_HISTORICO, 1);
  const inicioDiario = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - DIAS_HISTORICO);

  const [cdiMensal, ipca, cdiDiario] = await Promise.allSettled([
    janela(SERIES_MERCADO.cdiMensal, inicioMensal, hoje),
    janela(SERIES_MERCADO.ipca, inicioMensal, hoje),
    janela(SERIES_MERCADO.cdiDiario, inicioDiario, hoje),
  ]);

  return montarMercado(
    {
      cdiMensal: cdiMensal.status === 'fulfilled' ? cdiMensal.value : null,
      ipca: ipca.status === 'fulfilled' ? ipca.value : null,
      cdiDiario: cdiDiario.status === 'fulfilled' ? cdiDiario.value : null,
    },
    hoje,
  );
}

/** Réguas com cache diário. Devolve `null` sem dados — nunca lança. */
export async function getMercado(): Promise<Mercado | null> {
  const hoje = new Date().toISOString().slice(0, 10);

  const doCache = (): Mercado | null => {
    try {
      const cru = localStorage.getItem(CACHE_KEY);
      return cru ? normalizarMercado(JSON.parse(cru)) : null;
    } catch {
      return null;
    }
  };

  const salvo = doCache();
  if (salvo && salvo.atualizadoEm.slice(0, 10) === hoje) return salvo;

  try {
    const novo = await buscarMercado();
    if (!novo) return salvo; // nada veio: melhor a régua de ontem que régua nenhuma
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(novo));
    } catch {
      /* localStorage cheio/bloqueado: segue sem cache */
    }
    return novo;
  } catch {
    return salvo;
  }
}
