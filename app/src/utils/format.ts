const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  // mostra centavos só quando existem (R$ 47,90 / R$ 300.000)
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const brlCent = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dataLonga = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

const dataCurta = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });

export const formatBRL = (v: number, comCentavos = false): string =>
  (comCentavos ? brlCent : brl).format(v);

/** Moeda compacta no estilo da landing: "R$ 2,4 mi", "R$ 300 mil", "R$ 850". */
export function formatBRLcompact(v: number): string {
  const abs = Math.abs(v);
  const sinal = v < 0 ? '-' : '';
  const br = (n: number, casas: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
  if (abs >= 1_000_000) return `${sinal}R$ ${br(abs / 1_000_000, 1)} mi`;
  if (abs >= 1_000) return `${sinal}R$ ${br(abs / 1_000, abs < 10_000 ? 1 : 0)} mil`;
  return `${sinal}R$ ${br(abs, 0)}`;
}

export const formatPct = (v: number, casas = 1): string =>
  `${(v * 100).toFixed(casas).replace('.', ',')}%`;

/** "julho de 2041" — usado na contagem regressiva do FIRE. */
export const formatMesAno = (d: Date): string => dataLonga.format(d);

export const formatData = (d: Date): string => dataCurta.format(d);

/** "15 anos e 4 meses" a partir de um total de meses. */
export function formatDuracao(meses: number): string {
  const anos = Math.floor(meses / 12);
  const m = Math.round(meses - anos * 12);
  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (m > 0) partes.push(`${m} ${m === 1 ? 'mês' : 'meses'}`);
  if (partes.length === 0) return 'agora';
  return partes.join(' e ');
}
