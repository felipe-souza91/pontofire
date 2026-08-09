import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
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
  /** YYYY-MM-DD — só o import sabe o dia; lançamento manual fica sem. */
  data?: string;
  /** impressão digital (data|valor|estabelecimento) — dedupe entre importações */
  impressao?: string;
  /** id único do banco, quando o arquivo trouxe (OFX) */
  fitid?: string;
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

/** Limite do Firestore por batch é 500; 400 deixa folga. */
const LOTE = 400;

/** Grava as transações aprovadas na revisão do import, em lotes. */
export async function salvarTransacoesEmLote(
  uid: string,
  itens: readonly Omit<Transacao, 'id'>[],
  aoProgredir?: (feitos: number, total: number) => void,
): Promise<void> {
  const ref = itensRef(uid);
  for (let i = 0; i < itens.length; i += LOTE) {
    const fatia = itens.slice(i, i + LOTE);
    const batch = writeBatch(db);
    for (const t of fatia) batch.set(doc(ref), { ...t, criadoEm: serverTimestamp() });
    await batch.commit();
    aoProgredir?.(Math.min(i + LOTE, itens.length), itens.length);
  }
}

/**
 * Impressões digitais já salvas nos meses tocados pelo arquivo — é o que
 * permite reimportar o mesmo extrato sem duplicar nada.
 * O `in` do Firestore aceita até 30 valores; mais que isso vai em fatias.
 */
export async function buscarImpressoes(
  uid: string,
  meses: readonly string[],
): Promise<{ impressao?: string; fitid?: string }[]> {
  const out: { impressao?: string; fitid?: string }[] = [];
  for (let i = 0; i < meses.length; i += 30) {
    const fatia = meses.slice(i, i + 30);
    if (!fatia.length) continue;
    const snap = await getDocs(query(itensRef(uid), where('mes', 'in', fatia)));
    for (const d of snap.docs) {
      const t = d.data() as Partial<Transacao>;
      if (t.impressao || t.fitid) out.push({ impressao: t.impressao, fitid: t.fitid });
    }
  }
  return out;
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
