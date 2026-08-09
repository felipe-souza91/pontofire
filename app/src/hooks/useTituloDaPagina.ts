import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITULOS: Record<string, string> = {
  '/': 'Início',
  '/entrar': 'Entrar',
  '/onboarding': 'Vamos achar sua data',
  '/perfil': 'Meu perfil',
  '/lancar': 'Lançar mês',
  '/bens': 'Meus bens',
  '/conquistas': 'Conquistas',
  '/ferramentas': 'Ferramentas',
};

/** Mantém o <title> coerente com a rota (acessibilidade e histórico). */
export function useTituloDaPagina(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    const base = 'Ponto FIRE';
    const secao =
      TITULOS[pathname] ?? (pathname.startsWith('/detalhar/') ? 'Detalhar mês' : undefined);
    document.title = secao ? `${secao} · ${base}` : base;
  }, [pathname]);
}
