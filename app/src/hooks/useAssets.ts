import { useEffect, useState } from 'react';
import { subscribeAssets, type AssetDoc } from '../data/assets';

/** Assina os bens do usuário. */
export function useAssets(uid: string | null): { lista: AssetDoc[]; carregando: boolean } {
  const [lista, setLista] = useState<AssetDoc[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLista([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const unsub = subscribeAssets(
      uid,
      (l) => {
        setLista(l);
        setCarregando(false);
      },
      () => setCarregando(false),
    );
    return unsub;
  }, [uid]);

  return { lista, carregando };
}
