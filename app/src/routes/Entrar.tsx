import { useState, type FormEvent } from 'react';
import { Flame } from '../theme/Flame';
import { useAuth } from '../auth/useAuth';
import { mensagemErroAuth } from '../auth/AuthProvider';

type Modo = 'entrar' | 'criar';

export function Entrar() {
  const { entrarComGoogle, entrarComEmail, criarComEmail } = useAuth();
  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function comProvedor(fn: () => Promise<void>) {
    setErro(null);
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      setErro(mensagemErroAuth(e));
    } finally {
      setOcupado(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void comProvedor(() =>
      modo === 'entrar' ? entrarComEmail(email, senha) : criarComEmail(email, senha),
    );
  }

  return (
    <main className="pf-container" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <Flame size={56} flicker />
          <h1 style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>Ponto FIRE</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            {modo === 'entrar' ? 'Entre para ver sua data.' : 'Crie sua conta e descubra sua data.'}
          </p>
        </div>

        <div className="pf-card">
          <button
            type="button"
            className="pf-btn pf-btn-ghost"
            disabled={ocupado}
            onClick={() => void comProvedor(entrarComGoogle)}
          >
            Continuar com Google
          </button>

          <div className="pf-divider">ou</div>

          <form onSubmit={onSubmit}>
            <label className="pf-field">
              <span className="pf-label">E-mail</span>
              <input
                className="pf-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="pf-field">
              <span className="pf-label">Senha</span>
              <input
                className="pf-input"
                type="password"
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </label>

            {erro && <p className="pf-error">{erro}</p>}

            <button type="submit" className="pf-btn pf-btn-primary" disabled={ocupado}>
              {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className="pf-btn-link"
              onClick={() => {
                setErro(null);
                setModo(modo === 'entrar' ? 'criar' : 'entrar');
              }}
            >
              {modo === 'entrar' ? 'Não tem conta? Criar agora' : 'Já tenho conta — entrar'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
