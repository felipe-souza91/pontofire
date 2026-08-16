import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { enviarFeedback, ROTULO_FEEDBACK, type TipoFeedback } from '../data/feedback';
import { ordenarPor } from '../utils/ordenar';
import { Icone } from '../theme/Icone';

const TIPOS: TipoFeedback[] = ordenarPor(
  ['ideia', 'problema', 'elogio', 'outro'],
  (t) => ROTULO_FEEDBACK[t],
);

/** Botão flutuante + modal de feedback (mão única). */
export function BotaoFeedback({ plano = 'free' }: { plano?: string }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoFeedback>('ideia');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { pathname } = useLocation();

  function fechar() {
    setAberto(false);
    setTimeout(() => {
      setEnviado(false);
      setTexto('');
      setErro(null);
    }, 200);
  }

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      await enviarFeedback(tipo, texto, { rota: pathname, versao: 'beta', plano });
      setEnviado(true);
    } catch {
      setErro('Não consegui enviar agora. Tente de novo em instantes.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button className="pf-fab" onClick={() => setAberto(true)} aria-label="Enviar feedback" title="Enviar feedback">
        <Icone nome="balao" size={20} />
      </button>

      {aberto && (
        <div className="pf-modal-fundo" role="dialog" aria-modal="true" onClick={fechar}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            {enviado ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--mint)' }}><Icone nome="check" size={32} /></div>
                <h2 style={{ fontSize: '1.3rem', marginTop: 'var(--space-3)' }}>Obrigado de verdade.</h2>
                <p style={{ color: 'var(--muted)' }}>
                  Li tudo que chega. Seu recado ajuda a decidir o que vem primeiro.
                </p>
                <button className="pf-btn pf-btn-primary" onClick={fechar}>Fechar</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '1.3rem' }}>Como podemos melhorar?</h2>
                <p className="pf-hint" style={{ marginTop: 0 }}>
                  Beta fechado — sua opinião muda o roteiro de verdade.
                </p>

                <div className="pf-chips" style={{ margin: 'var(--space-4) 0' }}>
                  {TIPOS.map((t) => (
                    <button key={t} type="button" className={`pf-chip ${tipo === t ? 'on' : ''}`} onClick={() => setTipo(t)}>
                      {ROTULO_FEEDBACK[t]}
                    </button>
                  ))}
                </div>

                <textarea
                  className="pf-input"
                  rows={4}
                  autoFocus
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Conta pra gente…"
                />

                {erro && <p className="pf-error">{erro}</p>}

                <button
                  className="pf-btn pf-btn-primary"
                  style={{ marginTop: 'var(--space-4)' }}
                  disabled={enviando || !texto.trim()}
                  onClick={() => void enviar()}
                >
                  {enviando ? 'Enviando…' : 'Enviar'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
                  <button className="pf-btn-link" onClick={fechar}>Agora não</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
