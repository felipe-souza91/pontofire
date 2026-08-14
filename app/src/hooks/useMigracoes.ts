import { useEffect, useRef } from 'react';
import { pendencias } from '../data/migracoes';
import { atualizarPerfil } from '../data/users';
import type { UserDoc } from '../data/types';

/**
 * Roda as migrações de conta uma vez por sessão.
 *
 * O `useUserDoc` é ao vivo: escrever o patch faz o doc voltar alterado e o
 * efeito disparar de novo. `pendencias()` já é idempotente e devolveria vazio,
 * mas o `feito` corta o ciclo antes mesmo da leitura — e evita duas escritas se
 * dois snapshots chegarem juntos.
 *
 * Falha em silêncio de propósito: migração que não completou tenta de novo no
 * próximo carregamento, e travar o app por causa dela seria pior que o atraso.
 */
export function useMigracoes(uid: string | null, doc: UserDoc | null): void {
  const feito = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || !doc || !doc.onboardingCompleto) return;
    if (feito.current === uid) return;
    feito.current = uid;

    const patch = pendencias(doc);
    if (!Object.keys(patch).length) return;
    void atualizarPerfil(uid, patch).catch(() => {
      feito.current = null;
    });
  }, [uid, doc]);
}
