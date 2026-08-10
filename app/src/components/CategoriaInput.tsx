import { useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * Campo de categoria: lista completa ao abrir + digitação livre.
 *
 * POR QUE NÃO É MAIS UM <datalist>
 * O datalist filtra as opções pelo texto que já está no campo. Num lançamento
 * já categorizado como "Juros / Renda fixa", nenhuma opção casa com esse texto
 * e a lista abre VAZIA — pra trocar a categoria era preciso apagar tudo antes.
 * Justo na tela onde se corrige o que o importador errou, o campo obrigava a
 * apagar pra poder escolher.
 *
 * Aqui a regra é outra: abrir mostra tudo (com a atual destacada), digitar
 * filtra. O valor continua livre — o que não está na lista se escreve.
 */
export function CategoriaInput({
  value,
  onChange,
  opcoes,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  opcoes: readonly string[];
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  /** o que o usuário digitou DEPOIS de abrir — só então a lista filtra */
  const [busca, setBusca] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(-1);

  const filtradas = useMemo(() => {
    if (busca === null || !busca.trim()) return opcoes;
    const q = achatar(busca);
    return opcoes.filter((o) => achatar(o).includes(q));
  }, [opcoes, busca]);

  // fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) fechar();
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  function abrir() {
    setAberto(true);
    setBusca(null); // abre mostrando a lista inteira, não filtrada pelo valor atual
    setAtivo(opcoes.findIndex((o) => achatar(o) === achatar(value)));
  }

  function fechar() {
    setAberto(false);
    setBusca(null);
    setAtivo(-1);
  }

  function escolher(op: string) {
    onChange(op);
    fechar();
  }

  function digitar(texto: string) {
    onChange(texto);
    setBusca(texto);
    setAberto(true);
    setAtivo(-1);
  }

  function teclado(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!aberto) return abrir();
      if (!filtradas.length) return;
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      setAtivo((i) => (i + passo + filtradas.length) % filtradas.length);
      return;
    }
    if (e.key === 'Enter' && aberto && ativo >= 0 && filtradas[ativo]) {
      e.preventDefault();
      escolher(filtradas[ativo]);
      return;
    }
    if (e.key === 'Escape' && aberto) {
      e.preventDefault();
      fechar();
    }
  }

  return (
    <div className="pf-combo" ref={caixa}>
      <input
        className="pf-input"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={id}
        aria-autocomplete="list"
        aria-activedescendant={aberto && ativo >= 0 ? `${id}-${ativo}` : undefined}
        value={value}
        onChange={(e) => digitar(e.target.value)}
        onFocus={abrir}
        onClick={abrir}
        onKeyDown={teclado}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      <button
        type="button"
        className="pf-combo-seta"
        tabIndex={-1}
        aria-label={aberto ? 'Fechar sugestões' : 'Ver sugestões'}
        onClick={() => (aberto ? fechar() : abrir())}
      >
        ▾
      </button>

      {aberto && filtradas.length > 0 && (
        <ul className="pf-combo-lista" id={id} role="listbox">
          {filtradas.map((o, i) => (
            <li
              key={o}
              id={`${id}-${i}`}
              role="option"
              aria-selected={achatar(o) === achatar(value)}
              className={`pf-combo-op ${i === ativo ? 'ativo' : ''} ${achatar(o) === achatar(value) ? 'atual' : ''}`}
              // mousedown em vez de click: o blur do input não pode fechar antes
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(o);
              }}
              onMouseEnter={() => setAtivo(i)}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const achatar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
