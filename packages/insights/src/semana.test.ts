import { describe, it, expect } from 'vitest';
import { realMensalDeAnual } from '@pontofire/engine';
import { cardDaSemana, semanaDoCalendario, textoDoCardSemana } from './semana';
import type { ContextoInsights, Formatadores, SnapshotInsight } from './tipos';

const fmt: Formatadores = {
  moeda: (v) => `R$ ${Math.round(v)}`,
  duracao: (m) => `${Math.round(m)} meses`,
  pct: (v) => `${Math.round(v * 100)}%`,
};

function snap(mes: string): SnapshotInsight {
  return {
    mes,
    patrimonioTotal: 300_000,
    receitaLiquida: 10_000,
    gastoTotal: 8_000,
    aportesMes: 2_000,
    rendimentosMes: 0,
    taxaPoupanca: 0.2,
  };
}

function ctxBase(over: Partial<ContextoInsights> = {}): ContextoInsights {
  return {
    apelido: 'Felipe',
    nomeSonho: 'Ponto Fire',
    porQues: ['tempo com os meus', 'parar de vender minha semana'],
    custoVidaMensal: 8_000,
    metaFire: 2_400_000,
    aporteMensal: 2_000,
    iMensal: realMensalDeAnual(0.05),
    patrimonioAtual: 300_000,
    progresso: 300_000 / 2_400_000,
    coberturaPassiva: 0,
    mesesAteFire: 200,
    statusFire: 'ok',
    idadeAtual: 34,
    idadeAlvo: 55,
    snapshots: [snap('2026-06'), snap('2026-07'), snap('2026-08')],
    ...over,
  };
}

describe('semanaDoCalendario', () => {
  it('conta semanas inteiras e vira na segunda-feira', () => {
    // 05/01/1970 é a origem (segunda). 05/01/2026 também é segunda.
    const seg = semanaDoCalendario(new Date(2026, 0, 5));
    expect(semanaDoCalendario(new Date(2026, 0, 8))).toBe(seg); // quinta, mesma semana
    expect(semanaDoCalendario(new Date(2026, 0, 11))).toBe(seg); // domingo, mesma semana
    expect(semanaDoCalendario(new Date(2026, 0, 12))).toBe(seg + 1); // segunda seguinte
  });
});

describe('cardDaSemana', () => {
  it('é estável dentro da semana e muda na virada', () => {
    const ctx = ctxBase();
    const a = cardDaSemana(ctx, fmt, { semente: 'uid-1', semana: 100 });
    const b = cardDaSemana(ctx, fmt, { semente: 'uid-1', semana: 100 });
    const c = cardDaSemana(ctx, fmt, { semente: 'uid-1', semana: 101 });
    expect(a).toEqual(b);
    expect(a!.id).not.toBe(c!.id);
  });

  it('alterna a categoria a cada semana', () => {
    const ctx = ctxBase();
    const cats = [0, 1, 2].map((k) => cardDaSemana(ctx, fmt, { semente: 'uid-1', semana: 100 + k })!.categoria);
    expect(new Set(cats).size).toBe(3);
  });

  it('só repete um texto depois de percorrer o catálogo da família', () => {
    const ctx = ctxBase();
    // 3 semanas = 1 rodada de cada categoria; 8 rodadas cobrem a maior família
    const ids = Array.from(
      { length: 24 },
      (_, k) => cardDaSemana(ctx, fmt, { semente: 'uid-1', semana: 500 + k })!.id,
    );
    const dicas = ids.filter((id) => id.startsWith('sem-')).slice(0, 8);
    expect(new Set(dicas).size).toBe(dicas.length);
  });

  it('usuários diferentes veem cards diferentes na mesma semana', () => {
    const ctx = ctxBase();
    const vistos = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((s) => cardDaSemana(ctx, fmt, { semente: s, semana: 100 })!.id),
    );
    expect(vistos.size).toBeGreaterThan(1);
  });

  it('nunca devolve vazio, mesmo no perfil mais cru possível', () => {
    const cru = ctxBase({
      apelido: undefined,
      nomeSonho: undefined,
      porQues: [],
      aporteMensal: 0,
      custoVidaMensal: 0,
      metaFire: 0,
      progresso: 0,
      iMensal: 0,
      mesesAteFire: null,
      statusFire: 'inalcancavel',
      idadeAtual: undefined,
      snapshots: [],
    });
    for (let s = 0; s < 12; s++) {
      const card = cardDaSemana(cru, fmt, { semente: 'uid-1', semana: s });
      expect(card, `semana ${s}`).not.toBeNull();
      expect(textoDoCardSemana(card!).length).toBeGreaterThan(20);
    }
  });

  it('devolve o porquê que o próprio usuário escreveu', () => {
    const ctx = ctxBase();
    const textos = Array.from({ length: 30 }, (_, k) =>
      textoDoCardSemana(cardDaSemana(ctx, fmt, { semente: 'uid-1', semana: k })!),
    );
    expect(textos.some((t) => t.includes('tempo com os meus'))).toBe(true);
  });

  it('respeita categorias excluídas', () => {
    const ctx = ctxBase();
    for (let s = 0; s < 12; s++) {
      const card = cardDaSemana(ctx, fmt, { semente: 'uid-1', semana: s, excluir: ['humano'] });
      expect(card!.categoria).not.toBe('humano');
    }
  });

  it('não promete anos a mais quando a liberdade já é depois dos 65', () => {
    const tarde = ctxBase({ idadeAtual: 60, mesesAteFire: 12 * 10 });
    const ids = Array.from(
      { length: 30 },
      (_, k) => cardDaSemana(tarde, fmt, { semente: 'uid-1', semana: k })!.id,
    );
    expect(ids).not.toContain('sem-expectativa');
  });

  it('todo card com estatística cita a fonte', () => {
    const ctx = ctxBase();
    for (let s = 0; s < 30; s++) {
      const card = cardDaSemana(ctx, fmt, { semente: 'uid-1', semana: s })!;
      if (card.categoria === 'retrato') {
        expect(card.fonte, card.id).toBeTruthy();
        expect(card.link, card.id).toMatch(/^https:\/\//);
      }
    }
  });
});
