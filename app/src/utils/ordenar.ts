/**
 * Ordenação alfabética das listas de sugestão.
 *
 * `localeCompare('pt-BR')` e não `sort()` puro: comparação por code point joga
 * tudo que tem acento pro fim do alfabeto — "Saúde" cairia depois de "Viagem",
 * e "Ações" depois de "Vestuário". Numa lista que existe pra ser varrida com o
 * olho, isso é o mesmo que não estar ordenada.
 *
 * `numeric: true` faz "13º / férias" ficar antes de "2ª via" em vez de depois,
 * comparando o número como número.
 */
const COLLATOR = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export const compararPtBr = (a: string, b: string): number => COLLATOR.compare(a, b);

/**
 * Ordena em ordem alfabética, com `aoFim` fixado no rodapé da lista.
 *
 * O segundo argumento serve pras opções que não são escolha do dia a dia
 * (rótulos de movimentação entre contas): elas continuam disponíveis, mas não
 * disputam a atenção de quem está categorizando um gasto de verdade.
 */
export function ordenar(itens: readonly string[], aoFim: readonly string[] = []): string[] {
  const fim = new Set(aoFim);
  return [...itens.filter((i) => !fim.has(i)).sort(compararPtBr), ...aoFim];
}
