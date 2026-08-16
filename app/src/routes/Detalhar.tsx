import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useSnapshots } from '../hooks/useSnapshots';
import { useTransactions } from '../hooks/useTransactions';
import {
  adicionarTransacao,
  atualizarTransacao,
  limparMes,
  removerTransacao,
  ROTULO_TIPO,
  type TipoTransacao,
} from '../data/transactions';
import { adotarTotaisDosItens, atualizarSnapshot, voltarAoDeclarado } from '../data/snapshots';
import { CATEGORIAS, normalizarCategoria } from '../data/categorias';
import {
  deveVoltarAoDeclarado,
  divergiu,
  podeAdotarItens,
  residualDosItens,
  somarItens,
  totaisDosItens,
} from '../data/reconciliacao';
import { MoedaInput } from '../components/MoedaInput';
import { CategoriaInput } from '../components/CategoriaInput';
import { Campo } from '../components/Campo';
import { LinhaTransacao } from '../components/LinhaTransacao';
import { formatBRL, formatMesAno } from '../utils/format';

const TIPOS: TipoTransacao[] = ['saida', 'ativa', 'passiva', 'aporte'];

export function Detalhar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { mes = '' } = useParams();
  const { lista: snaps } = useSnapshots(user?.uid ?? null);
  const { lista: itens, carregando } = useTransactions(user?.uid ?? null, mes);

  const snap = snaps.find((s) => s.mes === mes);

  const [tipo, setTipo] = useState<TipoTransacao>('saida');
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const soma = useMemo(() => somarItens(itens), [itens]);
  const doItens = useMemo(() => totaisDosItens(soma), [soma]);
  const residual = useMemo(() => residualDosItens(soma), [soma]);
  const divergente =
    !!snap && podeAdotarItens(itens.length, carregando) && divergiu(snap, doItens);

  async function usarOsItens() {
    if (!user || !snap || !podeAdotarItens(itens.length, carregando)) return;
    setOcupado(true);
    try {
      await adotarTotaisDosItens(user.uid, snap, doItens);
    } finally {
      setOcupado(false);
    }
  }

  async function limparTudo() {
    if (!user) return;
    setOcupado(true);
    try {
      await limparMes(user.uid, mes);
      setConfirmando(false);
      // os totais voltam sozinhos pelo efeito abaixo, assim que a lista esvaziar
    } finally {
      setOcupado(false);
    }
  }

  // renda passiva derivada → grava no snapshot (alimenta a cobertura passiva)
  useEffect(() => {
    if (!user || !snap || carregando) return;
    if ((snap.rendaPassiva ?? 0) !== soma.passiva) {
      void atualizarSnapshot(user.uid, mes, { rendaPassiva: soma.passiva });
    }
  }, [user, snap, mes, soma.passiva, carregando]);

  /**
   * Mês sem lançamento nenhum volta a valer pelos 4 números do modo rápido.
   *
   * Se o usuário adotou a soma dos itens e depois apagou os itens, manter os
   * totais derivados seria o pior dos dois mundos: números calculados a partir
   * de lançamentos que não existem mais, sem nada na tela que explique de onde
   * vieram. `carregando` segura o gatilho — a lista nasce vazia antes do
   * primeiro snapshot do Firestore chegar, e restaurar ali apagaria o ajuste
   * de quem só abriu a tela.
   */
  useEffect(() => {
    if (!user || !snap || !snap.declarado) return;
    if (deveVoltarAoDeclarado(snap, itens.length, carregando)) {
      void voltarAoDeclarado(user.uid, mes, snap.declarado);
    }
  }, [user, snap, mes, itens.length, carregando]);

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
          <p className="pf-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>
            Reconciliação{snap.declarado ? ' · totais vindos dos itens' : ''}
          </p>
          <div className="pf-hero-card">
            {snap.declarado && (
              <p className="pf-hint" style={{ margin: '0 0 var(--space-3)' }}>
                Você adotou a soma dos lançamentos neste mês. Seus 4 números originais estão
                guardados ({formatBRL(snap.declarado.receitaLiquida)} de receita ·{' '}
                {formatBRL(snap.declarado.gastoTotal)} de despesa) e voltam sozinhos se você apagar
                os lançamentos.
              </p>
            )}
            <Recon rotulo="Despesa" total={snap.gastoTotal} categorizado={soma.saida} />
            <Recon rotulo="Receita" total={snap.receitaLiquida} categorizado={soma.ativa + soma.passiva} />
            <Recon rotulo="Aporte" total={snap.aportesMes} categorizado={soma.aporte} />
            {Math.abs(residual) > 0.5 && soma.aporte > 0 && (
              <p className="pf-hint" style={{ margin: 'var(--space-3) 0 0' }}>
                {residual < 0 ? (
                  <>
                    Pelos lançamentos, saíram <strong>{formatBRL(-residual)}</strong> a mais do que
                    entraram neste mês. Ou faltou importar uma receita, ou o aporte saiu de saldo
                    que já existia — as duas coisas acontecem, e nenhuma é erro de conta.
                  </>
                ) : (
                  <>
                    Sobraram <strong>{formatBRL(residual)}</strong> que os lançamentos não apontam
                    como aporte. Se esse dinheiro ficou na conta, está certo assim; se foi
                    investido, falta o lançamento de aporte.
                  </>
                )}
              </p>
            )}
            {soma.neutro > 0 && (
              <p className="pf-hint" style={{ margin: 'var(--space-3) 0 0' }}>
                + {formatBRL(soma.neutro)} em movimentação entre contas (fatura, transferência).
                Fora da conta de propósito: esse dinheiro não foi consumido nem ganho, só mudou de
                lugar.
              </p>
            )}
            {soma.passiva > 0 && (
              <p style={{ margin: 'var(--space-3) 0 0', color: 'var(--mint)', fontSize: '0.9rem' }}>
                Renda passiva: {formatBRL(soma.passiva)}/mês — já entra na sua cobertura passiva.
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
                <Troca rotulo="Receita" de={snap.receitaLiquida} para={doItens.receitaLiquida} />
                <Troca rotulo="Despesa" de={snap.gastoTotal} para={doItens.gastoTotal} />
                <Troca rotulo="Aporte" de={snap.aportesMes} para={doItens.aportesMes} />
              </div>
              <button className="pf-btn pf-btn-ghost" disabled={ocupado} onClick={() => void usarOsItens()}>
                {ocupado ? 'Ajustando…' : 'Usar o que os itens somam'}
              </button>
              <p className="pf-hint" style={{ marginTop: 'var(--space-2)' }}>
                Confira antes: se faltou importar um extrato, ou se sobrou transferência marcada como
                receita, o número dos itens fica pior que o seu. Guardo o que você digitou — apagar
                os lançamentos devolve os 4 números originais.
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
                    <LinhaTransacao
                      key={it.id}
                      item={it}
                      onSalvar={async (patch) => {
                        if (user) await atualizarTransacao(user.uid, it.id, patch);
                      }}
                      onRemover={() => user && void removerTransacao(user.uid, it.id)}
                    />
                  ))}
              </div>

              {/* Limpar o mês inteiro */}
              <div style={{ marginTop: 'var(--space-6)' }}>
                {!confirmando ? (
                  <button
                    className="pf-btn-link"
                    style={{ padding: 0, color: 'var(--muted)' }}
                    onClick={() => setConfirmando(true)}
                  >
                    limpar os {itens.length} lançamentos deste mês
                  </button>
                ) : (
                  <div className="pf-card-alerta">
                    <strong>Apagar os {itens.length} lançamentos de {rotuloMes(mes)}?</strong>
                    <p style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>
                      Some a decomposição do mês — a categorização, a renda passiva derivada e, se
                      você tinha adotado a soma dos itens, os totais voltam a ser{' '}
                      <strong>os 4 números do modo rápido</strong>
                      {snap.declarado
                        ? `: ${formatBRL(snap.declarado.receitaLiquida)} de receita e ${formatBRL(snap.declarado.gastoTotal)} de despesa.`
                        : ' que você já tem.'}{' '}
                      Seu patrimônio e sua data FIRE não mudam. As regras que você ensinou ao
                      importador continuam valendo.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                      <button className="pf-btn pf-btn-ghost" disabled={ocupado} onClick={() => void limparTudo()}>
                        {ocupado ? 'Apagando…' : 'Apagar tudo'}
                      </button>
                      <button className="pf-btn-link" disabled={ocupado} onClick={() => setConfirmando(false)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

const rotuloMes = (m: string) => formatMesAno(new Date(`${m}-01T00:00:00`));

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
