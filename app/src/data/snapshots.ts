import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/** snapshots/{uid}/meses/{YYYY-MM} — fonte da verdade mensal (§5). */
export interface Snapshot {
  mes: string; // YYYY-MM
  patrimonioTotal: number;
  receitaLiquida: number;
  gastoTotal: number;
  aportesMes: number; // derivado: receita − gasto (sobra investida)
  rendimentosMes: number; // derivado por marcação a mercado
  taxaPoupanca: number; // derivado: (receita − gasto)/receita
}

function mesesRef(uid: string) {
  return collection(db, 'snapshots', uid, 'meses');
}

export async function salvarSnapshot(uid: string, snap: Snapshot): Promise<void> {
  await setDoc(
    doc(db, 'snapshots', uid, 'meses', snap.mes),
    { ...snap, atualizadoEm: serverTimestamp() },
    { merge: true },
  );
}

/** Assina os snapshots em ordem cronológica (mes ascendente). */
export function subscribeSnapshots(
  uid: string,
  cb: (lista: Snapshot[]) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(mesesRef(uid), orderBy('mes', 'asc')),
    (snap) => cb(snap.docs.map((d) => d.data() as Snapshot)),
    (e) => onError?.(e),
  );
}
