import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
// a aritmética pura mora em reconciliacao.ts (sem Firestore, testável direto)
import { trioAPreservar, type TrioDeclarado } from './reconciliacao';

export type { TrioDeclarado };

/** snapshots/{uid}/meses/{YYYY-MM} — fonte da verdade mensal (§5). */
export interface Snapshot {
  mes: string; // YYYY-MM
  patrimonioTotal: number;
  receitaLiquida: number;
  gastoTotal: number;
  aportesMes: number; // derivado: receita − gasto (sobra investida)
  rendimentosMes: number; // derivado por marcação a mercado
  taxaPoupanca: number; // derivado: (receita − gasto)/receita
  rendaPassiva?: number; // soma das transações do tipo passiva (modo detalhado) → R
  /** presente só enquanto os totais vêm dos itens; é o caminho de volta */
  declarado?: TrioDeclarado;
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

/** Atualização parcial de um snapshot (ex.: gravar rendaPassiva derivada). */
export async function atualizarSnapshot(uid: string, mes: string, patch: Partial<Snapshot>): Promise<void> {
  await setDoc(
    doc(db, 'snapshots', uid, 'meses', mes),
    { ...patch, atualizadoEm: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Passa a usar o que os itens somam, preservando o trio do modo rápido.
 *
 * `declarado` só é gravado na PRIMEIRA vez: se o usuário adotar os itens, mexer
 * neles e adotar de novo, o caminho de volta continua sendo o número que ele
 * digitou — não o penúltimo derivado.
 */
export async function adotarTotaisDosItens(
  uid: string,
  snap: Snapshot,
  novo: TrioDeclarado,
): Promise<void> {
  await atualizarSnapshot(uid, snap.mes, { ...novo, declarado: trioAPreservar(snap) });
}

/** Volta ao trio do modo rápido e esquece o desvio. */
export async function voltarAoDeclarado(uid: string, mes: string, declarado: TrioDeclarado): Promise<void> {
  await setDoc(
    doc(db, 'snapshots', uid, 'meses', mes),
    { ...declarado, rendaPassiva: 0, declarado: deleteField(), atualizadoEm: serverTimestamp() },
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
