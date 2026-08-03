import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/** tipo fechado (§ decisão): renda ativa, renda passiva, aporte, despesa. */
export type TipoTransacao = 'ativa' | 'passiva' | 'aporte' | 'saida';

export interface Transacao {
  id: string;
  mes: string; // YYYY-MM
  tipo: TipoTransacao;
  categoria: string; // livre
  valor: number;
  descricao?: string;
  origem: 'manual' | 'import';
}

export const ROTULO_TIPO: Record<TipoTransacao, string> = {
  ativa: 'Receita ativa',
  passiva: 'Renda passiva',
  aporte: 'Aporte',
  saida: 'Despesa',
};

function itensRef(uid: string) {
  return collection(db, 'transactions', uid, 'itens');
}

export async function adicionarTransacao(uid: string, t: Omit<Transacao, 'id'>): Promise<void> {
  await addDoc(itensRef(uid), { ...t, criadoEm: serverTimestamp() });
}

export async function removerTransacao(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'transactions', uid, 'itens', id));
}

/** Itens de um mês (filtro por igualdade — sem índice composto). */
export function subscribeTransacoes(
  uid: string,
  mes: string,
  cb: (lista: Transacao[]) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(itensRef(uid), where('mes', '==', mes)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Transacao, 'id'>) }))),
    (e) => onError?.(e),
  );
}
