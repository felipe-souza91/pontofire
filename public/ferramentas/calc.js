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

export function compararParcelado(precoAVista, parcela, n, rendimentoMensal, opcoes = {}) {
  const cb = Math.max(0, opcoes.cashback || 0);
  const aVistaNoCartao = !!opcoes.aVistaNoCartao;
  const totalParcelado = parcela * n;
  const i = rendimentoMensal;
  const fator = Math.abs(i) < 1e-12 ? n : (1 - Math.pow(1 + i, -n)) / i;
  const valorPresente = parcela * (1 - cb) * fator;
  const cashbackParcelado = totalParcelado * cb;
  const cashbackAVista = aVistaNoCartao ? precoAVista * cb : 0;
  const custoAVista = precoAVista - cashbackAVista;
  return {
    totalParcelado,
    acrescimo: totalParcelado - precoAVista,
    taxaEmbutida: taxaEmbutida(precoAVista, parcela, n),
    valorPresente,
    melhor: valorPresente < custoAVista ? 'parcelar' : 'avista',
    diferenca: Math.abs(custoAVista - valorPresente),
    cashbackParcelado,
    cashbackAVista,
    custoAVista,
    cashbackNeutro: cb > 0 && aVistaNoCartao,
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

export function compararCompra(e) {
  const cb = Math.max(0, e.cashback || 0);
  const i = e.rendimentoMensal;
  const atraso = e.mesesAteFatura === undefined ? 1 : e.mesesAteFatura;
  const precoCartao = e.precoCartao > 0 ? e.precoCartao : e.precoAVista;
  const maxN = Math.max(1, Math.floor(e.maxParcelas || 1));
  const desconta = (v, m) => (Math.abs(i) < 1e-12 ? v : v / Math.pow(1 + i, m));

  const opcoes = [{
    id: 'pix', rotulo: 'PIX / dinheiro à vista', parcelas: 0,
    valorParcela: e.precoAVista, totalPago: e.precoAVista,
    cashbackRecebido: 0, custoHoje: e.precoAVista, diferencaVsMelhor: 0,
  }];
  for (let k = 1; k <= maxN; k++) {
    const parcela = precoCartao / k;
    const liquida = parcela * (1 - cb);
    let custoHoje = 0;
    for (let j = 1; j <= k; j++) custoHoje += desconta(liquida, atraso + j - 1);
    opcoes.push({
      id: 'cartao-' + k,
      rotulo: k === 1 ? 'Cartão à vista (1×)' : 'Cartão em ' + k + '×',
      parcelas: k, valorParcela: parcela, totalPago: precoCartao,
      cashbackRecebido: precoCartao * cb, custoHoje, diferencaVsMelhor: 0,
    });
  }
  opcoes.sort((a, b) => a.custoHoje - b.custoHoje);
  const melhor = opcoes[0], pior = opcoes[opcoes.length - 1];
  opcoes.forEach(o => { o.diferencaVsMelhor = o.custoHoje - melhor.custoHoje; });
  return {
    opcoes, melhor, pior,
    economiaMaxima: pior.custoHoje - melhor.custoHoje,
    taxaEmbutida: precoCartao > e.precoAVista ? taxaEmbutida(e.precoAVista, precoCartao / maxN, maxN) : null,
  };
}
