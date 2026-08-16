import { Link } from 'react-router-dom';
import { CONQUISTAS } from '@pontofire/insights';
import { IconeConquista } from './IconeConquista';

const MAX_VISIVEIS = 10;

/**
 * Fita discreta de conquistas desbloqueadas para o Início.
 * Só mostra o que já foi conquistado — as bloqueadas ficam na página de
 * Conquistas, onde motivam sem poluir a tela principal.
 */
export function TrofeusResumo({ ids }: { ids: Set<string> }) {
  if (ids.size === 0) return null;

  const lista = CONQUISTAS.filter((c) => ids.has(c.id)).sort((a, b) => a.ordem - b.ordem);
  const visiveis = lista.slice(0, MAX_VISIVEIS);
  const resto = lista.length - visiveis.length;

  return (
    <Link
      to="/conquistas"
      className="pf-trofeus"
      aria-label={`${lista.length} conquistas desbloqueadas. Ver todas.`}
    >
      <span className="mono rot">
        {lista.length} {lista.length === 1 ? 'conquista' : 'conquistas'}
      </span>
      {visiveis.map((c) => (
        <span key={c.id} className="medalha" title={`${c.titulo} — ${c.descricao}`}>
          <IconeConquista nome={c.icone} size={18} />
        </span>
      ))}
      {resto > 0 && <span className="mono resto">+{resto}</span>}
    </Link>
  );
}
