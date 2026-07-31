import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './theme/tokens.css';
import './theme/ui.css';
import { AuthProvider } from './auth/AuthProvider';
import { App } from './App';

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
