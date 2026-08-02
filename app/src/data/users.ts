import {
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { OnboardingN1, OnboardingN2, UserDoc } from './types';

/** Versão do texto de consentimento LGPD aceito. */
export const VERSAO_CONSENTIMENTO = '2026-07';

function userRef(uid: string) {
  return doc(db, 'users', uid);
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

/** Assina o doc do usuário em tempo real (null enquanto não existe). */
export function subscribeUserDoc(
  uid: string,
  cb: (doc: UserDoc | null) => void,
  onError?: (erro: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    userRef(uid),
    (snap) => cb(snap.exists() ? (snap.data() as UserDoc) : null),
    (erro) => onError?.(erro),
  );
}

/**
 * Grava o Nível 1 do onboarding — cria o doc do usuário com o núcleo do motor.
 * merge:true para não apagar campos já existentes numa segunda passada.
 */
export async function salvarOnboardingN1(uid: string, n1: OnboardingN1): Promise<void> {
  const patch: Record<string, unknown> = {
    custoVidaMensal: n1.custoVidaMensal,
    aporteMensal: n1.aporteMensal,
    patrimonioInicial: n1.patrimonioInicial,
    metaFire: n1.metaFire,
    retornoRealEsperado: n1.retornoRealEsperado,
    taxaSaqueSegura: n1.taxaSaqueSegura,
    plano: 'free',
    onboardingNivel: 1,
    onboardingCompleto: false,
    // consentimento é pré-requisito do N1 (coletamos dado financeiro).
    consentimentoLgpd: { aceitoEm: new Date().toISOString(), versao: VERSAO_CONSENTIMENTO },
    atualizadoEm: serverTimestamp(),
  };
  // só marca criadoEm se ainda não existe
  const atual = await getDoc(userRef(uid));
  if (!atual.exists()) patch.criadoEm = serverTimestamp();
  await setDoc(userRef(uid), patch, { merge: true });
}

/** Grava o Nível 2 (enriquecimento) e conclui o onboarding. */
export async function salvarOnboardingN2(uid: string, n2: OnboardingN2): Promise<void> {
  const patch: Record<string, unknown> = {
    onboardingNivel: 2,
    onboardingCompleto: true,
    atualizadoEm: serverTimestamp(),
  };
  // grava só os campos preenchidos (não sobrescreve com vazio)
  for (const [k, v] of Object.entries(n2)) {
    if (v === undefined || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    patch[k] = v;
  }
  await setDoc(userRef(uid), patch, { merge: true });
}

/**
 * Atualiza campos do perfil (edição pós-onboarding). Faz merge; campos com
 * valor "vazio" (undefined) são removidos com deleteField para não sujar o doc.
 */
export async function atualizarPerfil(uid: string, patch: Partial<UserDoc>): Promise<void> {
  const dados: Record<string, unknown> = { atualizadoEm: serverTimestamp() };
  for (const [k, v] of Object.entries(patch)) {
    dados[k] = v === undefined ? deleteField() : v;
  }
  await setDoc(userRef(uid), dados, { merge: true });
}

/** Conclui o onboarding pulando o N2 (usuário optou por "depois"). */
export async function concluirSemN2(uid: string): Promise<void> {
  await setDoc(
    userRef(uid),
    { onboardingCompleto: true, atualizadoEm: serverTimestamp() },
    { merge: true },
  );
}
