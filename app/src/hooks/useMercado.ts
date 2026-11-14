import { useEffect, useState } from 'react';
import { getMercado, type Mercado } from '../data/mercado';

/** Réguas do mercado (CDI, IPCA), cacheadas por dia. null = sem régua → não comparar. */
export function useMercado(): Mercado | null {
  const [dados, setDados] = useState<Mercado | null>(null);

  useEffect(() => {
    let vivo = true;
    void getMercado().then((d) => {
      if (vivo) setDados(d);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return dados;
}
