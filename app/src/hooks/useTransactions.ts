import { useEffect, useState } from 'react';
import { subscribeTransacoes, type Transacao } from '../data/transactions';

/** Assina as transações de um mês. */
export function useTransactions(uid: string | null, mes: string): { lista: Transacao[]; carregando: boolean } {
  const [lista, setLista] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLista([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const unsub = subscribeTransacoes(
      uid,
      mes,
      (l) => {
        setLista(l);
        setCarregando(false);
      },
      () => setCarregando(false),
    );
    return unsub;
  }, [uid, mes]);

  return { lista, carregando };
}
