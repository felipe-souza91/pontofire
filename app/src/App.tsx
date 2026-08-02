import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { useUserDoc } from './hooks/useUserDoc';
import { Entrar } from './routes/Entrar';
import { Onboarding } from './routes/Onboarding';
import { Dashboard } from './routes/Dashboard';
import { Flame } from './theme/Flame';

/** Tela de carregamento — chama "queimando". */
function Splash() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <Flame size={72} className="flame-loading" title="Carregando" />
    </main>
  );
}

export function App() {
  const { user, carregando } = useAuth();

  if (carregando) return <Splash />;

  if (!user) {
    return (
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    );
  }

  return <RotasLogado uid={user.uid} />;
}

function RotasLogado({ uid }: { uid: string }) {
  const { doc, carregando, erro } = useUserDoc(uid);
  const { sair } = useAuth();

  if (carregando) return <Splash />;

  // não trava mais no loading: se a leitura falhou, mostra o motivo e uma saída
  if (erro) {
    return (
      <main className="pf-container" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <div className="pf-card" style={{ textAlign: 'center' }}>
          <Flame size={40} />
          <h2 style={{ marginTop: 'var(--space-4)' }}>Não consegui carregar seus dados</h2>
          <p style={{ color: 'var(--muted)' }}>
            A leitura do seu perfil foi bloqueada. Isso costuma ser App Check ou regras do Firestore.
          </p>
          <p className="mono pf-error">({erro})</p>
          <button className="pf-btn pf-btn-ghost" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <button className="pf-btn-link" onClick={() => void sair()}>
              Sair
            </button>
          </div>
        </div>
      </main>
    );
  }

  const precisaOnboarding = !doc?.onboardingCompleto;

  return (
    <Routes>
      <Route path="/entrar" element={<Navigate to="/" replace />} />
      <Route
        path="/onboarding"
        element={precisaOnboarding ? <Onboarding /> : <Navigate to="/" replace />}
      />
      <Route
        path="/"
        element={precisaOnboarding ? <Navigate to="/onboarding" replace /> : <Dashboard />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
