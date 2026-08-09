import { useState, type FormEvent } from 'react';
import { Flame } from '../theme/Flame';
import { useAuth } from '../auth/useAuth';
import { mensagemErroAuth } from '../auth/AuthProvider';

type Modo = 'entrar' | 'criar' | 'recuperar';

const SUBTITULO: Record<Modo, string> = {
  entrar: 'Entre para ver sua data.',
  criar: 'Crie sua conta e descubra sua data.',
  recuperar: 'Enviamos um link para você criar uma nova senha.',
};

export function Entrar() {
  const { entrarComGoogle, entrarComEmail, criarComEmail, recuperarSenha } = useAuth();
  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function trocarModo(novo: Modo) {
    setErro(null);
    setAviso(null);
    setSenha('');
    setConfirmar('');
    setModo(novo);
  }

  async function comProvedor(fn: () => Promise<void>) {
    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      console.error('[auth]', e);
      setErro(mensagemErroAuth(e));
    } finally {
      setOcupado(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (modo === 'recuperar') {
      void comProvedor(async () => {
        await recuperarSenha(email);
        setAviso('Se existe uma conta com esse e-mail, o link de recuperação foi enviado.');
      });
      return;
    }

    if (modo === 'criar') {
      if (senha.length < 6) {
        setErro('A senha precisa de pelo menos 6 caracteres.');
        return;
      }
      if (senha !== confirmar) {
        setErro('As senhas não conferem.');
        return;
      }
    }

    void comProvedor(() =>
      modo === 'entrar' ? entrarComEmail(email, senha) : criarComEmail(email, senha),
    );
  }

  const tituloBotao =
    modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Enviar link';

  return (
    <main className="pf-container" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <Flame size={88} flicker />
          <h1 style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)' }}>Ponto FIRE</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>{SUBTITULO[modo]}</p>
        </div>

        <div className="pf-card">
          {modo !== 'recuperar' && (
            <>
              <button
                type="button"
                className="pf-btn pf-btn-ghost"
                disabled={ocupado}
                onClick={() => void comProvedor(entrarComGoogle)}
              >
                Continuar com Google
              </button>
              <div className="pf-divider">ou</div>
            </>
          )}

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

            {modo !== 'recuperar' && (
              <SenhaInput
                rotulo="Senha"
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                value={senha}
                onChange={setSenha}
              />
            )}

            {modo === 'criar' && (
              <SenhaInput
                rotulo="Repita a senha"
                autoComplete="new-password"
                value={confirmar}
                onChange={setConfirmar}
              />
            )}

            {erro && <p className="pf-error">{erro}</p>}
            {aviso && (
              <p style={{ color: 'var(--mint)', fontSize: '0.9rem', marginTop: 'var(--space-2)' }}>{aviso}</p>
            )}

            <button type="submit" className="pf-btn pf-btn-primary" disabled={ocupado}>
              {ocupado ? '…' : tituloBotao}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-4)', display: 'grid', gap: 'var(--space-1)' }}>
            {modo === 'entrar' && (
              <>
                <button type="button" className="pf-btn-link" onClick={() => trocarModo('recuperar')}>
                  Esqueci minha senha
                </button>
                <button type="button" className="pf-btn-link" onClick={() => trocarModo('criar')}>
                  Não tem conta? Criar agora
                </button>
              </>
            )}
            {modo === 'criar' && (
              <button type="button" className="pf-btn-link" onClick={() => trocarModo('entrar')}>
                Já tenho conta — entrar
              </button>
            )}
            {modo === 'recuperar' && (
              <button type="button" className="pf-btn-link" onClick={() => trocarModo('entrar')}>
                Voltar para entrar
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------

function SenhaInput({
  rotulo,
  value,
  onChange,
  autoComplete,
}: {
  rotulo: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [ver, setVer] = useState(false);
  return (
    <label className="pf-field">
      <span className="pf-label">{rotulo}</span>
      <div style={{ position: 'relative' }}>
        <input
          className="pf-input"
          style={{ paddingRight: '3rem' }}
          type={ver ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}
          style={{
            position: 'absolute',
            right: '0.6rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            display: 'grid',
            placeItems: 'center',
            padding: '0.3rem',
          }}
        >
          {ver ? <OlhoFechado /> : <Olho />}
        </button>
      </div>
    </label>
  );
}

function Olho() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function OlhoFechado() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07A3 3 0 1 1 9.9 9.9" />
      <path d="M6.61 6.61A18.5 18.5 0 0 0 1 12s4 8 11 8a9.12 9.12 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
