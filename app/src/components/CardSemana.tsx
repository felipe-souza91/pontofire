import { Icone, type NomeIcone } from '../theme/Icone';
import type { CardSemana as Card, CategoriaSemana, Parte } from '@pontofire/insights';

const ESTILO: Record<CategoriaSemana, { icone: NomeIcone; cor: string; borda: string; fundo: string }> = {
  retrato: {
    icone: 'barras',
    cor: 'var(--ember-2)',
    borda: 'rgba(255,122,69,.28)',
    fundo: 'linear-gradient(140deg, rgba(255,122,69,.09), rgba(255,122,69,.015))',
  },
  dica: {
    icone: 'lampada',
    cor: 'var(--mint)',
    borda: 'rgba(63,214,155,.28)',
    fundo: 'linear-gradient(140deg, rgba(63,214,155,.09), rgba(63,214,155,.015))',
  },
  humano: {
    icone: 'chama',
    cor: 'var(--ember-2)',
    borda: 'rgba(255,122,69,.34)',
    fundo: 'linear-gradient(140deg, rgba(255,122,69,.13), rgba(255,122,69,.02))',
  },
};

/**
 * Card da semana — muda sozinho toda segunda-feira (§7).
 * O conteúdo vem do catálogo determinístico em `@pontofire/insights`.
 */
export function CardSemana({ card }: { card: Card | null }) {
  if (!card) return null;
  const s = ESTILO[card.categoria];

  return (
    <section
      className="pf-card-semana"
      style={{ background: s.fundo, border: `1px solid ${s.borda}` }}
    >
      <div className="pf-cs-topo">
        <span className="pf-eyebrow" style={{ color: s.cor }}>
          <Icone nome={s.icone} size={15} /> {card.rotulo}
        </span>
        <span className="pf-cs-selo">card da semana</span>
      </div>

      <p className="pf-cs-texto">
        {card.partes.map((p, i) => (
          <Trecho key={i} parte={p} cor={s.cor} />
        ))}
      </p>

      <div className="pf-cs-rodape">
        {card.fonte ? (
          <span>
            Fonte:{' '}
            {card.link ? (
              <a href={card.link} target="_blank" rel="noreferrer">
                {card.fonte}
              </a>
            ) : (
              card.fonte
            )}
          </span>
        ) : (
          <span />
        )}
        <span>muda toda segunda</span>
      </div>
    </section>
  );
}

function Trecho({ parte, cor }: { parte: Parte; cor: string }) {
  if (typeof parte === 'string') return <>{parte}</>;
  return <span style={{ color: cor, fontWeight: 500 }}>{parte.hl}</span>;
}
