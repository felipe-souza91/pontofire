import { Icone, type NomeIcone } from '../theme/Icone';
import type { CardSemana as Card, CategoriaSemana, Parte } from '@pontofire/insights';

const ESTILO: Record<CategoriaSemana, { icone: NomeIcone; cor: string; borda: string; fundo: string }> = {
  retrato: {
    icone: 'barras',
    cor: 'var(--ember-2)',
    borda: 'color-mix(in srgb, var(--ember) 28%, transparent)',
    fundo: 'linear-gradient(140deg, color-mix(in srgb, var(--ember) 9%, transparent), color-mix(in srgb, var(--ember) 1.5%, transparent))',
  },
  dica: {
    icone: 'lampada',
    cor: 'var(--mint)',
    borda: 'color-mix(in srgb, var(--mint) 28%, transparent)',
    fundo: 'linear-gradient(140deg, color-mix(in srgb, var(--mint) 9%, transparent), color-mix(in srgb, var(--mint) 1.5%, transparent))',
  },
  humano: {
    icone: 'chama',
    cor: 'var(--ember-2)',
    borda: 'color-mix(in srgb, var(--ember) 34%, transparent)',
    fundo: 'linear-gradient(140deg, color-mix(in srgb, var(--ember) 13%, transparent), color-mix(in srgb, var(--ember) 2%, transparent))',
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
