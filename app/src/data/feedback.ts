import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type TipoFeedback = 'ideia' | 'problema' | 'elogio' | 'outro';

export const ROTULO_FEEDBACK: Record<TipoFeedback, string> = {
  ideia: '💡 Ideia',
  problema: '🐛 Problema',
  elogio: '❤️ Elogio',
  outro: '💬 Outro',
};

/**
 * Feedback de MÃO ÚNICA (decisão do plano): o usuário envia, o app agradece.
 * Não há thread de resposta — a leitura acontece no painel do admin.
 * As regras permitem create para logado e negam read/update/delete.
 */
export async function enviarFeedback(
  tipo: TipoFeedback,
  texto: string,
  contexto: { rota: string; versao: string; plano: string },
): Promise<void> {
  await addDoc(collection(db, 'feedback'), {
    tipo,
    texto: texto.trim(),
    ...contexto,
    created: serverTimestamp(),
  });
}
