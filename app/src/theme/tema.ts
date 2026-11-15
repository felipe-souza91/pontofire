import { useSyncExternalStore } from 'react';

/**
 * Tema claro / escuro.
 *
 * TRÊS ESCOLHAS, NÃO DUAS
 * "Igual ao sistema" existe porque muita gente tem o celular trocando de tema
 * sozinho ao anoitecer, e quer que o app acompanhe. Um botão de dois estados
 * obrigaria essa pessoa a escolher um lado.
 *
 * O PADRÃO É ESCURO
 * Quem nunca escolheu continua vendo o app como sempre viu. Seguir o sistema
 * por padrão trocaria a cara inteira do produto, sem aviso, pra todo usuário do
 * beta com o celular em modo claro — e a landing, por onde todos entram, é
 * escura. Quem quiser o claro (ou o automático) escolhe uma vez.
 *
 * FICA NO APARELHO, NÃO NA CONTA
 * É preferência de tela, não de pessoa: o mesmo usuário pode querer claro no
 * notebook do escritório e escuro no celular. Por isso localStorage, e não o
 * documento do usuário — o que também faz o tema valer na tela de login.
 *
 * SEM PISCAR
 * O atributo `data-theme` é posto por um script no <head> do index.html, antes
 * do CSS pintar. Se dependesse do React, quem escolheu claro veria um clarão
 * escuro a cada abertura. Aquele script repete `resolverTema` de propósito —
 * mexeu aqui, mexe lá.
 */

export type PreferenciaDeTema = 'escuro' | 'claro' | 'sistema';
export type Tema = 'dark' | 'light';

export const CHAVE_TEMA = 'pf:tema';
export const PREFERENCIA_PADRAO: PreferenciaDeTema = 'escuro';

/** Cor da barra do navegador/sistema em cada tema — espelha `--ink`. */
export const COR_DA_BARRA: Record<Tema, string> = { dark: '#0C0F2E', light: '#F4F3FA' };

/** O que veio do localStorage é texto de fora: qualquer coisa estranha vira o padrão. */
export function normalizarPreferencia(cru: unknown): PreferenciaDeTema {
  return cru === 'escuro' || cru === 'claro' || cru === 'sistema' ? cru : PREFERENCIA_PADRAO;
}

export function resolverTema(preferencia: PreferenciaDeTema, sistemaClaro: boolean): Tema {
  if (preferencia === 'claro') return 'light';
  if (preferencia === 'escuro') return 'dark';
  return sistemaClaro ? 'light' : 'dark';
}

/**
 * Pra onde o botão de atalho leva: sempre o OPOSTO do que está na tela.
 *
 * Quem está em "igual ao sistema" e toca no botão quer ver a tela mudar agora —
 * então o atalho sai do automático e fixa o tema contrário ao atual.
 */
export function proximaPreferencia(temaAtual: Tema): PreferenciaDeTema {
  return temaAtual === 'dark' ? 'claro' : 'escuro';
}

// ---------------------------------------------------------------------------
// estado compartilhado: o botão do menu e o seletor do Perfil precisam enxergar
// a mesma coisa, e nenhum dos dois é pai do outro

const consultaClaro = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;

function lerPreferencia(): PreferenciaDeTema {
  try {
    return normalizarPreferencia(localStorage.getItem(CHAVE_TEMA));
  } catch {
    return PREFERENCIA_PADRAO; // localStorage bloqueado (aba anônima, política)
  }
}

interface Estado {
  preferencia: PreferenciaDeTema;
  tema: Tema;
}

let estado: Estado = { preferencia: PREFERENCIA_PADRAO, tema: 'dark' };
const ouvintes = new Set<() => void>();

function pintar(tema: Tema): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', tema);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_DA_BARRA[tema]);
}

function recalcular(): void {
  const preferencia = lerPreferencia();
  const tema = resolverTema(preferencia, consultaClaro()?.matches ?? false);
  if (preferencia === estado.preferencia && tema === estado.tema) return;
  estado = { preferencia, tema };
  pintar(tema);
  ouvintes.forEach((avisar) => avisar());
}

let ligado = false;
function ligar(): void {
  if (ligado || typeof window === 'undefined') return;
  ligado = true;
  recalcular();
  pintar(estado.tema);
  // o sistema trocou de tema (anoiteceu): só importa pra quem está no automático,
  // e `recalcular` já devolve o mesmo estado pros outros
  consultaClaro()?.addEventListener('change', recalcular);
  // a preferência mudou em outra aba do mesmo navegador
  window.addEventListener('storage', (e) => {
    if (e.key === CHAVE_TEMA) recalcular();
  });
}

export function definirPreferencia(preferencia: PreferenciaDeTema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, preferencia);
  } catch {
    /* sem localStorage a escolha vale só até recarregar — melhor que não valer */
    estado = { ...estado, preferencia };
  }
  const tema = resolverTema(preferencia, consultaClaro()?.matches ?? false);
  estado = { preferencia, tema };
  pintar(tema);
  ouvintes.forEach((avisar) => avisar());
}

function assinar(avisar: () => void): () => void {
  ligar();
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
}

/** Tema atual e preferência do usuário, vivos. */
export function useTema(): Estado & { definir: (p: PreferenciaDeTema) => void; alternar: () => void } {
  const atual = useSyncExternalStore(
    assinar,
    () => estado,
    () => estado,
  );
  return {
    ...atual,
    definir: definirPreferencia,
    alternar: () => definirPreferencia(proximaPreferencia(atual.tema)),
  };
}

// liga na carga do módulo: o primeiro render já sai com o tema certo
ligar();
