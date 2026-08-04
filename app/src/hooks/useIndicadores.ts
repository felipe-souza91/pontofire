import { useEffect, useState } from 'react';
import { getIndicadores, type Indicadores } from '../data/indicadores';

/** Indicadores do BACEN (cacheados). null = sem dados → não exibir o card. */
export function useIndicadores(): Indicadores | null {
  const [dados, setDados] = useState<Indicadores | null>(null);

  useEffect(() => {
    let vivo = true;
    void getIndicadores().then((d) => {
      if (vivo) setDados(d);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return dados;
}
