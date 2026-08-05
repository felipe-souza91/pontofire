/**
 * Card da semana (§7) — um único card que muda toda segunda-feira.
 *
 * Três famílias que se alternam:
 *  - `retrato`: o número do usuário ao lado de um dado público do Brasil;
 *  - `dica`: uma tática concreta, sempre com o número dele dentro;
 *  - `humano`: o "por quê" que ele mesmo escreveu — nunca frase de para-choque.
 *
 * A escolha é DETERMINÍSTICA (semana + semente do uid): o card é o mesmo o
 * dia inteiro, o mesmo em qualquer aparelho, e muda sozinho na virada da
 * semana. Sem estado no Firestore, sem sorteio a cada render.
 *
 * §14: informa o trade-off, nunca moraliza. O retrato do país é escala e
 * contexto — não é placar contra quem ganha menos.
 */

import { BRASIL } from './brasil';
import { hl, type ContextoInsights, type Formatadores, type Parte } from './tipos';

export type CategoriaSemana = 'retrato' | 'dica' | 'humano';

export interface CardSemana {
  /** estável — serve pra dedupe no push semanal quando houver Blaze */
  id: string;
  categoria: CategoriaSemana;
  /** título curto do card */
  rotulo: string;
  partes: Parte[];
  /** citação da estatística, quando o card usa uma */
  fonte?: string;
  link?: string;
}

type ItemSemana = (ctx: ContextoInsights, fmt: Formatadores) => CardSemana | null;

// ---------------------------------------------------------------------------
// helpers

const anualDeMensal = (i: number) => Math.pow(1 + i, 12) - 1;

/** "3" salários mínimos, arredondado pra baixo (não inflar a comparação). */
const emMinimos = (v: number) => Math.floor(v / BRASIL.salarioMinimo.valor);

// ---------------------------------------------------------------------------
// retrato do Brasil

const RETRATO: ItemSemana[] = [
  (ctx, fmt) =>
    ctx.aporteMensal <= 0
      ? null
      : {
          id: 'sem-endividamento',
          categoria: 'retrato',
          rotulo: 'Você e o país',
          partes: [
            'Cerca de ',
            hl('77% das famílias brasileiras'),
            ' têm alguma dívida — nelas, boa parte da renda vira juro antes de virar patrimônio. Seus ',
            hl(fmt.moeda(ctx.aporteMensal)),
            ' por mês andam no sentido oposto: o juro trabalha do seu lado.',
          ],
          fonte: BRASIL.familiasEndividadas.fonte,
          link: BRASIL.familiasEndividadas.link,
        },

  (ctx, fmt) =>
    ctx.iMensal <= 0
      ? null
      : {
          id: 'sem-poupanca',
          categoria: 'retrato',
          rotulo: 'Você e o país',
          partes: [
            'Só ',
            hl('cerca de 1 em cada 3 adultos'),
            ' no Brasil investe, e a poupança segue como o produto mais comum: perto de ',
            hl('1,5% ao ano'),
            ' acima da inflação. Sua projeção trabalha com ',
            hl(`${fmt.pct(anualDeMensal(ctx.iMensal))} reais ao ano`),
            ' — é essa diferença que encurta a sua data.',
          ],
          fonte: BRASIL.adultosQueInvestem.fonte,
          link: BRASIL.adultosQueInvestem.link,
        },

  (ctx, fmt) => {
    const n = emMinimos(ctx.custoVidaMensal);
    if (n < 1) return null;
    return {
      id: 'sem-minimos',
      categoria: 'retrato',
      rotulo: 'Você e o país',
      partes: [
        'Quando a meta fechar, seu patrimônio sustenta ',
        hl(fmt.moeda(ctx.custoVidaMensal)),
        ' por mês sem você trabalhar por isso — o equivalente a ',
        hl(`${n} ${n === 1 ? 'salário mínimo' : 'salários mínimos'}`),
        ' de 2026, todo mês, vindos do próprio dinheiro.',
      ],
      fonte: BRASIL.salarioMinimo.fonte,
      link: BRASIL.salarioMinimo.link,
    };
  },

  (ctx, fmt) => ({
    id: 'sem-inss-minimo',
    categoria: 'retrato',
    rotulo: 'Você e o país',
    partes: [
      'Cerca de ',
      hl('2 em cada 3 aposentadorias'),
      ' pagas pelo INSS ficam em até um salário mínimo. E, quando a pessoa morre, o benefício acaba. O seu plano mira ',
      hl(fmt.moeda(ctx.custoVidaMensal)),
      ' por mês vindos de um patrimônio que continua existindo.',
    ],
    fonte: BRASIL.aposentadoriasAteUmMinimo.fonte,
    link: BRASIL.aposentadoriasAteUmMinimo.link,
  }),

  (ctx) => {
    if (ctx.statusFire !== 'ok' || ctx.mesesAteFire === null || ctx.idadeAtual === undefined) return null;
    const idadeLib = Math.round(ctx.idadeAtual + ctx.mesesAteFire / 12);
    if (idadeLib >= 65) return null;
    return {
      id: 'sem-expectativa',
      categoria: 'retrato',
      rotulo: 'Você e o país',
      partes: [
        'A expectativa de vida no Brasil é de ',
        hl('76,4 anos'),
        '. Quem depende só do INSS costuma parar por volta dos 65 — sobram uns 11 anos. Você chega aos ',
        hl(`${idadeLib}`),
        ', o que são ',
        hl(`${65 - idadeLib} anos a mais`),
        ' de tempo seu.',
      ],
      fonte: BRASIL.expectativaVida.fonte,
      link: BRASIL.expectativaVida.link,
    };
  },

  (ctx, fmt) =>
    ctx.custoVidaMensal <= 0
      ? null
      : {
          id: 'sem-reserva',
          categoria: 'retrato',
          rotulo: 'Você e o país',
          partes: [
            'Cerca de ',
            hl('6 em cada 10 brasileiros'),
            ' não têm reserva pra três meses parados. No seu padrão de vida, três meses são ',
            hl(fmt.moeda(ctx.custoVidaMensal * 3)),
            '.',
          ],
          fonte: BRASIL.semReserva.fonte,
          link: BRASIL.semReserva.link,
        },

  (ctx, fmt) =>
    ctx.aporteMensal <= 0
      ? null
      : {
          id: 'sem-renda-media',
          categoria: 'retrato',
          rotulo: 'Você e o país',
          partes: [
            'O rendimento médio do trabalhador brasileiro gira em torno de ',
            hl('R$ 3.300'),
            ' por mês. Seu aporte de ',
            hl(fmt.moeda(ctx.aporteMensal)),
            ' equivale a ',
            hl(fmt.pct(ctx.aporteMensal / BRASIL.rendimentoMedio.valor)),
            ' disso — é a fatia que você está trocando por tempo.',
          ],
          fonte: BRASIL.rendimentoMedio.fonte,
          link: BRASIL.rendimentoMedio.link,
        },
];

// ---------------------------------------------------------------------------
// dicas — sempre com o número do usuário dentro

const DICAS: ItemSemana[] = [
  (ctx, fmt) =>
    ctx.metaFire <= 0
      ? null
      : {
          id: 'sem-taxa-adm',
          categoria: 'dica',
          rotulo: 'Dica da semana',
          partes: [
            'Uma taxa de administração de ',
            hl('1% ao ano'),
            ' parece detalhe. Em 20 anos ela come perto de ',
            hl('18% do patrimônio final'),
            ' — no tamanho da sua meta, algo como ',
            hl(fmt.moeda(ctx.metaFire * 0.18)),
            '. Vale conferir quanto seus fundos cobram.',
          ],
        },

  () => ({
    id: 'sem-come-cotas',
    categoria: 'dica',
    rotulo: 'Dica da semana',
    partes: [
      'Fundos abertos de renda fixa sofrem ',
      hl('come-cotas'),
      ' em maio e novembro: o IR é antecipado e o que sai já não rende mais. Tesouro Direto, ETFs e ações não têm — o imposto só aparece no resgate ou na venda.',
    ],
  }),

  () => ({
    id: 'sem-ir-regressivo',
    categoria: 'dica',
    rotulo: 'Dica da semana',
    partes: [
      'Na renda fixa o IR é regressivo: ',
      hl('22,5% até 180 dias'),
      ' e ',
      hl('15% depois de 2 anos'),
      '. Resgatar antes da hora custa 7,5 pontos do seu lucro — o prazo faz parte do rendimento.',
    ],
  }),

  (ctx, fmt) =>
    ctx.aporteMensal <= 0
      ? null
      : {
          id: 'sem-pague-se-primeiro',
          categoria: 'dica',
          rotulo: 'Dica da semana',
          partes: [
            'Aportar "o que sobrar no fim do mês" quase nunca dá certo, porque raramente sobra. Agende ',
            hl(fmt.moeda(ctx.aporteMensal)),
            ' pro dia seguinte ao salário e deixe o resto do mês cuidar de si.',
          ],
        },

  (ctx, fmt) =>
    ctx.custoVidaMensal <= 0
      ? null
      : {
          id: 'sem-reserva-antes',
          categoria: 'dica',
          rotulo: 'Dica da semana',
          partes: [
            'Reserva de emergência não é investimento, é seguro. ',
            hl(fmt.moeda(ctx.custoVidaMensal * 6)),
            ' em liquidez diária é o que impede você de vender a carteira justamente no pior mês dela.',
          ],
        },

  (ctx, fmt) => {
    if (ctx.statusFire !== 'ok' || ctx.mesesAteFire === null || ctx.iMensal <= 0) return null;
    const futuro = 1000 * Math.pow(1 + ctx.iMensal, ctx.mesesAteFire);
    return {
      id: 'sem-custo-oportunidade',
      categoria: 'dica',
      rotulo: 'Dica da semana',
      partes: [
        'R$ 1.000 gastos hoje seriam ',
        hl(fmt.moeda(futuro)),
        ' na sua data de liberdade. Não é pra você deixar de gastar — é pra decidir sabendo o preço.',
      ],
    };
  },

  () => ({
    id: 'sem-juros-reais',
    categoria: 'dica',
    rotulo: 'Dica da semana',
    partes: [
      'Aqui tudo é ',
      hl('juro real'),
      ': já descontado da inflação. Por isso um Tesouro IPCA+ 6% entra como 6%, e não como os ~11% que aparecem na corretora. É o que faz sua data ser em poder de compra de hoje.',
    ],
  }),

  () => ({
    id: 'sem-marcacao',
    categoria: 'dica',
    rotulo: 'Dica da semana',
    partes: [
      'Ao lançar o mês, informe o patrimônio ',
      hl('pelo valor de mercado'),
      ', não pelo que você aportou. O rendimento o Ponto FIRE calcula sozinho: saldo de hoje − saldo anterior − aportes do mês.',
    ],
  }),
];

// ---------------------------------------------------------------------------
// humano — a palavra dele, não frase pronta

function humanos(ctx: ContextoInsights): ItemSemana[] {
  const itens: ItemSemana[] = [];

  (ctx.porQues ?? [])
    .filter((p) => p && p.trim().length > 0)
    .forEach((p, idx) => {
      itens.push(() => ({
        id: `sem-porque-${idx}`,
        categoria: 'humano',
        rotulo: 'Seu porquê',
        partes: ['Você escreveu aqui: “', hl(p.trim()), '”. A data lá em cima é só a forma numérica disso.'],
      }));
    });

  if (ctx.nomeSonho) {
    itens.push((c, fmt) => ({
      id: 'sem-sonho',
      categoria: 'humano',
      rotulo: 'Seu porquê',
      partes: [
        'O “',
        hl(c.nomeSonho!),
        '” não é figura de linguagem: são ',
        hl(fmt.moeda(c.metaFire)),
        c.mesesAteFire !== null && c.statusFire === 'ok'
          ? `, e faltam ${fmt.duracao(c.mesesAteFire)}.`
          : '.',
      ],
    }));
  }

  if (ctx.snapshots.length >= 3) {
    itens.push((c) => ({
      id: 'sem-constancia',
      categoria: 'humano',
      rotulo: 'Sua constância',
      partes: [
        'Você já registrou ',
        hl(`${c.snapshots.length} meses`),
        '. A curva de evolução aqui do painel não é projeção nem promessa — é a sua letra.',
      ],
    }));
  }

  if (ctx.progresso > 0 && ctx.progresso < 0.35) {
    itens.push((c, fmt) => ({
      id: 'sem-comeco-lento',
      categoria: 'humano',
      rotulo: 'Onde você está',
      partes: [
        'Você tem ',
        hl(fmt.pct(c.progresso)),
        ' do caminho. O primeiro terço é o mais lento mesmo: nessa fase quase tudo vem do seu aporte. Depois os juros começam a aportar junto.',
      ],
    }));
  }

  if (!itens.length) {
    itens.push(() => ({
      id: 'sem-sem-porque',
      categoria: 'humano',
      rotulo: 'Falta uma coisa',
      partes: [
        'Número segura pouca gente por muito tempo. Escreva no seu perfil ',
        hl('por que'),
        ' você quer essa data — ele volta pra cá nas semanas em que a conta não anda.',
      ],
    }));
  }

  return itens;
}

// ---------------------------------------------------------------------------
// seleção determinística

/** Semanas inteiras desde 05/01/1970 (uma segunda-feira). Vira na segunda. */
export function semanaDoCalendario(d: Date = new Date()): number {
  const meiaNoiteLocal = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((meiaNoiteLocal - Date.UTC(1970, 0, 5)) / 604_800_000);
}

/** FNV-1a — só precisa espalhar usuários, não precisa ser cripto. */
function semente(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0);
}

const ORDEM: readonly CategoriaSemana[] = ['retrato', 'dica', 'humano'];

function aplicaveis(itens: ItemSemana[], ctx: ContextoInsights, fmt: Formatadores): CardSemana[] {
  const out: CardSemana[] = [];
  for (const item of itens) {
    try {
      const c = item(ctx, fmt);
      if (c) out.push(c);
    } catch {
      // um item defeituoso não pode derrubar o card
    }
  }
  return out;
}

export interface OpcoesSemana {
  /** normalmente o uid — dois usuários na mesma semana veem cards diferentes */
  semente?: string;
  /** força uma semana específica (testes) */
  semana?: number;
  /** categorias a pular (ex.: já tem card parecido na tela) */
  excluir?: readonly CategoriaSemana[];
}

/**
 * Devolve o card da semana. Alterna a categoria semana a semana e avança
 * dentro dela a cada rodada, então o mesmo texto só volta depois de percorrer
 * todo o catálogo daquela família. Se a categoria da vez não tem nada
 * aplicável, cai na próxima — o espaço nunca fica vazio.
 */
export function cardDaSemana(
  ctx: ContextoInsights,
  fmt: Formatadores,
  opts: OpcoesSemana = {},
): CardSemana | null {
  const semana = opts.semana ?? semanaDoCalendario();
  const n = semana + (opts.semente ? semente(opts.semente) : 0);
  const pular = new Set(opts.excluir ?? []);

  const catalogo: Record<CategoriaSemana, ItemSemana[]> = {
    retrato: RETRATO,
    dica: DICAS,
    humano: humanos(ctx),
  };

  for (let salto = 0; salto < ORDEM.length; salto++) {
    const cat = ORDEM[Math.abs(n + salto) % ORDEM.length]!;
    if (pular.has(cat)) continue;
    const disponiveis = aplicaveis(catalogo[cat], ctx, fmt);
    if (!disponiveis.length) continue;
    const rodada = Math.floor(Math.abs(n + salto) / ORDEM.length);
    return disponiveis[rodada % disponiveis.length]!;
  }
  return null;
}

/** Texto puro do card (push semanal, e-mail, testes). */
export function textoDoCardSemana(c: CardSemana): string {
  return c.partes.map((p) => (typeof p === 'string' ? p : p.hl)).join('');
}
