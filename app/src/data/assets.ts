import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AssetTipo } from '@pontofire/engine';

export interface AssetDoc {
  id: string;
  nome: string;
  tipo: AssetTipo;
  valor: number;
  dividaAssociada?: number;
  geraRenda?: boolean;
  rendaMensal?: number;
  incluirNoFire?: boolean;
}

export const ROTULO_ASSET: Record<AssetTipo, string> = {
  financeiro: 'Financeiro',
  'imovel-uso': 'Imóvel (uso)',
  'imovel-renda': 'Imóvel de renda',
  veiculo: 'Veículo',
  outro: 'Outro',
};

function itensRef(uid: string) {
  return collection(db, 'assets', uid, 'itens');
}

export async function adicionarAsset(uid: string, a: Omit<AssetDoc, 'id'>): Promise<void> {
  await addDoc(itensRef(uid), { ...a, criadoEm: serverTimestamp() });
}

export async function atualizarAsset(uid: string, id: string, patch: Partial<AssetDoc>): Promise<void> {
  await setDoc(doc(db, 'assets', uid, 'itens', id), { ...patch, atualizadoEm: serverTimestamp() }, { merge: true });
}

export async function removerAsset(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'assets', uid, 'itens', id));
}

export function subscribeAssets(
  uid: string,
  cb: (lista: AssetDoc[]) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    itensRef(uid),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AssetDoc, 'id'>) }))),
    (e) => onError?.(e),
  );
}
