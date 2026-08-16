import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame } from '../theme/Flame';
import { Icone, type NomeIcone } from '../theme/Icone';

const ITENS: { para: string; rotulo: string; icone: NomeIcone }[] = [
  { para: '/lancar', rotulo: 'Lançar', icone: 'lancar' },
  { para: '/importar', rotulo: 'Importar', icone: 'importar' },
  { para: '/bens', rotulo: 'Bens', icone: 'casa' },
  { para: '/conquistas', rotulo: 'Conquistas', icone: 'trofeu' },
  { para: '/ferramentas', rotulo: 'Ferramentas', icone: 'calculadora' },
  { para: '/perfil', rotulo: 'Perfil', icone: 'engrenagem' },
];

/**
 * Cabeçalho do Início.
 *
 * No desktop os links ficam em linha, como sempre. No celular eles não cabem —
 * seis links mais o logo e o selo estouravam a largura e vazavam da tela,
 * porque só os cards eram responsivos. Abaixo de 820px vira menu sanduíche.
 *
 * O painel fecha sozinho ao trocar de rota, com Esc e com clique fora — as
 * três saídas que as pessoas tentam.
 */
export function MenuTopo({ onSair }: { onSair: () => void }) {
  const [aberto, setAberto] = useState(false);
  const { pathname } = useLocation();
  const caixa = useRef<HTMLDivElement>(null);

  // navegou: fecha
  useEffect(() => setAberto(false), [pathname]);

  useEffect(() => {
    if (!aberto) return;
    const porTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    const porClique = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('keydown', porTecla);
    document.addEventListener('mousedown', porClique);
    return () => {
      document.removeEventListener('keydown', porTecla);
      document.removeEventListener('mousedown', porClique);
    };
  }, [aberto]);

  return (
    <header className="pf-topo" ref={caixa}>
      <Flame size={30} />
      <strong className="pf-logo pf-topo-marca">Ponto FIRE</strong>
      <span className="pf-pill pf-topo-selo">beta fechado</span>

      {/* desktop */}
      <nav className="pf-topo-links">
        {ITENS.filter((i) => i.para !== '/importar').map((i) => (
          <Link key={i.para} className="pf-btn-link" to={i.para}>{i.rotulo}</Link>
        ))}
        <button className="pf-btn-link" onClick={onSair}>Sair</button>
      </nav>

      {/* celular */}
      <button
        type="button"
        className={`pf-menu-btn ${aberto ? 'on' : ''}`}
        aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={aberto}
        aria-controls="pf-menu-painel"
        onClick={() => setAberto((v) => !v)}
      >
        <span aria-hidden />
      </button>

      {aberto && (
        <div className="pf-menu-painel" id="pf-menu-painel">
          {ITENS.map((i) => (
            <Link key={i.para} to={i.para}>
              <span aria-hidden><Icone nome={i.icone} size={16} /></span>
              {i.rotulo}
            </Link>
          ))}
          <button type="button" onClick={onSair}>
            <span aria-hidden><Icone nome="sair" size={16} /></span>
            Sair
          </button>
          <span className="pf-menu-selo">beta fechado</span>
        </div>
      )}
    </header>
  );
}
