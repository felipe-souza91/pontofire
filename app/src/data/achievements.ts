import { collection, doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ConquistaDesbloqueada {
  conquistaId: string;
  desbloqueadoEm?: { seconds: number } | null;
}

function itensRef(uid: string) {
  return collection(db, 'achievements', uid, 'itens');
}

/** Grava a conquista (id do doc = conquistaId → idempotente). */
export async function desbloquear(uid: string, conquistaId: string): Promise<void> {
  await setDoc(
    doc(db, 'achievements', uid, 'itens', conquistaId),
    { conquistaId, desbloqueadoEm: serverTimestamp() },
    { merge: true },
  );
}

export function subscribeConquistas(
  uid: string,
  cb: (lista: ConquistaDesbloqueada[]) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    itensRef(uid),
    (snap) => cb(snap.docs.map((d) => d.data() as ConquistaDesbloqueada)),
    (e) => onError?.(e),
  );
}
