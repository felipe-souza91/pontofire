import { useState } from 'react';
import { ehCategoriaNeutra } from '@pontofire/engine';
import { ROTULO_TIPO, type Transacao, type TipoTransacao } from '../data/transactions';
import { CATEGORIAS, normalizarCategoria } from '../data/categorias';
import { CategoriaInput } from './CategoriaInput';
import { MoedaInput } from './MoedaInput';
import { formatBRL } from '../utils/format';
import { Icone } from '../theme/Icone';

const TIPOS: TipoTransacao[] = ['saida', 'ativa', 'passiva', 'aporte'];

const COR_TIPO: Record<TipoTransacao, string> = {
  saida: 'var(--muted)',
  ativa: 'var(--paper)',
  passiva: 'var(--mint)',
  aporte: 'var(--ember-2)',
};

/**
 * Um lançamento salvo — em modo leitura ou em edição.
 *
 * O import acerta a maioria e erra alguns; sem edição, o único conserto era
 * apagar e redigitar, o que faz perder a data e a origem do lançamento. Aqui o
 * usuário corrige o que está errado e o resto permanece.
 */
export function LinhaTransacao({
  item,
  onSalvar,
  onRemover,
}: {
  item: Transacao;
  onSalvar: (patch: Partial<Transacao>) => Promise<void>;
  onRemover: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState<TipoTransacao>(item.tipo);
  const [categoria, setCategoria] = useState(item.categoria);
  const [valor, setValor] = useState(item.valor);
  const [descricao, setDescricao] = useState(item.descricao ?? '');
  const [ocupado, setOcupado] = useState(false);

  function abrir() {
    setTipo(item.tipo);
    setCategoria(item.categoria);
    setValor(item.valor);
    setDescricao(item.descricao ?? '');
    setEditando(true);
  }

  async function salvar() {
    if (!categoria.trim() || valor <= 0) return;
    setOcupado(true);
    try {
      await onSalvar({
        tipo,
        categoria: normalizarCategoria(categoria),
        valor,
        descricao: descricao.trim(),
      });
      setEditando(false);
    } finally {
      setOcupado(false);
    }
  }

  if (!editando) {
    const neutra = ehCategoriaNeutra(item.categoria);
    return (
      <div
        className="pf-stat"
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span>{item.categoria}</span>
            <span className="mono" style={{ fontSize: '0.66rem', color: COR_TIPO[item.tipo], textTransform: 'uppercase' }}>
              {ROTULO_TIPO[item.tipo]}
            </span>
            {neutra && (
              <span className="pf-tag-alerta" title="Movimentação entre contas: fica fora da reconciliação">
                fora da conta
              </span>
            )}
          </div>
          {item.descricao && <div className="pf-hint" style={{ margin: 0 }}>{item.descricao}</div>}
        </div>
        <span className="mono">{formatBRL(item.valor)}</span>
        <button className="pf-btn-link" style={{ padding: 0 }} aria-label="Editar lançamento" onClick={abrir}>
          <Icone nome="editar" size={15} />
        </button>
        <button
          className="pf-btn-link"
          style={{ padding: 0, color: 'var(--muted)' }}
          aria-label="Remover lançamento"
          onClick={onRemover}
        >
          <Icone nome="fechar" size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="pf-stat" style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}>
      <div className="pf-chips">
        {TIPOS.map((t) => (
          <button key={t} type="button" className={`pf-chip ${tipo === t ? 'on' : ''}`} onClick={() => setTipo(t)}>
            {ROTULO_TIPO[t]}
          </button>
        ))}
      </div>

      <label>
        <span className="pf-hint">Categoria</span>
        <CategoriaInput value={categoria} onChange={setCategoria} opcoes={CATEGORIAS[tipo]} placeholder="escolha ou digite" />
      </label>

      <label>
        <span className="pf-hint">Valor</span>
        <MoedaInput value={valor} onChange={setValor} />
      </label>

      <label>
        <span className="pf-hint">Descrição</span>
        <input className="pf-input" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </label>

      {item.origem === 'import' && (
        <p className="pf-hint" style={{ margin: 0 }}>
          Veio de importação{item.data ? ` · ${brDia(item.data)}` : ''}. Editar não desfaz o dedupe:
          reimportar o mesmo extrato continua não duplicando este lançamento.
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button
          className="pf-btn pf-btn-primary"
          style={{ flex: 1 }}
          disabled={ocupado || !categoria.trim() || valor <= 0}
          onClick={() => void salvar()}
        >
          {ocupado ? 'Salvando…' : 'Salvar'}
        </button>
        <button className="pf-btn pf-btn-ghost" disabled={ocupado} onClick={() => setEditando(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

const brDia = (iso: string) => iso.split('-').reverse().join('/');
