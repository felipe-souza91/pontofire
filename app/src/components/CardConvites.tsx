import { useEffect, useState } from 'react';
import { CONVITES_NO_BETA, garantirConvite, linkDeConvite, subscribeConvite, type Convite } from '../data/invites';

/** Convites do beta (viral) — 3 por usuário, com link de indicação. */
export function CardConvites({ uid }: { uid: string }) {
  const [convite, setConvite] = useState<Convite | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    void garantirConvite(uid).catch(() => {});
    return subscribeConvite(uid, setConvite, () => {});
  }, [uid]);

  if (!convite) return null;

  const link = linkDeConvite(convite.codigo);
  const total = convite.total ?? CONVITES_NO_BETA;
  const usados = convite.convidadosConvertidos ?? 0;
  const restantes = Math.max(0, total - usados);

  async function compartilhar() {
    const texto = `Descobri a data exata da minha independência financeira no Ponto FIRE. Te dei um convite do beta:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ponto FIRE', text: texto, url: link });
        return;
      } catch {
        /* usuário cancelou: cai no copiar */
      }
    }
    try {
      await navigator.clipboard.writeText(`${texto} ${link}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* clipboard bloqueado: o link fica visível na tela mesmo */
    }
  }

  return (
    <section className="pf-hero-card">
      <span className="pf-eyebrow">Seus convites</span>
      <p className="pf-hc-sub" style={{ marginTop: 'var(--space-2)' }}>
        {restantes > 0
          ? `Você tem ${restantes} de ${total} convites do beta pra dar.`
          : 'Seus convites do beta já foram usados. Obrigado por espalhar. '}
      </p>

      <div
        className="mono"
        style={{
          background: 'var(--ink)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--radius)',
          padding: '0.7rem 0.9rem',
          fontSize: '0.85rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          color: 'var(--muted)',
        }}
      >
        {link}
      </div>

      <button className="pf-btn pf-btn-primary" style={{ marginTop: 'var(--space-3)' }} onClick={() => void compartilhar()}>
        {copiado ? 'Link copiado!' : 'Compartilhar convite'}
      </button>

      {usados > 0 && (
        <p className="pf-hint" style={{ marginTop: 'var(--space-3)' }}>
          {usados} {usados === 1 ? 'pessoa entrou' : 'pessoas entraram'} pelo seu link.
        </p>
      )}
    </section>
  );
}
