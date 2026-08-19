/**
 * Máscara de data digitada — DD/MM/AAAA e MM/AAAA.
 *
 * POR QUE NÃO O SELETOR NATIVO
 * O calendário do navegador é bom pra data que você ESCOLHE (perto de hoje) e
 * péssimo pra data que você SABE. Pra chegar em 1991 numa data de nascimento é
 * preciso rolar o ano de doze em doze meses, ou caçar um dropdown escondido no
 * cabeçalho — quando a pessoa sabe a resposta de cor e digitaria em 3 segundos.
 *
 * Ninguém folheia um calendário pra achar o próprio aniversário.
 *
 * Nos campos de data RECENTE (o mês do lançamento, a data de uma transação
 * importada) o nativo continua: ali a pessoa escolhe, não lembra.
 */

/** Quantos dígitos cada bloco tem, na ordem em que são digitados. */
export const BLOCOS_DATA = [2, 2, 4] as const; // DD MM AAAA
export const BLOCOS_MES = [2, 4] as const; // MM AAAA

export const soDigitos = (texto: string, max: number): string =>
  texto.replace(/\D/g, '').slice(0, max);

/**
 * Insere as barras entre os blocos.
 *
 * A barra só aparece quando há dígito DEPOIS dela. Se ela ficasse grudada no
 * fim ("15/"), o Backspace apagaria a barra, a formatação a devolveria, e o
 * campo travaria em dois dígitos pra sempre — o mesmo laço que o campo de
 * dinheiro teve com o zero à esquerda.
 */
export function formatarBlocos(digitos: string, blocos: readonly number[]): string {
  const partes: string[] = [];
  let i = 0;
  for (const tamanho of blocos) {
    if (i >= digitos.length) break;
    partes.push(digitos.slice(i, i + tamanho));
    i += tamanho;
  }
  return partes.join('/');
}

/** Backspace anda um dígito; qualquer outra tecla numérica acrescenta um. */
export function aplicarTecla(digitos: string, tecla: string, max: number): string {
  if (tecla === 'Backspace') return digitos.slice(0, -1);
  if (/^\d$/.test(tecla)) return (digitos + tecla).slice(0, max);
  return digitos;
}

/** Existe mesmo no calendário? Pega 31/02 e 30/02 de ano bissexto. */
function dataReal(ano: number, mes: number, dia: number): boolean {
  const d = new Date(ano, mes - 1, dia);
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
}

const hojeISO = () => new Date().toISOString().slice(0, 10);

/**
 * `'15081991'` → `'1991-08-15'`. Devolve `''` enquanto não for uma data
 * completa, real e dentro da faixa — vazio é o jeito de dizer "ainda não tem
 * resposta", e é o que impede meia data de ser gravada.
 */
export function digitosParaISO(
  digitos: string,
  { minimo = '1900-01-01', maximo = hojeISO() }: { minimo?: string; maximo?: string } = {},
): string {
  if (digitos.length !== 8) return '';
  const dia = Number(digitos.slice(0, 2));
  const mes = Number(digitos.slice(2, 4));
  const ano = Number(digitos.slice(4, 8));
  if (!dataReal(ano, mes, dia)) return '';
  const iso = `${digitos.slice(4, 8)}-${digitos.slice(2, 4)}-${digitos.slice(0, 2)}`;
  return iso >= minimo && iso <= maximo ? iso : '';
}

export function isoParaDigitos(iso: string | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  return iso.slice(8, 10) + iso.slice(5, 7) + iso.slice(0, 4);
}

/** `'081991'` → `'1991-08'` (mês de referência, sem dia). */
export function digitosParaMesISO(
  digitos: string,
  { minimo = '1900-01', maximo = hojeISO().slice(0, 7) }: { minimo?: string; maximo?: string } = {},
): string {
  if (digitos.length !== 6) return '';
  const mes = Number(digitos.slice(0, 2));
  if (mes < 1 || mes > 12) return '';
  const iso = `${digitos.slice(2, 6)}-${digitos.slice(0, 2)}`;
  return iso >= minimo && iso <= maximo ? iso : '';
}

export function mesISOParaDigitos(iso: string | undefined): string {
  if (!iso || !/^\d{4}-\d{2}$/.test(iso)) return '';
  return iso.slice(5, 7) + iso.slice(0, 4);
}
