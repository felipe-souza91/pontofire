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
import { ehCategoriaNeutra, taxaPoupanca } from '@pontofire/engine';
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

  /**
   * Categoria neutra fica FORA da reconciliação.
   *
   * "Fatura de cartão" e "Transferência entre contas" são dinheiro trocando de
   * bolso. Contá-las como despesa categorizada fazia a conta estourar o total
   * declarado por um valor que nunca foi consumo — e o card acusava um rombo
   * que não existe.
   */
  const soma = useMemo(() => {
    const s = { ativa: 0, passiva: 0, aporte: 0, saida: 0, neutro: 0 };
    for (const it of itens) {
      if (ehCategoriaNeutra(it.categoria)) s.neutro += it.valor;
      else s[it.tipo] += it.valor;
    }
    return s;
  }, [itens]);

  /** O que os itens dizem que o mês foi — a alternativa ao total declarado. */
  const doItens = useMemo(() => {
    const receita = soma.ativa + soma.passiva;
    const despesa = soma.saida;
    return {
      receita,
      despesa,
      aporte: receita - despesa,
      taxa: taxaPoupanca(receita, despesa),
    };
  }, [soma]);

  const divergente =
    !!snap &&
    (Math.abs(doItens.receita - snap.receitaLiquida) > 1 ||
      Math.abs(doItens.despesa - snap.gastoTotal) > 1);

  async function usarOsItens() {
    if (!user || !snap) return;
    setOcupado(true);
    try {
      await atualizarSnapshot(user.uid, mes, {
        receitaLiquida: doItens.receita,
        gastoTotal: doItens.despesa,
        aportesMes: doItens.aporte,
        taxaPoupanca: doItens.taxa,
      });
    } finally {
      setOcupado(false);
    }
  }

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
            {soma.neutro > 0 && (
              <p className="pf-hint" style={{ margin: 'var(--space-3) 0 0' }}>
                + {formatBRL(soma.neutro)} em movimentação entre contas (fatura, transferência).
                Fora da conta de propósito: esse dinheiro não foi consumido nem ganho, só mudou de
                lugar.
              </p>
            )}
            {soma.passiva > 0 && (
              <p style={{ margin: 'var(--space-3) 0 0', color: 'var(--mint)', fontSize: '0.9rem' }}>
                Renda passiva: {formatBRL(soma.passiva)}/mês — já entra na sua cobertura passiva. 🔥
              </p>
            )}
          </div>

          {divergente && (
            <div className="pf-card-alerta" style={{ marginTop: 'var(--space-4)' }}>
              <strong>Os itens contam uma história diferente do total.</strong>
              <p style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>
                O total que você digitou no modo rápido continua sendo a verdade — é assim de
                propósito, porque item esquecido é mais comum que total errado. Mas se estes{' '}
                {itens.length} lançamentos são o mês inteiro, o mais fiel é adotar o que eles somam:
              </p>
              <div style={{ display: 'grid', gap: 4, marginBottom: 'var(--space-3)' }}>
                <Troca rotulo="Receita" de={snap.receitaLiquida} para={doItens.receita} />
                <Troca rotulo="Despesa" de={snap.gastoTotal} para={doItens.despesa} />
                <Troca rotulo="Aporte" de={snap.aportesMes} para={doItens.aporte} />
              </div>
              <button className="pf-btn pf-btn-ghost" disabled={ocupado} onClick={() => void usarOsItens()}>
                {ocupado ? 'Ajustando…' : 'Usar o que os itens somam'}
              </button>
              <p className="pf-hint" style={{ marginTop: 'var(--space-2)' }}>
                Confira antes: se faltou importar um extrato, ou se sobrou transferência marcada como
                receita, o número dos itens fica pior que o seu. Dá pra desfazer refazendo o modo
                rápido.
              </p>
            </div>
          )}

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

/** "Despesa  R$ 8.000 → R$ 16.247,29" — o antes e o depois, sem surpresa. */
function Troca({ rotulo, de, para }: { rotulo: string; de: number; para: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--muted)' }}>{rotulo}</span>
      <span className="mono">
        <span style={{ color: 'var(--muted)', textDecoration: 'line-through' }}>{formatBRL(de)}</span>
        {' → '}
        {formatBRL(para)}
      </span>
    </div>
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
