import { useEffect, useRef, useState } from 'react';
import { desbloquear, subscribeConquistas } from '../data/achievements';

/**
 * Conquistas salvas do usuário + sincronização: o que foi atingido agora e
 * ainda não está gravado é persistido (uma vez por sessão por id).
 */
export function useConquistas(uid: string | null, atingidasAgora: string[]) {
  const [salvas, setSalvas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const gravando = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) {
      setSalvas(new Set());
      setCarregando(false);
      return;
    }
    const unsub = subscribeConquistas(
      uid,
      (l) => {
        setSalvas(new Set(l.map((c) => c.conquistaId)));
        setCarregando(false);
      },
      () => setCarregando(false),
    );
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid || carregando) return;
    for (const id of atingidasAgora) {
      if (salvas.has(id) || gravando.current.has(id)) continue;
      gravando.current.add(id);
      void desbloquear(uid, id).catch(() => gravando.current.delete(id));
    }
  }, [uid, carregando, salvas, atingidasAgora]);

  return { salvas, carregando };
}
