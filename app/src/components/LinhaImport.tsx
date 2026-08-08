import { useState } from 'react';
import type { AlertaItem, ItemImportado } from '@pontofire/importer';
import { ROTULO_TIPO, type TipoTransacao } from '../data/transactions';
import { CategoriaInput } from '../components/CategoriaInput';
import { MoedaInput } from '../components/MoedaInput';
import { formatBRL } from '../utils/format';

const TIPOS: TipoTransacao[] = ['saida', 'ativa', 'passiva', 'aporte'];

const COR_TIPO: Record<TipoTransacao, string> = {
  saida: 'var(--muted)',
  ativa: 'var(--paper)',
  passiva: 'var(--mint)',
  aporte: 'var(--ember-2)',
};

const ALERTA: Record<AlertaItem, { rotulo: string; explicacao: string }> = {
  'duplicata-arquivo': {
    rotulo: 'repetido',
    explicacao: 'aparece mais de uma vez no arquivo — pode ser compra repetida de verdade',
  },
  'duplicata-salva': {
    rotulo: 'já importado',
    explicacao: 'isso já está no Ponto FIRE; marcar de novo faria o mês contar em dobro',
  },
  transferencia: {
    rotulo: 'transferência',
    explicacao: 'dinheiro entre contas suas, não é receita nem despesa',
  },
  'fora-do-periodo': {
    rotulo: 'outro mês',
    explicacao: 'a data é de um mês diferente do que você declarou — vai pro mês da data',
  },
  'direcao-incerta': {
    rotulo: 'entrada ou saída?',
    explicacao: 'o arquivo não disse a direção; confira o tipo',
  },
};

/**
 * Uma linha da revisão do import.
 *
 * Tudo é editável: incluir ou não, tipo, categoria, valor e data. O padrão é o
 * palpite do parser, com o motivo à mostra — o usuário aceita ou corrige, mas
 * nunca precisa adivinhar de onde saiu.
 */
export function LinhaImport({
  item,
  categorias,
  onAlterar,
  onCategoria,
}: {
  item: ItemImportado;
  categorias: readonly string[];
  onAlterar: (patch: Partial<ItemImportado>) => void;
  onCategoria: (categoria: string) => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className={`pf-linha-import ${item.incluir ? '' : 'fora'}`}>
      <div className="pf-li-topo">
        <input
          type="checkbox"
          className="pf-check"
          checked={item.incluir}
          aria-label={item.incluir ? 'Não importar este' : 'Importar este'}
          onChange={(e) => onAlterar({ incluir: e.target.checked })}
        />

        <div className="pf-li-nome">
          <span className="pf-li-desc" title={item.descricaoOriginal}>{item.descricao}</span>
          <div className="pf-li-meta">
            <span className="mono">{brDia(item.data)}</span>
            {item.motivo && <span> · {item.motivo}</span>}
          </div>
          {item.alertas.length > 0 && (
            <div className="pf-li-alertas">
              {item.alertas.map((a) => (
                <span key={a} className="pf-tag-alerta" title={ALERTA[a].explicacao}>
                  {ALERTA[a].rotulo}
                </span>
              ))}
            </div>
          )}
        </div>

        <select
          className="pf-select-mini"
          value={item.tipo}
          style={{ color: COR_TIPO[item.tipo] }}
          aria-label="Tipo do lançamento"
          onChange={(e) => onAlterar({ tipo: e.target.value as TipoTransacao })}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>{ROTULO_TIPO[t]}</option>
          ))}
        </select>

        <div className="pf-li-categoria">
          <CategoriaInput
            value={item.categoria}
            onChange={onCategoria}
            opcoes={categorias}
            placeholder="categoria"
          />
        </div>

        <span className={`mono pf-li-valor ${item.categoria ? '' : 'pendente'}`}>{formatBRL(item.valor)}</span>

        <button
          type="button"
          className="pf-btn-link pf-li-mais"
          aria-expanded={aberto}
          aria-label="Ajustar data e valor"
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? '▴' : '▾'}
        </button>
      </div>

      {aberto && (
        <div className="pf-li-detalhe">
          <label>
            <span className="pf-hint">Data</span>
            <input
              className="pf-input"
              type="date"
              value={item.data}
              onChange={(e) => e.target.value && onAlterar({ data: e.target.value })}
            />
          </label>
          <label>
            <span className="pf-hint">Valor</span>
            <MoedaInput value={item.valor} onChange={(v) => onAlterar({ valor: v })} />
          </label>
          <div>
            <span className="pf-hint">Como veio no arquivo</span>
            <p className="mono pf-li-original">{item.descricaoOriginal}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const brDia = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
