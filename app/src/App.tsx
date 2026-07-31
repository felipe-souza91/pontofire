import { Route, Routes } from 'react-router-dom';
import { Home } from './routes/Home';

// Shell de rotas do MVP. As telas (§4) entram nos próximos milestones:
// /onboarding (M2), / (dashboard, M3), /lancar (M4), /metas (M8), /projecao (fase 2).
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
