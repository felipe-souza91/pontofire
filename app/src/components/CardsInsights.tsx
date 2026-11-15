import type { Insight, Parte, TomInsight } from '@pontofire/insights';

const ESTILO: Record<TomInsight, { borda: string; fundo: string; destaque: string }> = {
  celebracao: {
    borda: 'color-mix(in srgb, var(--mint) 32%, transparent)',
    fundo: 'linear-gradient(120deg, color-mix(in srgb, var(--mint) 10%, transparent), color-mix(in srgb, var(--mint) 2%, transparent))',
    destaque: 'var(--mint)',
  },
  atencao: {
    borda: 'color-mix(in srgb, var(--ember-2) 32%, transparent)',
    fundo: 'linear-gradient(120deg, color-mix(in srgb, var(--ember) 10%, transparent), color-mix(in srgb, var(--ember) 2%, transparent))',
    destaque: 'var(--ember-2)',
  },
  fato: {
    borda: 'var(--line)',
    fundo: 'var(--ink-2)',
    destaque: 'var(--ember-2)',
  },
  humano: {
    borda: 'color-mix(in srgb, var(--ember) 28%, transparent)',
    fundo: 'linear-gradient(120deg, color-mix(in srgb, var(--ember) 12%, transparent), color-mix(in srgb, var(--ember) 2%, transparent))',
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
