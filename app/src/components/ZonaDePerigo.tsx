import { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  PrecisaReautenticar,
  baixarJson,
  excluirConta,
  exportarDados,
  reautenticar,
  resetarDados,
} from '../data/lgpd';

type Acao = null | 'reset' | 'excluir';

/**
 * Direitos do titular (LGPD): exportar, resetar e excluir.
 * Tudo com confirmação explícita — nada aqui pode acontecer por engano.
 */
export function ZonaDePerigo({ user }: { user: User }) {
  const [acao, setAcao] = useState<Acao>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState('');
  const [senha, setSenha] = useState('');
  const [precisaSenha, setPrecisaSenha] = useState(false);

  const usaGoogle = user.providerData.some((p) => p.providerId === 'google.com');

  function fechar() {
    setAcao(null);
    setConfirmacao('');
    setSenha('');
    setPrecisaSenha(false);
    setErro(null);
  }

  async function exportar() {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      const dados = await exportarDados(user);
      baixarJson(dados, `pontofire-meus-dados-${new Date().toISOString().slice(0, 10)}.json`);
      setAviso('Download iniciado — seus dados estão no arquivo JSON.');
    } catch {
      setErro('Não consegui exportar agora. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  async function confirmarReset() {
    setOcupado(true);
    setErro(null);
    try {
      await resetarDados(user.uid);
      window.location.href = '/app/';
    } catch {
      setErro('Não consegui apagar tudo. Tente de novo.');
      setOcupado(false);
    }
  }

  async function confirmarExclusao() {
    setOcupado(true);
    setErro(null);
    try {
      if (precisaSenha || (usaGoogle && precisaSenha)) {
        await reautenticar(user, senha);
      }
      await excluirConta(user);
      window.location.href = '/app/';
    } catch (e) {
      if (e instanceof PrecisaReautenticar) {
        setPrecisaSenha(true);
        setErro(
          usaGoogle
            ? 'Por segurança, confirme seu login do Google e tente de novo.'
            : 'Por segurança, digite sua senha para confirmar.',
        );
        if (usaGoogle) {
          try {
            await reautenticar(user);
            await excluirConta(user);
            window.location.href = '/app/';
            return;
          } catch {
            setErro('Não consegui confirmar seu login. Tente de novo.');
          }
        }
      } else {
        setErro('Não consegui excluir a conta. Tente de novo.');
      }
      setOcupado(false);
    }
  }

  return (
    <section style={{ marginTop: 'var(--space-12)' }}>
      <p className="pf-eyebrow" style={{ color: 'var(--ember-2)', marginBottom: 'var(--space-3)' }}>
        Seus dados
      </p>

      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <Item
          titulo="Exportar meus dados"
          texto="Baixe tudo o que guardamos sobre você num arquivo JSON."
          botao="Exportar"
          onClick={() => void exportar()}
          ocupado={ocupado}
        />
        <Item
          titulo="Resetar meus dados"
          texto="Apaga lançamentos, bens e conquistas. Sua conta continua, e você refaz o onboarding."
          botao="Resetar"
          onClick={() => setAcao('reset')}
          ocupado={ocupado}
        />
        <Item
          titulo="Excluir minha conta"
          texto="Apaga permanentemente todos os seus dados e o seu login. Não dá pra desfazer."
          botao="Excluir conta"
          onClick={() => setAcao('excluir')}
          ocupado={ocupado}
          perigo
        />
      </div>

      {aviso && <p style={{ color: 'var(--mint)', fontSize: '0.9rem', marginTop: 'var(--space-3)' }}>{aviso}</p>}
      {!acao && erro && <p className="pf-error">{erro}</p>}

      {acao && (
        <div className="pf-modal-fundo" role="dialog" aria-modal="true" onClick={ocupado ? undefined : fechar}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            {acao === 'reset' ? (
              <>
                <h2 style={{ fontSize: '1.3rem' }}>Resetar seus dados?</h2>
                <p style={{ color: 'var(--muted)' }}>
                  Vamos apagar seus meses lançados, lançamentos detalhados, bens e conquistas. Sua
                  conta continua e você volta pro onboarding.
                </p>
                <p className="pf-hint">Quer guardar uma cópia antes? Use o "Exportar meus dados".</p>
                {erro && <p className="pf-error">{erro}</p>}
                <button className="pf-btn pf-btn-primary" disabled={ocupado} onClick={() => void confirmarReset()}>
                  {ocupado ? 'Apagando…' : 'Sim, resetar'}
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '1.3rem' }}>Excluir sua conta?</h2>
                <p style={{ color: 'var(--muted)' }}>
                  Isso apaga <strong>tudo</strong>: seu perfil, meses lançados, lançamentos, bens,
                  conquistas e o seu login. <strong>Não dá pra desfazer.</strong>
                </p>
                <p className="pf-hint">Quer guardar uma cópia antes? Use o "Exportar meus dados".</p>

                <label className="pf-field" style={{ marginTop: 'var(--space-4)' }}>
                  <span className="pf-label">Digite EXCLUIR para confirmar</span>
                  <input
                    className="pf-input"
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    autoComplete="off"
                  />
                </label>

                {precisaSenha && !usaGoogle && (
                  <label className="pf-field">
                    <span className="pf-label">Sua senha</span>
                    <input
                      className="pf-input"
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </label>
                )}

                {erro && <p className="pf-error">{erro}</p>}

                <button
                  className="pf-btn"
                  style={{ background: '#c0392b', color: '#fff' }}
                  disabled={ocupado || confirmacao.trim().toUpperCase() !== 'EXCLUIR'}
                  onClick={() => void confirmarExclusao()}
                >
                  {ocupado ? 'Excluindo…' : 'Excluir minha conta permanentemente'}
                </button>
              </>
            )}
            <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
              <button className="pf-btn-link" onClick={fechar} disabled={ocupado}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Item({
  titulo,
  texto,
  botao,
  onClick,
  ocupado,
  perigo,
}: {
  titulo: string;
  texto: string;
  botao: string;
  onClick: () => void;
  ocupado: boolean;
  perigo?: boolean;
}) {
  return (
    <div
      className="pf-stat"
      style={{
        display: 'flex',
        gap: 'var(--space-4)',
        alignItems: 'center',
        flexWrap: 'wrap',
        borderColor: perigo ? 'rgba(192,57,43,.4)' : 'var(--line)',
      }}
    >
      <div style={{ flex: 1, minWidth: '12rem' }}>
        <div style={{ fontWeight: 600, color: perigo ? '#ff8a7a' : 'var(--paper)' }}>{titulo}</div>
        <div className="pf-hint" style={{ margin: 0 }}>{texto}</div>
      </div>
      <button
        className="pf-btn pf-btn-ghost"
        style={{ width: 'auto', padding: '0.6rem 1.1rem', borderColor: perigo ? 'rgba(192,57,43,.5)' : undefined }}
        onClick={onClick}
        disabled={ocupado}
      >
        {botao}
      </button>
    </div>
  );
}
