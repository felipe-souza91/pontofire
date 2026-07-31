import { Flame } from '../theme/Flame';

// Placeholder da fundação (M0): prova tokens do tema, chama e roteamento.
// Substituído pelo onboarding/dashboard reais nos próximos milestones.
export function Home() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-8)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '32rem' }}>
        <Flame size={72} flicker />
        <h1 style={{ marginTop: 'var(--space-6)', fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
          Ponto FIRE
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.125rem' }}>
          Descubra a <span style={{ color: 'var(--mint)' }}>data exata</span> da sua independência
          financeira.
        </p>
        <p className="mono" style={{ color: 'var(--muted)', marginTop: 'var(--space-8)', fontSize: '0.8rem' }}>
          fundação · m0
        </p>
      </div>
    </main>
  );
}
