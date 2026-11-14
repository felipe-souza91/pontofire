/** Rótulos de mês — um lugar só, pra "out/26" não ser escrito de quatro jeitos. */

const ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;
const NOMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const;

const partes = (competencia: string): { ano: string; indice: number } => {
  const [ano, mm] = competencia.split('-');
  return { ano: ano ?? '', indice: Math.min(11, Math.max(0, parseInt(mm ?? '1', 10) - 1)) };
};

/** `'2026-10'` → `'out/26'` — eixo, onde cada caractere custa. */
export function mesCurto(competencia: string): string {
  const { ano, indice } = partes(competencia);
  return `${ABREV[indice]}/${ano.slice(2)}`;
}

/** `'2026-10'` → `'out/2026'` — tooltip e tabela, onde o ano inteiro evita dúvida. */
export function mesMedio(competencia: string): string {
  const { ano, indice } = partes(competencia);
  return `${ABREV[indice]}/${ano}`;
}

/** `'2026-10'` → `'outubro'`. */
export function nomeDoMes(competencia: string): string {
  return NOMES[partes(competencia).indice]!;
}

export function competenciaDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** `'2026-11-12'` → `'12/nov'`. */
export function diaCurto(iso: string): string {
  const [, mm, dd] = iso.split('-');
  return `${Number(dd)}/${ABREV[Math.min(11, Math.max(0, parseInt(mm ?? '1', 10) - 1))]}`;
}

/** Ano decimal → competência: `2051.25` → `'2051-04'`. */
export function competenciaDoAnoDecimal(v: number): string {
  const total = Math.round(v * 12);
  const ano = Math.floor(total / 12);
  return `${ano}-${String((total % 12) + 1).padStart(2, '0')}`;
}
