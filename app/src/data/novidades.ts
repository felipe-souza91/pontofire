/**
 * O que mudou desde a última vez que você entrou.
 *
 * POR QUE ISTO EXISTE
 * Não é vitrine de release. É que várias mudanças recentes alteram NÚMEROS QUE
 * O USUÁRIO JÁ VIU — a meta passou a derivar do custo, a data passou a responder
 * aos meses lançados. Quem entra sem aviso conclui que o app quebrou; foi
 * exatamente esse o feedback que gerou metade desta lista.
 *
 * REGRA DE CONTEÚDO (§6, honestidade > hype)
 * Correção entra na lista com o mesmo destaque que novidade. Um changelog que
 * só se gaba treina o usuário a não ler. E quando o app errou um número, dizer
 * isso é o que sustenta a confiança nos outros.
 *
 * O que NÃO entra: refatoração, teste, nada que o usuário não veja nem sinta.
 */

export type TipoNovidade = 'novo' | 'correcao' | 'mudanca';

export interface ItemNovidade {
  tipo: TipoNovidade;
  texto: string;
}

export interface Novidade {
  /** YYYY-MM-DD — ordenável como string, que é o que a comparação usa */
  versao: string;
  titulo: string;
  itens: ItemNovidade[];
}

/** Mais recente primeiro. */
export const NOVIDADES: Novidade[] = [
  {
    versao: '2026-08-16',
    titulo: 'Sua data agora responde ao que você vive',
    itens: [
      {
        tipo: 'mudanca',
        texto:
          'A data do seu ponto FIRE deixou de sair só do que você digitou no onboarding. Custo de vida e aporte passam a vir da MEDIANA dos seus últimos 6 meses lançados — a partir do 3º mês. Até lá o app usa o que você declarou e avisa na tela.',
      },
      {
        tipo: 'correcao',
        texto:
          'Sua meta estava congelada: mudar o custo de vida no perfil não a recalculava. Isso fazia a data MELHORAR quando o gasto piorava. Agora ela acompanha o custo — e se você tinha uma meta própria, ela entrou travada, do jeito que estava.',
      },
      {
        tipo: 'novo',
        texto:
          'Depois de lançar o mês, o app mostra o que aquilo fez com a sua data e por quê — quanto o gasto empurrou, quanto o rendimento puxou. Mais o acumulado desde que você começou.',
      },
      {
        tipo: 'novo',
        texto:
          'O aporte virou um campo. Antes ele era deduzido de "receita − despesa", o que em mês de PPR ou 13º registrava aporte que não aconteceu — e fazia o rendimento aparecer negativo em mês bom.',
      },
      {
        tipo: 'novo',
        texto:
          'No lançamento você pode escrever o que houve de diferente no mês ("carro quebrou", "entrou PPR") e marcar o mês como atípico — meses atípicos ficam fora da sua média.',
      },
      {
        tipo: 'novo',
        texto:
          'Duas taxas em vez de uma: quanto você não consumiu, e quanto de fato virou patrimônio. A diferença entre elas é o dinheiro que sobrou e nunca chegou na carteira.',
      },
      {
        tipo: 'novo',
        texto:
          'Gráfico da sua data ao longo do tempo, marcos de patrimônio (100 mil a 5 milhões, medidos em dinheiro de quando você começou) e um campo de reserva de emergência no perfil.',
      },
      {
        tipo: 'novo',
        texto:
          'Nova calculadora: quando parar de amortizar o financiamento e passar a aportar. A resposta surpreende — e considera o IR, que quase nenhuma calculadora desconta.',
      },
      {
        tipo: 'correcao',
        texto:
          'Campos de dinheiro agora funcionam como no seu banco: digite corrido e os centavos se acertam sozinhos. Não precisa mais achar a vírgula.',
      },
      {
        tipo: 'correcao',
        texto:
          'Trocar a categoria de um lançamento não exige mais apagar o texto antes — a lista abre inteira, com a atual marcada.',
      },
      {
        tipo: 'correcao',
        texto:
          'No importador, transferências suas entre contas suas agora se encontram: o PIX que saiu de um banco e entrou no outro fecha em zero em vez de virar receita do nada.',
      },
      {
        tipo: 'mudanca',
        texto:
          'Os emoji viraram ícones desenhados, e as listas do app saem em ordem alfabética.',
      },
    ],
  },
];

/** A versão que quem está em dia já viu. */
export const VERSAO_ATUAL = NOVIDADES[0]?.versao ?? '';

/**
 * O que este usuário ainda não viu.
 *
 * `undefined` = conta anterior ao changelog: ela recebe tudo, porque é
 * justamente quem viu os números velhos e precisa saber o que mudou. Conta
 * nova nasce em dia (o onboarding grava a versão atual) e não recebe nada —
 * não faz sentido anunciar mudança de algo que a pessoa nunca viu.
 */
export function novidadesDesde(visto: string | undefined): Novidade[] {
  if (visto === undefined) return NOVIDADES;
  return NOVIDADES.filter((n) => n.versao > visto);
}
