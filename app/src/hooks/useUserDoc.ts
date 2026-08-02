import { useEffect, useState } from 'react';
import { subscribeUserDoc } from '../data/users';
import type { UserDoc } from '../data/types';

export interface EstadoUserDoc {
  doc: UserDoc | null;
  carregando: boolean;
  /** código do erro do Firestore (ex. permission-denied), se houver */
  erro: string | null;
}

/** Assina o doc users/{uid} em tempo real. uid null → estado vazio. */
export function useUserDoc(uid: string | null): EstadoUserDoc {
  const [doc, setDoc] = useState<UserDoc | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setDoc(null);
      setCarregando(false);
      setErro(null);
      return;
    }
    setCarregando(true);
    setErro(null);
    const unsub = subscribeUserDoc(
      uid,
      (d) => {
        setDoc(d);
        setCarregando(false);
      },
      (e) => {
        // não trava mais no loading: registra o erro e libera a tela
        console.error('[useUserDoc]', e);
        setErro((e as { code?: string })?.code ?? 'erro-desconhecido');
        setCarregando(false);
      },
    );
    return unsub;
  }, [uid]);

  return { doc, carregando, erro };
}
