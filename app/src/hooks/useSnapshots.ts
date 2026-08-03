import { useEffect, useState } from 'react';
import { subscribeSnapshots, type Snapshot } from '../data/snapshots';

export interface EstadoSnapshots {
  lista: Snapshot[];
  carregando: boolean;
}

/** Assina os snapshots mensais do usuário (ordem cronológica). */
export function useSnapshots(uid: string | null): EstadoSnapshots {
  const [lista, setLista] = useState<Snapshot[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLista([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const unsub = subscribeSnapshots(
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
