import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useSnapshots } from '../hooks/useSnapshots';
import { useTransactions } from '../hooks/useTransactions';
import {
  adicionarTransacao,
  removerTransacao,
  ROTULO_TIPO,
  type TipoTransacao,
} from '../data/transactions';
import { atualizarSnapshot } from '../data/snapshots';
import { CATEGORIAS, normalizarCategoria } from '../data/categorias';
import { MoedaInput } from '../components/MoedaInput';
import { CategoriaInput } from '../components/CategoriaInput';
import { Campo } from '../components/Campo';
import { formatBRL, formatMesAno } from '../utils/format';

const TIPOS: TipoTransacao[] = ['saida', 'ativa', 'passiva', 'aporte'];
const COR_TIPO: Record<TipoTransacao, string> = {
  saida: 'var(--muted)',
  ativa: 'var(--paper)',
  passiva: 'var(--mint)',
  aporte: 'var(--ember-2)',
};

export function Detalhar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mes = '' } = useParams();
  const { lista: snaps } = useSnapshots(user?.uid ?? null);
  const { lista: itens } = useTransactions(user?.uid ?? null, mes);

  const snap = snaps.find((s) => s.mes === mes);

  const [tipo, setTipo] = useState<TipoTransacao>('saida');
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const soma = useMemo(() => {
    const s = { ativa: 0, passiva: 0, aporte: 0, saida: 0 };
    for (const it of itens) s[it.tipo] += it.valor;
    return s;
  }, [itens]);

  // renda passiva derivada → grava no snapshot (alimenta a cobertura passiva)
  useEffect(() => {
    if (!user || !snap) return;
    if ((snap.rendaPassiva ?? 0) !== soma.passiva) {
      void atualizarSnapshot(user.uid, mes, { rendaPassiva: soma.passiva });
    }
  }, [user, snap, mes, soma.passiva]);

  async function adicionar() {
    if (!user || !categoria.trim() || valor <= 0) return;
    setOcupado(true);
    try {
      await adicionarTransacao(user.uid, {
        mes,
        tipo,
        categoria: normalizarCategoria(categoria),
        valor,
        descricao: descricao.trim() || undefined,
        origem: 'manual',
      });
      setCategoria('');
      setValor(0);
      setDescricao('');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="pf-container" style={{ maxWidth: '32rem', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="pf-btn-link" onClick={() => navigate('/lancar')} style={{ padding: 0 }}>← Voltar</button>
        <strong className="mono" style={{ flex: 1, textAlign: 'center', textTransform: 'capitalize' }}>
          {mes ? formatMesAno(new Date(`${mes}-01T00:00:00`)) : 'Detalhar'}
        </strong>
        <span style={{ width: '3rem' }} />
      </header>

      {!snap ? (
        <div className="pf-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>
            Salve os totais deste mês no modo rápido primeiro — o total é a verdade, os itens só o
            decompõem.
          </p>
          <button className="pf-btn pf-btn-ghost" onClick={() => navigate('/lancar')}>Ir pro modo rápido</button>
        </div>
      ) : (
        <>
          {/* Reconciliação híbrida */}
          <p className="pf-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Reconciliação</p>
          <div className="pf-hero-card">
            <Recon rotulo="Despesa" total={snap.gastoTotal} categorizado={soma.saida} />
            <Recon rotulo="Receita" total={snap.receitaLiquida} categorizado={soma.ativa + soma.passiva} />
            <Recon rotulo="Aporte" total={snap.aportesMes} categorizado={soma.aporte} />
            {soma.passiva > 0 && (
              <p style={{ margin: 'var(--space-3) 0 0', color: 'var(--mint)', fontSize: '0.9rem' }}>
                Renda passiva: {formatBRL(soma.passiva)}/mês — já entra na sua cobertura passiva. 🔥
              </p>
            )}
          </div>

          {/* Adicionar item */}
          <p className="pf-eyebrow" style={{ margin: 'var(--space-8) 0 var(--space-3)' }}>Adicionar lançamento</p>
          <div className="pf-chips" style={{ marginBottom: 'var(--space-4)' }}>
            {TIPOS.map((t) => (
              <button key={t} type="button" className={`pf-chip ${tipo === t ? 'on' : ''}`} onClick={() => setTipo(t)}>
                {ROTULO_TIPO[t]}
              </button>
            ))}
          </div>
          <Campo rotulo="Categoria" dica="Escolha uma sugestão da lista ou digite a sua. Ex: Mercado, Aluguéis, Salário.">
            <CategoriaInput value={categoria} onChange={setCategoria} opcoes={CATEGORIAS[tipo]} placeholder="escolha ou digite" />
          </Campo>
          <Campo rotulo="Valor" dica="Quanto foi neste item. Aceita centavos — ex: 47,90.">
            <MoedaInput value={valor} onChange={setValor} />
          </Campo>
          <Campo rotulo="Descrição" opcional dica="Uma nota pra você lembrar. Ex: 'mercado do mês', 'iFood de sexta'.">
            <input className="pf-input" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Campo>
          <button className="pf-btn pf-btn-primary" disabled={ocupado || !categoria.trim() || valor <= 0} onClick={() => void adicionar()}>
            {ocupado ? 'Adicionando…' : 'Adicionar'}
          </button>

          {/* Lista de itens */}
          {itens.length > 0 && (
            <div style={{ marginTop: 'var(--space-8)' }}>
              <p className="pf-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Lançamentos ({itens.length})</p>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {[...itens]
                  .sort((a, b) => TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo) || b.valor - a.valor)
                  .map((it) => (
                    <div
                      key={it.id}
                      className="pf-stat"
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline' }}>
                          <span style={{ textTransform: 'capitalize' }}>{it.categoria}</span>
                          <span className="mono" style={{ fontSize: '0.66rem', color: COR_TIPO[it.tipo], textTransform: 'uppercase' }}>
                            {ROTULO_TIPO[it.tipo]}
                          </span>
                        </div>
                        {it.descricao && <div className="pf-hint" style={{ margin: 0 }}>{it.descricao}</div>}
                      </div>
                      <span className="mono">{formatBRL(it.valor)}</span>
                      <button
                        className="pf-btn-link"
                        style={{ padding: 0, color: 'var(--muted)' }}
                        aria-label="Remover"
                        onClick={() => user && void removerTransacao(user.uid, it.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Recon({ rotulo, total, categorizado }: { rotulo: string; total: number; categorizado: number }) {
  const resto = total - categorizado;
  const excedeu = resto < -0.5;
  return (
    <div style={{ padding: 'var(--space-2) 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--muted)' }}>{rotulo}</span>
        <span className="mono">{formatBRL(total)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '2px' }}>
        <span className="pf-hint" style={{ margin: 0 }}>
          {formatBRL(categorizado)} categorizado ·{' '}
          <span style={{ color: excedeu ? 'var(--ember-2)' : 'var(--muted)' }}>
            {excedeu ? `${formatBRL(-resto)} a mais` : `${formatBRL(resto)} não categorizado`}
          </span>
        </span>
      </div>
    </div>
  );
}
