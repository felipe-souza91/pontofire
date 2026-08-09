import { collection, doc, getDocs, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { MemoriaCategoria } from '@pontofire/importer';

/**
 * Memória memo→categoria (§ decisão do M5).
 *
 * Toda vez que o usuário corrige uma categoria na revisão, a correção vira
 * regra. Na próxima importação o mesmo estabelecimento já vem classificado —
 * é o que faz o importador melhorar com o uso em vez de cobrar o mesmo
 * trabalho todo mês.
 *
 * `importRules/{uid}/itens/{chave}` — a própria chave do estabelecimento é o
 * id do documento, então reclassificar sobrescreve em vez de acumular lixo.
 */

export interface RegraSalva extends MemoriaCategoria {
  usos: number;
}

function regrasRef(uid: string) {
  return collection(db, 'importRules', uid, 'itens');
}

/** Firestore não aceita '/' no id do documento. */
function idSeguro(chave: string): string {
  return encodeURIComponent(chave).replace(/\./g, '%2E').slice(0, 400) || 'SEM_CHAVE';
}

export async function carregarMemoria(uid: string): Promise<RegraSalva[]> {
  const snap = await getDocs(regrasRef(uid));
  return snap.docs
    .map((d) => d.data() as Partial<RegraSalva>)
    .filter((r): r is RegraSalva => Boolean(r.chave && r.categoria && r.tipo))
    .map((r) => ({ ...r, usos: r.usos ?? 1 }));
}

/**
 * Ensina as regras deste import. Chamado depois do salvamento, com o que o
 * usuário efetivamente aprovou — não com o palpite do parser.
 */
export async function ensinarRegras(uid: string, regras: readonly MemoriaCategoria[]): Promise<void> {
  const unicas = new Map<string, MemoriaCategoria>();
  for (const r of regras) {
    if (r.chave && r.categoria) unicas.set(r.chave, r);
  }
  if (!unicas.size) return;

  const ref = regrasRef(uid);
  const lista = [...unicas.values()];
  for (let i = 0; i < lista.length; i += 400) {
    const batch = writeBatch(db);
    for (const r of lista.slice(i, i + 400)) {
      batch.set(
        doc(ref, idSeguro(r.chave)),
        { ...r, usos: increment(1), atualizadoEm: serverTimestamp() },
        { merge: true },
      );
    }
    await batch.commit();
  }
}
