import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { TransferenciaSalva } from '@pontofire/importer';

/**
 * Transferências do usuário pra ele mesmo — memória de conciliação.
 *
 * POR QUE ISSO EXISTE EM SEPARADO
 * Elas não são receita nem despesa, então não podem virar `Transacao` (iam
 * poluir os totais do mês). Mas precisam sobreviver à importação: quem recebe
 * no Bradesco e gasta pelo Mercado Pago importa um extrato hoje e o outro
 * amanhã. Guardando as duas pontas, a segunda importação consegue afirmar
 * "isto fecha em zero" em vez de só sumir com os dois lançamentos.
 *
 * `transfers/{uid}/itens/{impressao}` — a impressão digital como id torna a
 * gravação idempotente: reimportar o mesmo extrato não duplica.
 */

function ref(uid: string) {
  return collection(db, 'transfers', uid, 'itens');
}

/** Firestore não aceita '/' no id. */
const idSeguro = (impressao: string) => encodeURIComponent(impressao).replace(/\./g, '%2E').slice(0, 400);

/** Busca as transferências dos meses tocados pelo arquivo, mais folga de 1 mês. */
export async function buscarTransferencias(
  uid: string,
  meses: readonly string[],
): Promise<TransferenciaSalva[]> {
  // a conciliação cruza a virada do mês, então vale trazer o mês vizinho
  const janela = new Set<string>();
  for (const m of meses) {
    janela.add(m);
    janela.add(mesVizinho(m, -1));
    janela.add(mesVizinho(m, +1));
  }

  const out: TransferenciaSalva[] = [];
  const lista = [...janela];
  for (let i = 0; i < lista.length; i += 30) {
    const fatia = lista.slice(i, i + 30);
    if (!fatia.length) continue;
    const snap = await getDocs(query(ref(uid), where('mes', 'in', fatia)));
    for (const d of snap.docs) {
      const t = d.data() as Partial<TransferenciaSalva>;
      if (t.impressao && t.data && typeof t.valor === 'number' && t.sentido) {
        out.push({
          impressao: t.impressao,
          data: t.data,
          valor: t.valor,
          sentido: t.sentido,
          instituicao: t.instituicao,
        });
      }
    }
  }
  return out;
}

/** Grava as transferências próprias deste import (idempotente pela impressão). */
export async function salvarTransferencias(
  uid: string,
  itens: readonly TransferenciaSalva[],
): Promise<void> {
  if (!itens.length) return;
  const colecao = ref(uid);
  for (let i = 0; i < itens.length; i += 400) {
    const batch = writeBatch(db);
    for (const t of itens.slice(i, i + 400)) {
      batch.set(
        doc(colecao, idSeguro(t.impressao)),
        { ...t, mes: t.data.slice(0, 7), criadoEm: serverTimestamp() },
        { merge: true },
      );
    }
    await batch.commit();
  }
}

function mesVizinho(mes: string, delta: number): string {
  const [ano, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(ano ?? 2000, (m ?? 1) - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
