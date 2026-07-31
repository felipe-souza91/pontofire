import { useEffect, useState } from 'react';
import { subscribeUserDoc } from '../data/users';
import type { UserDoc } from '../data/types';

export interface EstadoUserDoc {
  doc: UserDoc | null;
  carregando: boolean;
}

/** Assina o doc users/{uid} em tempo real. uid null → estado vazio. */
export function useUserDoc(uid: string | null): EstadoUserDoc {
  const [doc, setDoc] = useState<UserDoc | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!uid) {
      setDoc(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const unsub = subscribeUserDoc(uid, (d) => {
      setDoc(d);
      setCarregando(false);
    });
    return unsub;
  }, [uid]);

  return { doc, carregando };
}
