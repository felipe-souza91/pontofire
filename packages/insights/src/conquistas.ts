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
  /** ordem de exibição / dificuldade */
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

export const CONQUISTAS: Conquista[] = [
  {
    id: 'primeiro-passo',
    titulo: 'Primeiro passo',
    descricao: 'Registrou seu primeiro mês.',
    icone: '🌱',
    ordem: 10,
    atingida: (c) => c.snapshots.length >= 1,
  },
  {
    id: 'tres-meses',
    titulo: 'Pegando o ritmo',
    descricao: 'Três meses registrados.',
    icone: '📈',
    ordem: 20,
    atingida: (c) => c.snapshots.length >= 3,
  },
  {
    id: 'um-ano',
    titulo: 'Um ano de história',
    descricao: 'Doze meses registrados — dá pra ver tendência de verdade.',
    icone: '📅',
    ordem: 30,
    atingida: (c) => c.snapshots.length >= 12,
  },
  {
    id: 'streak-3',
    titulo: 'Três no azul',
    descricao: 'Três meses seguidos guardando dinheiro.',
    icone: '🔵',
    ordem: 40,
    atingida: (c) => streakAtual(c) >= 3,
  },
  {
    id: 'streak-6',
    titulo: 'Meio ano firme',
    descricao: 'Seis meses seguidos no azul.',
    icone: '💠',
    ordem: 50,
    atingida: (c) => streakAtual(c) >= 6,
  },
  {
    id: 'streak-12',
    titulo: 'Doze no azul',
    descricao: 'Um ano inteiro sem ficar no vermelho.',
    icone: '🏅',
    ordem: 60,
    atingida: (c) => streakAtual(c) >= 12,
  },
  {
    id: 'poupador-30',
    titulo: 'Poupa 30',
    descricao: 'Guardou 30% da renda em algum mês.',
    icone: '⚡',
    ordem: 70,
    atingida: (c) => melhorTaxa(c) >= 0.3,
  },
  {
    id: 'poupador-50',
    titulo: 'Poupa 50',
    descricao: 'Guardou metade da renda em algum mês.',
    icone: '🔥',
    ordem: 80,
    atingida: (c) => melhorTaxa(c) >= 0.5,
  },
  {
    id: 'progresso-10',
    titulo: '10% do caminho',
    descricao: 'Um décimo da meta conquistado.',
    icone: '🚩',
    ordem: 90,
    atingida: (c) => c.progresso >= 0.1,
  },
  {
    id: 'progresso-25',
    titulo: 'Um quarto',
    descricao: '25% do seu número FIRE.',
    icone: '⛺',
    ordem: 100,
    atingida: (c) => c.progresso >= 0.25,
  },
  {
    id: 'progresso-50',
    titulo: 'Metade do caminho',
    descricao: 'Metade da meta — daqui os juros pesam mais que o aporte.',
    icone: '⛰️',
    ordem: 110,
    atingida: (c) => c.progresso >= 0.5,
  },
  {
    id: 'progresso-75',
    titulo: 'Três quartos',
    descricao: '75% da meta.',
    icone: '🌄',
    ordem: 120,
    atingida: (c) => c.progresso >= 0.75,
  },
  {
    id: 'renda-passiva',
    titulo: 'Primeira renda passiva',
    descricao: 'Registrou dinheiro entrando sem você trabalhar por ele.',
    icone: '🌾',
    ordem: 130,
    atingida: (c) => c.coberturaPassiva > 0,
  },
  {
    id: 'cobertura-25',
    titulo: 'Um quarto da vida paga',
    descricao: 'Sua renda passiva cobre 25% do seu custo de vida.',
    icone: '🏠',
    ordem: 140,
    atingida: (c) => c.coberturaPassiva >= 0.25,
  },
  {
    id: 'cobertura-100',
    titulo: 'Vida paga',
    descricao: 'Sua renda passiva cobre 100% do seu custo. Trabalhar virou opcional.',
    icone: '👑',
    ordem: 150,
    atingida: (c) => c.coberturaPassiva >= 1,
  },
  {
    id: 'coast-fire',
    titulo: 'CoastFIRE',
    descricao: 'Pode parar de aportar hoje e ainda chega à meta só com juros.',
    icone: '⛵',
    ordem: 160,
    atingida: (c) => {
      if (c.idadeAlvo === undefined || c.idadeAtual === undefined) return false;
      if (c.idadeAlvo <= c.idadeAtual) return false;
      return jaEhCoastFire(c.patrimonioAtual, c.metaFire, c.iMensal, (c.idadeAlvo - c.idadeAtual) * 12);
    },
  },
  {
    id: 'ponto-fire',
    titulo: 'Ponto FIRE',
    descricao: 'Você chegou. O trabalho virou opcional.',
    icone: '🔥',
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
