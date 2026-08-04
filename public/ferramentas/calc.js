/**
 * Fórmulas das calculadoras públicas.
 *
 * ESPELHO de packages/engine/src/calculadoras.ts (que tem os testes).
 * Se mudar a matemática lá, mude aqui — e vice-versa.
 */

export function calcularJuros({ inicial, aporteMensal: A, taxaMensal: i, meses: n }) {
  const montante =
    Math.abs(i) < 1e-9
      ? inicial + A * n
      : inicial * Math.pow(1 + i, n) + A * ((Math.pow(1 + i, n) - 1) / i);
  const totalInvestido = inicial + A * n;
  const montanteSimples = totalInvestido + inicial * i * n + A * i * ((n * (n - 1)) / 2);
  return {
    montante,
    totalInvestido,
    totalJuros: montante - totalInvestido,
    montanteSimples,
    diferenca: montante - montanteSimples,
  };
}

export const anualParaMensal = (a) => Math.pow(1 + a, 1 / 12) - 1;

export function compararCombustivel(precoAlcool, precoGasolina, kmA, kmG) {
  const temConsumo = kmA > 0 && kmG > 0;
  const limite = temConsumo ? kmA / kmG : 0.7;
  const razao = precoGasolina > 0 ? precoAlcool / precoGasolina : Infinity;
  const custoAlcool = temConsumo ? precoAlcool / kmA : precoAlcool / (0.7 * 10);
  const custoGasolina = temConsumo ? precoGasolina / kmG : precoGasolina / 10;
  const diff = custoGasolina - custoAlcool;
  const vencedor = Math.abs(diff) < 1e-6 ? 'empate' : diff > 0 ? 'alcool' : 'gasolina';
  const maior = Math.max(custoAlcool, custoGasolina);
  return { razao, limite, vencedor, economiaPct: maior > 0 ? Math.abs(diff) / maior : 0 };
}

export function taxaEmbutida(precoAVista, parcela, n) {
  if (precoAVista <= 0 || parcela <= 0 || n <= 0) return null;
  if (parcela * n <= precoAVista + 1e-9) return null;
  const vp = (i) => (Math.abs(i) < 1e-12 ? parcela * n : parcela * ((1 - Math.pow(1 + i, -n)) / i));
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (vp(mid) > precoAVista) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function compararParcelado(precoAVista, parcela, n, rendimentoMensal) {
  const totalParcelado = parcela * n;
  const i = rendimentoMensal;
  const valorPresente =
    Math.abs(i) < 1e-12 ? totalParcelado : parcela * ((1 - Math.pow(1 + i, -n)) / i);
  return {
    totalParcelado,
    acrescimo: totalParcelado - precoAVista,
    taxaEmbutida: taxaEmbutida(precoAVista, parcela, n),
    valorPresente,
    melhor: valorPresente < precoAVista ? 'parcelar' : 'avista',
    diferenca: Math.abs(precoAVista - valorPresente),
  };
}

// ---- utilidades de UI ----
export const brl = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
export const pct = (v, casas = 2) => `${(v * 100).toFixed(casas).replace('.', ',')}%`;
export const num = (el) => {
  const t = (el.value || '').replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : 0;
};
