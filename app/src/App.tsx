import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { useUserDoc } from './hooks/useUserDoc';
import { Entrar } from './routes/Entrar';
import { Onboarding } from './routes/Onboarding';
import { Dashboard } from './routes/Dashboard';
import { Flame } from './theme/Flame';

function Splash() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <Flame size={56} flicker />
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
  const { doc, carregando } = useUserDoc(uid);

  if (carregando) return <Splash />;

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
