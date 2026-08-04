import { useNavigate } from 'react-router-dom';
import { CONQUISTAS, conquistasAtingidas, streakAtual } from '@pontofire/insights';
import { useAuth } from '../auth/useAuth';
import { usePainel } from '../hooks/usePainel';
import { useConquistas } from '../hooks/useConquistas';
import { CardConvites } from '../components/CardConvites';
import { Flame } from '../theme/Flame';

export function Conquistas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ctx, carregando } = usePainel(user?.uid ?? null);
  const atingidas = ctx ? conquistasAtingidas(ctx) : [];
  const { salvas } = useConquistas(user?.uid ?? null, atingidas);

  if (carregando || !ctx) {
    return (
      <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <Flame size={56} className="flame-loading" title="Carregando" />
      </main>
    );
  }

  const desbloqueadas = new Set([...atingidas, ...salvas]);
  const ordenadas = [...CONQUISTAS].sort((a, b) => a.ordem - b.ordem);
  const streak = streakAtual(ctx);

  return (
    <main className="pf-container" style={{ maxWidth: '40rem', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="pf-btn-link" onClick={() => navigate('/')} style={{ padding: 0 }}>← Voltar</button>
        <strong className="pf-logo" style={{ flex: 1, textAlign: 'center' }}>Conquistas</strong>
        <span style={{ width: '3rem' }} />
      </header>

      {/* resumo */}
      <div className="pf-hero-card" style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
        <div>
          <div className="pf-eyebrow">Desbloqueadas</div>
          <div className="mono" style={{ fontWeight: 700, fontSize: '1.6rem', marginTop: 6, color: 'var(--mint)' }}>
            {desbloqueadas.size}<span style={{ color: 'var(--muted)', fontSize: '1rem' }}>/{CONQUISTAS.length}</span>
          </div>
        </div>
        <div>
          <div className="pf-eyebrow">Streak no azul</div>
          <div className="mono" style={{ fontWeight: 700, fontSize: '1.6rem', marginTop: 6, color: streak > 0 ? 'var(--ember-2)' : 'var(--muted)' }}>
            {streak} {streak === 1 ? 'mês' : 'meses'}
          </div>
        </div>
      </div>

      {/* convites (viral) */}
      {user && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <CardConvites uid={user.uid} />
        </div>
      )}

      {/* lista */}
      <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
        {ordenadas.map((c) => {
          const ok = desbloqueadas.has(c.id);
          return (
            <div
              key={c.id}
              className="pf-stat"
              style={{
                display: 'flex',
                gap: 'var(--space-4)',
                alignItems: 'center',
                padding: 'var(--space-4) var(--space-6)',
                borderColor: ok ? 'rgba(63,214,155,.3)' : 'var(--line)',
                opacity: ok ? 1 : 0.55,
              }}
            >
              <span style={{ fontSize: '1.6rem', filter: ok ? 'none' : 'grayscale(1)' }} aria-hidden>
                {c.icone}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: ok ? 'var(--paper)' : 'var(--muted)' }}>{c.titulo}</div>
                <div className="pf-hint" style={{ margin: 0 }}>{c.descricao}</div>
              </div>
              {ok && <span className="mono" style={{ color: 'var(--mint)', fontSize: '0.75rem' }}>✓</span>}
            </div>
          );
        })}
      </div>

      <p className="pf-hint" style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
        Conquistas marcam fatos reais do seu progresso — nada de pontos artificiais.
      </p>
    </main>
  );
}
