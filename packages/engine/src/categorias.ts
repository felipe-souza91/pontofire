/**
 * Vocabulário de categorias que o motor precisa conhecer.
 *
 * POR QUE ISSO MORA NO ENGINE
 * Quase toda categoria é livre — o usuário digita o que quiser e o app não tem
 * opinião. Estas duas são a exceção: elas descrevem dinheiro que apenas TROCOU
 * DE BOLSO. Não é consumo, não é receita, não é aporte novo. Como o motor
 * raciocina em cima de "quanto você gasta", ele precisa saber quais rótulos
 * significam "isso aqui não é gasto de verdade" — e importer, insights e app
 * precisam concordar na grafia exata, senão o filtro passa batido.
 */

/** Dinheiro indo de uma conta sua pra outra conta sua. */
export const CATEGORIA_TRANSFERENCIA = 'Transferência entre contas';

/**
 * Pagamento da fatura do cartão.
 *
 * Separado de transferência de propósito: a fatura tem contrapartida do outro
 * lado (as compras, que entram pelo arquivo da fatura), então contar o
 * pagamento como despesa é contar o mês em dobro.
 */
export const CATEGORIA_FATURA = 'Fatura de cartão';

/**
 * Categorias que existem para ROTULAR, não para somar.
 *
 * Se um lançamento assim acabar salvo — o usuário pode incluir de propósito,
 * pra ter o registro —, ele continua aparecendo no extrato do mês, mas fica de
 * fora de qualquer análise que responda "onde meu dinheiro está indo". Dizer
 * "transferência entre contas foi 40% do seu gasto; se virasse aporte sua data
 * andaria 8 meses" seria conselho sem sentido: o dinheiro já é dele.
 */
export const CATEGORIAS_NEUTRAS: readonly string[] = [CATEGORIA_TRANSFERENCIA, CATEGORIA_FATURA];

const achatar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const NEUTRAS_ACHATADAS = new Set(CATEGORIAS_NEUTRAS.map(achatar));

/**
 * A categoria é só um rótulo de movimentação, sem valor de análise?
 *
 * Compara sem acento e sem caixa porque o rótulo pode ter sido digitado à mão
 * ("transferencia entre contas") em vez de escolhido na lista.
 */
export function ehCategoriaNeutra(categoria: string): boolean {
  return NEUTRAS_ACHATADAS.has(achatar(categoria));
}
