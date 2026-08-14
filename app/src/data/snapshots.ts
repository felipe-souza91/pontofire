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
import { totaisAPreservar, type TotaisDeclarados } from './reconciliacao';

export type { TotaisDeclarados };

/** snapshots/{uid}/meses/{YYYY-MM} — fonte da verdade mensal (§5). */
export interface Snapshot {
  mes: string; // YYYY-MM
  patrimonioTotal: number;
  receitaLiquida: number;
  gastoTotal: number;
  /**
   * Quanto entrou na carteira. DIGITADO pelo usuário (ou somado dos itens).
   *
   * Era `receita − gasto`, o que assumia que tudo que sobrou foi investido. No
   * mês do PPR isso registrava aporte que não aconteceu, e como
   * `rendimentoMes = P − P_anterior − aporte`, o app acusava rendimento
   * negativo justo no mês em que a pessoa ganhou dinheiro.
   */
  aportesMes: number;
  /**
   * false/ausente = veio da subtração antiga, não da mão do usuário.
   *
   * A média móvel do aporte (Fase 3) ignora estes meses: usá-los seria tratar
   * inferência como fato. `gastoTotal` não precisa de flag — sempre foi entrada
   * real.
   */
  aporteObservado?: boolean;
  rendimentosMes: number; // derivado por marcação a mercado
  taxaPoupanca: number; // derivado: (receita − gasto)/receita
  /** derivado: aporte/receita — quanto da renda virou patrimônio */
  taxaInvestimento?: number;
  /** o que o usuário quis lembrar deste mês ("carro quebrou", "entrou PPR") */
  observacao?: string;
  /**
   * Mês fora do padrão — sai das medianas de custo e aporte.
   *
   * É o usuário curando o próprio histórico: a viagem do ano não pode virar
   * rotina, nem o PPR inflar o aporte médio.
   */
  atipico?: boolean;
  rendaPassiva?: number; // soma das transações do tipo passiva (modo detalhado) → R
  /** presente só enquanto os totais vêm dos itens; é o caminho de volta */
  declarado?: TotaisDeclarados;
  /**
   * A data FIRE como estava quando ESTE mês foi lançado. null = inalcançável.
   *
   * Gravada no momento do lançamento e nunca recalculada: é registro histórico,
   * não valor derivado. Recalcular retroativamente quando o perfil muda
   * apagaria justamente a trajetória que o gráfico existe pra mostrar.
   */
  mesesAteFire?: number | null;
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
 * Passa a usar o que os itens somam, preservando os totais do modo rápido.
 *
 * `declarado` só é gravado na PRIMEIRA vez: se o usuário adotar os itens, mexer
 * neles e adotar de novo, o caminho de volta continua sendo o número que ele
 * digitou — não o penúltimo derivado.
 */
export async function adotarTotaisDosItens(
  uid: string,
  snap: Snapshot,
  novo: TotaisDeclarados,
): Promise<void> {
  await atualizarSnapshot(uid, snap.mes, { ...novo, declarado: totaisAPreservar(snap) });
}

/** Volta aos totais do modo rápido e esquece o desvio. */
export async function voltarAoDeclarado(uid: string, mes: string, declarado: TotaisDeclarados): Promise<void> {
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
