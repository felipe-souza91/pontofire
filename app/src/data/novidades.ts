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
  /**
   * Uma frase antes da lista, dizendo o que esta versão faz com o que o usuário
   * já conhece. Por versão, e não fixa no modal: "isto muda números que você já
   * viu" era verdade na primeira e seria alarme falso na segunda.
   */
  intro?: string;
  itens: ItemNovidade[];
}

/** Mais recente primeiro. */
export const NOVIDADES: Novidade[] = [
  {
    versao: '2026-11-15',
    titulo: 'Agora tem tema claro',
    intro: 'Nada muda sozinho: o app continua escuro até você escolher outra coisa.',
    itens: [
      {
        tipo: 'novo',
        texto:
          'Tema claro, escuro ou igual ao do seu aparelho. O botão de sol/lua no topo troca na hora; a escolha completa fica em Perfil → Aparência. Vale por aparelho — dá pra ter claro no computador e escuro no celular.',
      },
      {
        tipo: 'correcao',
        texto:
          'Os itens desta lista de novidades estavam sem espaçamento interno, com o texto colado na borda.',
      },
    ],
  },
  {
    versao: '2026-11-14',
    titulo: 'Seu patrimônio agora tem com o que se comparar',
    intro:
      'Nada aqui muda a sua data nem a sua meta. São jeitos novos de olhar pros números que você já lança.',
    itens: [
      {
        tipo: 'novo',
        texto:
          'O gráfico de evolução ganhou duas réguas: o que os MESMOS aportes, nos mesmos meses, teriam rendido no CDI — e o que valeriam só corrigidos pela inflação. Embaixo, o número que todo extrato mostra: quanto por cento do CDI a sua carteira rendeu.',
      },
      {
        tipo: 'novo',
        texto:
          'Os gráficos respondem ao toque. Passe o dedo (ou o mouse) e cada mês mostra o valor exato, quanto rendeu e quanto você aportou. "Ver em tabela" abre os mesmos números em linhas.',
      },
      {
        tipo: 'novo',
        texto:
          'O Início ganhou um bloco "Hoje", que muda todo dia útil: quantos dias faltam, quanto seu patrimônio estaria valendo se rendeu o CDI desde o último lançamento, e quantos dias de cada mês ele já paga sozinho. A estimativa é régua, não extrato — o número de verdade aparece quando você lança.',
      },
      {
        tipo: 'novo',
        texto:
          'Ao lançar o mês, o app mostra quanto a carteira rendeu de fato ao lado do CDI do mesmo período.',
      },
      {
        tipo: 'novo',
        texto:
          'A projeção até a meta agora tem uma segunda linha — só o que você vai aportar, sem render nada. O vão entre as duas é o juro composto.',
      },
      {
        tipo: 'mudanca',
        texto:
          'No celular, as telas mais usadas ficam numa barra fixa no rodapé, ao alcance do polegar. O menu do topo continua lá pro resto.',
      },
      {
        tipo: 'correcao',
        texto:
          'Os valores do eixo dos gráficos ficavam em cima da própria curva, e em números quebrados ("R$ 668 mil"). Agora têm coluna própria e caem em valores redondos.',
      },
      {
        tipo: 'correcao',
        texto:
          'No celular, "R$ 8,1 mil/mês" não cabia no cartão e era cortado na borda.',
      },
    ],
  },
  {
    versao: '2026-08-16',
    titulo: 'Sua data agora responde ao que você vive',
    intro:
      'Parte disto muda números que você já viu — não é o app quebrando, é ele passando a usar o que você lança. Vale meio minuto de leitura.',
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
