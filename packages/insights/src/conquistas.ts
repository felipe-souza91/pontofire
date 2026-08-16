import { jaEhCoastFire } from '@pontofire/engine';
import type { ContextoInsights } from './tipos';

/**
 * Catálogo de conquistas (§ gamificação M8) — determinístico, derivado dos
 * mesmos dados dos insights. Sem "moeda" nem pontos: cada conquista marca um
 * fato real do progresso, não uma tarefa artificial.
 */
export interface Conquista {
  id: string;
  titulo: string;
  /** o que ela significa (mostrado sempre) */
  descricao: string;
  icone: string;
  /** nome do ícone (`Icone`), ou família paramétrica: `anel:3/3`, `arco:0.25`, `pilha:2` */
  ordem: number;
  atingida: (ctx: ContextoInsights) => boolean;
}

/**
 * Meses seguidos no azul, do mais recente pra trás.
 *
 * "No azul" é receita acima da despesa. Antes da Fase 2 isso era o mesmo que
 * `aportesMes > 0`, porque o aporte ERA a subtração — hoje ele é digitado, e um
 * mês em que a pessoa gastou mais do que ganhou mas ainda aportou contaria como
 * azul. Voltar à subtração preserva o sentido que o nome sempre teve.
 */
export function streakAtual(ctx: ContextoInsights): number {
  let n = 0;
  for (let i = ctx.snapshots.length - 1; i >= 0; i--) {
    const s = ctx.snapshots[i]!;
    if (s.receitaLiquida - s.gastoTotal > 0) n++;
    else break;
  }
  return n;
}

const melhorTaxa = (ctx: ContextoInsights): number =>
  ctx.snapshots.reduce((max, s) => Math.max(max, s.taxaPoupanca), 0);

/**
 * Patrimônio na régua que o marco usa: dinheiro de quando o usuário começou.
 *
 * Sem `patrimonioReal` (conta sem linha de partida) cai no nominal — que, pra
 * quem começou agora, é a mesma coisa. O erro só cresce com os anos, e é
 * exatamente aí que o deflator passa a existir.
 */
const patrimonioNaRegua = (ctx: ContextoInsights): number =>
  ctx.patrimonioReal ?? ctx.patrimonioAtual;

/**
 * Marcos de patrimônio, em dinheiro da partida.
 *
 * Por que não nominal: com 4,5% de inflação ao ano, R$ 1 milhão em 2045 exige
 * hoje R$ 415 mil. Comemorar o nominal seria premiar o usuário por ficar
 * parado — e este app é o que denuncia esse tipo de conta em todo lugar.
 *
 * Não é conquista solta: quem tem R$ 300 mil ficaria anos sem nada pra
 * comemorar entre "25% da meta" e o milhão.
 */
// declaração de função, não const: `marcosPatrimonio` chama isto na
// inicialização do módulo, antes de qualquer `const` abaixo existir
function brl(v: number): string {
  return v >= 1_000_000
    ? `R$ ${v / 1_000_000} milh${v === 1_000_000 ? 'ão' : 'ões'}`
    : `R$ ${v / 1_000} mil`;
}

const MARCOS_PATRIMONIO: { valor: number; titulo: string; icone: string }[] = [
  { valor: 100_000, titulo: 'Primeiros cem mil', icone: 'pilha:1' },
  { valor: 500_000, titulo: 'Meio milhão', icone: 'pilha:2' },
  { valor: 1_000_000, titulo: 'Primeiro milhão', icone: 'pilha:3' },
  { valor: 5_000_000, titulo: 'Cinco milhões', icone: 'pilha:4' },
];

const marcosPatrimonio: Conquista[] = MARCOS_PATRIMONIO.map((m, k) => ({
  id: `patrimonio-${m.valor}`,
  titulo: m.titulo,
  descricao: `${brl(m.valor)} investidos, medidos no dinheiro de quando você começou — inflação não conta como conquista.`,
  icone: m.icone,
  ordem: 200 + k * 10,
  atingida: (c) => patrimonioNaRegua(c) >= m.valor,
}));


export const CONQUISTAS: Conquista[] = [
  {
    id: 'primeiro-passo',
    titulo: 'Primeiro passo',
    descricao: 'Registrou seu primeiro mês.',
    icone: 'broto',
    ordem: 10,
    atingida: (c) => c.snapshots.length >= 1,
  },
  {
    id: 'tres-meses',
    titulo: 'Pegando o ritmo',
    descricao: 'Três meses registrados.',
    icone: 'grafico',
    ordem: 20,
    atingida: (c) => c.snapshots.length >= 3,
  },
  {
    id: 'um-ano',
    titulo: 'Um ano de história',
    descricao: 'Doze meses registrados — dá pra ver tendência de verdade.',
    icone: 'calendario',
    ordem: 30,
    atingida: (c) => c.snapshots.length >= 12,
  },
  {
    id: 'streak-3',
    titulo: 'Três no azul',
    descricao: 'Três meses seguidos guardando dinheiro.',
    icone: 'anel:3/3',
    ordem: 40,
    atingida: (c) => streakAtual(c) >= 3,
  },
  {
    id: 'streak-6',
    titulo: 'Meio ano firme',
    descricao: 'Seis meses seguidos no azul.',
    icone: 'anel:6/6',
    ordem: 50,
    atingida: (c) => streakAtual(c) >= 6,
  },
  {
    id: 'streak-12',
    titulo: 'Doze no azul',
    descricao: 'Um ano inteiro sem ficar no vermelho.',
    icone: 'anel:12/12',
    ordem: 60,
    atingida: (c) => streakAtual(c) >= 12,
  },
  {
    id: 'poupador-30',
    titulo: 'Poupa 30',
    descricao: 'Guardou 30% da renda em algum mês.',
    icone: 'raio',
    ordem: 70,
    atingida: (c) => melhorTaxa(c) >= 0.3,
  },
  {
    id: 'poupador-50',
    titulo: 'Poupa 50',
    descricao: 'Guardou metade da renda em algum mês.',
    icone: 'chama',
    ordem: 80,
    atingida: (c) => melhorTaxa(c) >= 0.5,
  },
  {
    id: 'progresso-10',
    titulo: '10% do caminho',
    descricao: 'Um décimo da meta conquistado.',
    icone: 'arco:0.10',
    ordem: 90,
    atingida: (c) => c.progresso >= 0.1,
  },
  {
    id: 'progresso-25',
    titulo: 'Um quarto',
    descricao: '25% do seu número FIRE.',
    icone: 'arco:0.25',
    ordem: 100,
    atingida: (c) => c.progresso >= 0.25,
  },
  {
    id: 'progresso-50',
    titulo: 'Metade do caminho',
    descricao: 'Metade da meta — daqui os juros pesam mais que o aporte.',
    icone: 'arco:0.50',
    ordem: 110,
    atingida: (c) => c.progresso >= 0.5,
  },
  {
    id: 'progresso-75',
    titulo: 'Três quartos',
    descricao: '75% da meta.',
    icone: 'arco:0.75',
    ordem: 120,
    atingida: (c) => c.progresso >= 0.75,
  },
  {
    id: 'renda-passiva',
    titulo: 'Primeira renda passiva',
    descricao: 'Registrou dinheiro entrando sem você trabalhar por ele.',
    icone: 'trigo',
    ordem: 130,
    atingida: (c) => c.coberturaPassiva > 0,
  },
  {
    id: 'cobertura-25',
    titulo: 'Um quarto da vida paga',
    descricao: 'Sua renda passiva cobre 25% do seu custo de vida.',
    icone: 'casa',
    ordem: 140,
    atingida: (c) => c.coberturaPassiva >= 0.25,
  },
  {
    id: 'cobertura-100',
    titulo: 'Vida paga',
    descricao: 'Sua renda passiva cobre 100% do seu custo. Trabalhar virou opcional.',
    icone: 'coroa',
    ordem: 150,
    atingida: (c) => c.coberturaPassiva >= 1,
  },
  {
    id: 'coast-fire',
    titulo: 'CoastFIRE',
    descricao: 'Pode parar de aportar hoje e ainda chega à meta só com juros.',
    icone: 'barco',
    ordem: 160,
    atingida: (c) => {
      if (c.idadeAlvo === undefined || c.idadeAtual === undefined) return false;
      if (c.idadeAlvo <= c.idadeAtual) return false;
      return jaEhCoastFire(c.patrimonioAtual, c.metaFire, c.iMensal, (c.idadeAlvo - c.idadeAtual) * 12);
    },
  },
  ...marcosPatrimonio,
  {
    id: 'ponto-fire',
    titulo: 'Ponto FIRE',
    descricao: 'Você chegou. O trabalho virou opcional.',
    icone: 'chama',
    ordem: 999,
    atingida: (c) => c.statusFire === 'atingido' || c.progresso >= 1,
  },
];

/** Ids das conquistas atingidas agora (uma regra quebrada não derruba o resto). */
export function conquistasAtingidas(ctx: ContextoInsights): string[] {
  const out: string[] = [];
  for (const c of CONQUISTAS) {
    try {
      if (c.atingida(ctx)) out.push(c.id);
    } catch {
      /* ignora conquista defeituosa */
    }
  }
  return out;
}
