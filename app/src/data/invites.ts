import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';

/** invites/{uid} — doc único por usuário (§5). */
export interface Convite {
  codigo: string;
  convidadosConvertidos?: number;
  /** quantos convites o usuário tem no beta */
  total?: number;
}

export const CONVITES_NO_BETA = 3;

function ref(uid: string) {
  return doc(db, 'invites', uid);
}

function gerarCodigo(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Garante que o usuário tem um código (cria na 1ª visita). */
export async function garantirConvite(uid: string): Promise<void> {
  const snap = await getDoc(ref(uid));
  if (snap.exists()) return;
  await setDoc(ref(uid), {
    codigo: gerarCodigo(),
    convidadosConvertidos: 0,
    total: CONVITES_NO_BETA,
    criadoEm: serverTimestamp(),
  });
}

export function subscribeConvite(
  uid: string,
  cb: (c: Convite | null) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    ref(uid),
    (s) => cb(s.exists() ? (s.data() as Convite) : null),
    (e) => onError?.(e),
  );
}

/** Link de indicação — cai na landing com ?c=CODIGO (a landing já lê isso). */
export function linkDeConvite(codigo: string): string {
  const origem = typeof window !== 'undefined' ? window.location.origin : 'https://pontofire.com.br';
  return `${origem}/?c=${codigo}`;
}
