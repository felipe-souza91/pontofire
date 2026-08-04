import type { Insight, Parte, TomInsight } from '@pontofire/insights';

const ESTILO: Record<TomInsight, { borda: string; fundo: string; destaque: string }> = {
  celebracao: {
    borda: 'rgba(63,214,155,.32)',
    fundo: 'linear-gradient(120deg, rgba(63,214,155,.10), rgba(63,214,155,.02))',
    destaque: 'var(--mint)',
  },
  atencao: {
    borda: 'rgba(255,158,107,.32)',
    fundo: 'linear-gradient(120deg, rgba(255,122,69,.10), rgba(255,122,69,.02))',
    destaque: 'var(--ember-2)',
  },
  fato: {
    borda: 'var(--line)',
    fundo: 'var(--ink-2)',
    destaque: 'var(--ember-2)',
  },
  humano: {
    borda: 'rgba(255,122,69,.28)',
    fundo: 'linear-gradient(120deg, rgba(255,122,69,.12), rgba(255,122,69,.02))',
    destaque: 'var(--ember-2)',
  },
};

export function CardsInsights({ insights }: { insights: Insight[] }) {
  if (!insights.length) return null;
  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      {insights.map((i) => (
        <CardInsight key={i.id} insight={i} />
      ))}
    </div>
  );
}

function CardInsight({ insight }: { insight: Insight }) {
  const s = ESTILO[insight.tom];
  return (
    <div
      style={{
        background: s.fundo,
        border: `1px solid ${s.borda}`,
        borderRadius: 18,
        padding: 'var(--space-6)',
      }}
    >
      <p style={{ margin: 0, lineHeight: 1.55 }}>
        {insight.partes.map((p, idx) => (
          <Trecho key={idx} parte={p} cor={s.destaque} />
        ))}
      </p>
    </div>
  );
}

function Trecho({ parte, cor }: { parte: Parte; cor: string }) {
  if (typeof parte === 'string') return <>{parte}</>;
  return <span style={{ color: cor, fontWeight: 500 }}>{parte.hl}</span>;
}
