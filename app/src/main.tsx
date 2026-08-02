import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './theme/tokens.css';
import './theme/ui.css';
import { AuthProvider } from './auth/AuthProvider';
import { App } from './App';

// PWA: quando um deploy novo assume (novo service worker), recarrega uma vez
// para o usuário nunca ficar preso numa versão antiga em cache. Não recarrega
// na primeira instalação (quando ainda não havia controlador).
if ('serviceWorker' in navigator) {
  const tinhaControle = !!navigator.serviceWorker.controller;
  let recarregando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinhaControle || recarregando) return;
    recarregando = true;
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* base /app/ casa com o Vite base e os rewrites do Hosting */}
    <BrowserRouter basename="/app">
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
