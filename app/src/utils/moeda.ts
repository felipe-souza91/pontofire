/**
 * Máscara de moeda no estilo odômetro (o mesmo do Nubank, PicPay, Itaú).
 *
 * O usuário digita corrido e os dígitos entram pela DIREITA:
 *
 *     1 → 0,01     12 → 0,12     125 → 1,25     1250 → 12,50
 *
 * POR QUE TROCAR
 * O campo antigo exigia digitar a vírgula pra ter centavos, o que no teclado do
 * celular é um desvio — e deixava a entrada ambígua: "8000" era oito mil ou
 * oitenta reais, dependendo de o usuário conhecer a convenção. Aqui existe uma
 * regra só, sempre a mesma, e é a que a mão brasileira já treinou no banco.
 *
 * A lógica mora fora do componente porque é ela que precisa de teste: o
 * componente só desenha.
 */

/** Teto de segurança: 15 dígitos ≈ R$ 9,9 trilhões, longe do limite do double. */
const MAX_DIGITOS = 15;

/**
 * Só os dígitos importam — pontuação, letras e sinais são ruído aqui.
 *
 * Os zeros à esquerda caem na normalização, e não é cosmético: no celular o
 * `keydown` não traz a tecla, então apagar passa pelo texto do campo. Sem isso,
 * "0,01" com backspace virava "0,0" → dígitos "00" → de volta pra "0,00", e o
 * campo ficava preso nesse vaivém sem nunca esvaziar.
 */
export const soDigitos = (texto: string): string =>
  texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITOS);

/**
 * Dígitos acumulados → valor em reais.
 * Os dois últimos são sempre os centavos; string vazia é zero.
 */
export function digitosParaValor(digitos: string): number {
  const d = soDigitos(digitos);
  if (!d) return 0;
  return Number(d) / 100;
}

/**
 * Valor em reais → dígitos acumulados. É o caminho de volta, usado quando o
 * valor chega de fora (prefill de um mês já lançado, edição de lançamento).
 *
 * `Math.round` e não `toFixed` direto no float: 0.1 + 0.2 e amigos chegam aqui
 * como 8000.499999999999 e truncar comeria um centavo.
 */
export function valorParaDigitos(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) return '';
  return String(Math.round(valor * 100));
}

/**
 * Dígitos → o que aparece na tela, SEMPRE com 2 casas.
 *
 * O campo antigo mostrava "8.000" pra valor inteiro e "8.000,50" pra quebrado —
 * duas formatações no mesmo campo. Aqui a casa dos centavos nunca some, que é o
 * que faz o odômetro ser legível enquanto se digita.
 */
export function formatarDigitos(digitos: string): string {
  const d = soDigitos(digitos);
  if (!d) return '';
  const centavos = d.slice(-2).padStart(2, '0');
  const reais = d.slice(0, -2).replace(/^0+/, '') || '0';
  return `${Number(reais).toLocaleString('pt-BR')},${centavos}`;
}

/**
 * Aplica uma tecla aos dígitos acumulados.
 *
 * Existe pra que Backspace apague UM DÍGITO, não o caractere que estiver sob o
 * cursor: com máscara, apagar o "," ou um ponto de milhar não teria sentido
 * nenhum pro usuário.
 */
export function aplicarTecla(digitos: string, tecla: string): string {
  if (tecla === 'Backspace') return digitos.slice(0, -1);
  if (/^\d$/.test(tecla)) return soDigitos(digitos + tecla);
  return digitos;
}
