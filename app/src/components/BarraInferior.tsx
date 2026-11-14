import { NavLink, useLocation } from 'react-router-dom';
import { Icone, type NomeIcone } from '../theme/Icone';

const ABAS: { para: string; rotulo: string; icone: NomeIcone }[] = [
  { para: '/', rotulo: 'Início', icone: 'chama' },
  { para: '/lancar', rotulo: 'Lançar', icone: 'lancar' },
  { para: '/importar', rotulo: 'Importar', icone: 'importar' },
  { para: '/conquistas', rotulo: 'Conquistas', icone: 'trofeu' },
  { para: '/perfil', rotulo: 'Perfil', icone: 'engrenagem' },
];

/**
 * Navegação fixa no rodapé — só no celular.
 *
 * O app é um PWA que as pessoas instalam e abrem com uma mão. Até aqui, sair do
 * Início exigia abrir o menu sanduíche lá no topo (dois toques, fora do alcance
 * do polegar), e voltar de qualquer tela era um "← Voltar" também no topo. As
 * cinco coisas que se faz toda semana ficam agora a um toque, onde o dedo está.
 *
 * O menu do topo continua existindo: é onde moram Bens, Ferramentas e Sair, que
 * não são de uso semanal. No desktop esta barra não aparece — lá os links do
 * cabeçalho já estão todos à vista.
 */
export function BarraInferior() {
  const { pathname } = useLocation();
  // o onboarding é um fluxo fechado: oferecer saída no meio é convidar a abandonar
  if (pathname.startsWith('/onboarding')) return null;

  return (
    <nav className="pf-barra" aria-label="Navegação principal">
      {ABAS.map((a) => (
        <NavLink key={a.para} to={a.para} end={a.para === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>
          <Icone nome={a.icone} size={22} />
          <span>{a.rotulo}</span>
        </NavLink>
      ))}
    </nav>
  );
}
