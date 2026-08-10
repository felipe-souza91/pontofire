import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';
import { db } from '../lib/firebase';

/**
 * Direitos do titular (LGPD): portabilidade (export), correção/eliminação
 * parcial (reset) e eliminação total (excluir conta).
 *
 * Sem plano Blaze não há Cloud Function com recursiveDelete, então a exclusão
 * roda no CLIENT, em lotes. É mais lenta e não é atômica — se falhar no meio,
 * basta repetir: a operação é idempotente (apaga o que ainda existe).
 */

/** Subcoleções no formato colecao/{uid}/itens (ou /meses). */
const SUBCOLECOES: { colecao: string; sub: string }[] = [
  { colecao: 'snapshots', sub: 'meses' },
  { colecao: 'transactions', sub: 'itens' },
  { colecao: 'assets', sub: 'itens' },
  { colecao: 'achievements', sub: 'itens' },
  { colecao: 'goals', sub: 'itens' },
  // o importador também guarda dado do usuário: as regras que ele ensinou e as
  // transferências dele pra ele mesmo. Ficar de fora daqui seria dado órfão.
  { colecao: 'importRules', sub: 'itens' },
  { colecao: 'transfers', sub: 'itens' },
];

/** Docs únicos por uid. */
const DOCS_DO_USUARIO = ['invites'];

const LOTE = 400; // limite do writeBatch é 500

async function apagarSubcolecao(uid: string, colecao: string, sub: string): Promise<number> {
  const snap = await getDocs(collection(db, colecao, uid, sub));
  if (snap.empty) return 0;

  let apagados = 0;
  for (let i = 0; i < snap.docs.length; i += LOTE) {
    const batch = writeBatch(db);
    for (const d of snap.docs.slice(i, i + LOTE)) batch.delete(d.ref);
    await batch.commit();
    apagados += Math.min(LOTE, snap.docs.length - i);
  }
  return apagados;
}

// ---------------------------------------------------------------------------
// Exportar (portabilidade)
// ---------------------------------------------------------------------------

export interface DadosExportados {
  exportadoEm: string;
  uid: string;
  email: string | null;
  perfil: unknown;
  snapshots: unknown[];
  transacoes: unknown[];
  bens: unknown[];
  conquistas: unknown[];
  convites: unknown;
  regrasDeImportacao: unknown[];
  transferenciasProprias: unknown[];
}

export async function exportarDados(user: User): Promise<DadosExportados> {
  const uid = user.uid;
  const ler = async (colecao: string, sub: string) =>
    (await getDocs(collection(db, colecao, uid, sub))).docs.map((d) => ({ id: d.id, ...d.data() }));

  const perfilSnap = await getDoc(doc(db, 'users', uid));
  const convitesSnap = await getDoc(doc(db, 'invites', uid));

  return {
    exportadoEm: new Date().toISOString(),
    uid,
    email: user.email,
    perfil: perfilSnap.exists() ? perfilSnap.data() : null,
    snapshots: await ler('snapshots', 'meses'),
    transacoes: await ler('transactions', 'itens'),
    bens: await ler('assets', 'itens'),
    conquistas: await ler('achievements', 'itens'),
    convites: convitesSnap.exists() ? convitesSnap.data() : null,
    regrasDeImportacao: await ler('importRules', 'itens'),
    transferenciasProprias: await ler('transfers', 'itens'),
  };
}

/** Dispara o download do JSON no navegador. */
export function baixarJson(dados: unknown, nomeArquivo: string): void {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Resetar (mantém a conta)
// ---------------------------------------------------------------------------

/**
 * Apaga lançamentos, snapshots, bens e conquistas e devolve o usuário ao
 * onboarding. A conta e o login continuam existindo.
 */
export async function resetarDados(uid: string): Promise<void> {
  for (const { colecao, sub } of SUBCOLECOES) {
    await apagarSubcolecao(uid, colecao, sub);
  }
  await setDoc(
    doc(db, 'users', uid),
    { onboardingCompleto: false, onboardingNivel: 0, atualizadoEm: serverTimestamp() },
    { merge: true },
  );
}

// ---------------------------------------------------------------------------
// Excluir conta (eliminação total)
// ---------------------------------------------------------------------------

export class PrecisaReautenticar extends Error {
  constructor() {
    super('Por segurança, confirme seu login para excluir a conta.');
    this.name = 'PrecisaReautenticar';
  }
}

/** Refaz o login (exigido pelo Firebase para operações sensíveis). */
export async function reautenticar(user: User, senha?: string): Promise<void> {
  const provedorGoogle = user.providerData.some((p) => p.providerId === 'google.com');
  if (provedorGoogle) {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    return;
  }
  if (!user.email || !senha) throw new PrecisaReautenticar();
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, senha));
}

/**
 * Apaga TODOS os dados do usuário e a conta de autenticação.
 * Lança `PrecisaReautenticar` se o Firebase exigir login recente.
 */
export async function excluirConta(user: User): Promise<void> {
  const uid = user.uid;

  for (const { colecao, sub } of SUBCOLECOES) {
    await apagarSubcolecao(uid, colecao, sub);
  }
  for (const colecao of DOCS_DO_USUARIO) {
    await deleteDoc(doc(db, colecao, uid)).catch(() => {
      /* pode não existir */
    });
  }
  await deleteDoc(doc(db, 'users', uid)).catch(() => {});

  try {
    await deleteUser(user);
  } catch (e) {
    if ((e as { code?: string })?.code === 'auth/requires-recent-login') {
      throw new PrecisaReautenticar();
    }
    throw e;
  }
}
