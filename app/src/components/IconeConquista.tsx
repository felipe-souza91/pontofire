import { Anel, Arco, Icone, Pilha, type NomeIcone } from '../theme/Icone';

/**
 * Traduz o `icone` da conquista num desenho.
 *
 * O catálogo vive em `@pontofire/insights`, que é TypeScript puro e não pode
 * importar React. Então ele guarda um NOME e a tradução mora aqui. Além do
 * nome simples, três formatos paramétricos dão conta das famílias:
 *
 *   anel:3/3    sequência de meses no azul
 *   arco:0.25   fração da meta conquistada
 *   pilha:2     degrau do patrimônio
 */
export function IconeConquista({ nome, size = 22 }: { nome: string; size?: number }) {
  const [tipo, arg] = nome.split(':');

  if (tipo === 'anel' && arg) {
    const [cheios, total] = arg.split('/').map(Number);
    return <Anel cheios={cheios ?? 0} total={total ?? 1} size={size} />;
  }
  if (tipo === 'arco' && arg) return <Arco fracao={Number(arg)} size={size} />;
  if (tipo === 'pilha' && arg) return <Pilha camadas={Number(arg)} size={size} />;

  return <Icone nome={nome as NomeIcone} size={size} />;
}
