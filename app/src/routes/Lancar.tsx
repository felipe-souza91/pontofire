import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rendimentoMes, taxaPoupanca } from '@pontofire/engine';
import { useAuth } from '../auth/useAuth';
import { useSnapshots } from '../hooks/useSnapshots';
import { salvarSnapshot } from '../data/snapshots';
import { MoedaInput } from '../components/MoedaInput';
import { formatBRL, formatBRLcompact, formatMesAno, formatPct } from '../utils/format';

function mesCorrente(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function Lancar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lista } = useSnapshots(user?.uid ?? null);

  const [mes, setMes] = useState(mesCorrente());
  const [patrimonio, setPatrimonio] = useState(0);
  const [receita, setReceita] = useState(0);
  const [despesa, setDespesa] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // ao escolher um mês, carrega o que já foi lançado (ou zera, se for novo)
  useEffect(() => {
    const existente = lista.find((s) => s.mes === mes);
    if (existente) {
      setPatrimonio(existente.patrimonioTotal);
      setReceita(existente.receitaLiquida);
      setDespesa(existente.gastoTotal);
    } else {
      setPatrimonio(0);
      setReceita(0);
      setDespesa(0);
    }
  }, [mes, lista]);

  // patrimônio do mês anterior (maior mês < selecionado) → deriva o rendimento
  const anterior = useMemo(() => {
    const antes = lista.filter((s) => s.mes < mes);
    return antes.length ? antes[antes.length - 1] : undefined;
  }, [lista, mes]);

  const aporte = receita - despesa;
  const taxa = taxaPoupanca(receita, despesa);
  const rendimento = anterior ? rendimentoMes(patrimonio, anterior.patrimonioTotal, aporte) : null;

  const valido = patrimonio > 0 && receita > 0;

  async function salvar() {
    if (!user || !valido) return;
    setErro(null);
    setSalvando(true);
    try {
      await salvarSnapshot(user.uid, {
        mes,
        patrimonioTotal: patrimonio,
        receitaLiquida: receita,
        gastoTotal: despesa,
        aportesMes: aporte,
        rendimentosMes: rendimento ?? 0,
        taxaPoupanca: taxa,
      });
      navigate('/', { replace: true });
    } catch {
      setErro('Não consegui salvar. Tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <main className="pf-container" style={{ maxWidth: '32rem', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="pf-btn-link" onClick={() => navigate('/')} style={{ padding: 0 }}>← Voltar</button>
        <strong className="mono" style={{ flex: 1, textAlign: 'center' }}>Lançar mês</strong>
        <span style={{ width: '3rem' }} />
      </header>

      <p className="pf-eyebrow" style={{ marginBottom: 'var(--space-4)' }}>Modo rápido · 3 números</p>

      <label className="pf-field">
        <span className="pf-label">Mês de referência</span>
        <input className="pf-input" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
      </label>

      <label className="pf-field">
        <span className="pf-label">Patrimônio total hoje</span>
        <MoedaInput value={patrimonio} onChange={setPatrimonio} />
        <span className="pf-hint">Quanto você tem investido agora. O rendimento sai daqui (marcação a mercado).</span>
      </label>

      <label className="pf-field">
        <span className="pf-label">Receita do mês (o que entrou)</span>
        <MoedaInput value={receita} onChange={setReceita} />
        <span className="pf-hint">Sua renda líquida no mês.</span>
      </label>

      <label className="pf-field">
        <span className="pf-label">Despesa do mês (o que você consumiu)</span>
        <MoedaInput value={despesa} onChange={setDespesa} />
        <span className="pf-hint">Só o consumo — sem contar o que você investiu. Receita = despesa + aporte.</span>
      </label>

      {/* Preview do que o motor deriva */}
      <div className="pf-hero-card" style={{ marginTop: 'var(--space-4)' }}>
        <span className="pf-eyebrow">O motor deriva</span>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Linha rotulo="Aporte (sobra investida)" valor={formatBRL(aporte)} tom={aporte < 0 ? 'ember' : 'mint'} />
          <Linha rotulo="Taxa de poupança" valor={formatPct(taxa)} />
          {rendimento !== null ? (
            <Linha rotulo={`Rendimento vs ${formatMesAno(new Date(anterior!.mes + '-01T00:00:00'))}`} valor={formatBRL(rendimento)} tom={rendimento < 0 ? 'ember' : 'mint'} />
          ) : (
            <Linha rotulo="Rendimento" valor="— (1º mês, sem base)" />
          )}
        </div>
      </div>

      {aporte < 0 && (
        <p className="pf-hint" style={{ marginTop: 'var(--space-3)' }}>
          Você gastou mais do que ganhou neste mês. Sem julgamento — o motor só registra a verdade.
        </p>
      )}

      {erro && <p className="pf-error">{erro}</p>}

      <button className="pf-btn pf-btn-primary" style={{ marginTop: 'var(--space-6)' }} disabled={!valido || salvando} onClick={() => void salvar()}>
        {salvando ? 'Salvando…' : lista.some((s) => s.mes === mes) ? 'Atualizar mês' : 'Salvar mês'}
      </button>

      {lista.some((s) => s.mes === mes) && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
          <Link className="pf-btn-link" to={`/detalhar/${mes}`}>Detalhar este mês por categoria →</Link>
        </div>
      )}

      {lista.length > 0 && (
        <section style={{ marginTop: 'var(--space-8)' }}>
          <p className="pf-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Meses lançados</p>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {[...lista].reverse().map((s) => (
              <div
                key={s.mes}
                className="pf-stat"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderColor: s.mes === mes ? 'var(--ember)' : 'var(--line)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setMes(s.mes)}
                  className="pf-btn-link"
                  style={{ flex: 1, textAlign: 'left', padding: 0, color: 'var(--paper)', textTransform: 'capitalize', textDecoration: 'none' }}
                >
                  {formatMesAno(new Date(`${s.mes}-01T00:00:00`))}
                </button>
                <span className="mono" style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                  {formatBRLcompact(s.patrimonioTotal)} · {formatPct(s.taxaPoupanca)}
                </span>
                <Link className="pf-btn-link" style={{ padding: 0 }} to={`/detalhar/${s.mes}`}>detalhar</Link>
              </div>
            ))}
          </div>
          <p className="pf-hint" style={{ marginTop: 'var(--space-2)' }}>Toque num mês pra editar.</p>
        </section>
      )}
    </main>
  );
}

function Linha({ rotulo, valor, tom }: { rotulo: string; valor: string; tom?: 'mint' | 'ember' }) {
  const cor = tom === 'mint' ? 'var(--mint)' : tom === 'ember' ? 'var(--ember-2)' : 'var(--paper)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
      <span style={{ color: 'var(--muted)' }}>{rotulo}</span>
      <span className="mono" style={{ color: cor }}>{valor}</span>
    </div>
  );
}
