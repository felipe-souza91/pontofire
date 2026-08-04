import { useIndicadores } from '../hooks/useIndicadores';
import type { UserDoc } from '../data/types';

const pct = (v: number, casas = 2) => `${v.toFixed(casas).replace('.', ',')}%`;

/**
 * Cenário econômico (§9) — informa o indicador e o impacto MECÂNICO.
 * Não dá recomendação de investimento (risco regulatório CVM).
 */
export function CardEconomico({ doc }: { doc: UserDoc }) {
  const ind = useIndicadores();
  if (!ind) return null; // sem dados: simplesmente não aparece

  const meuReal = doc.retornoRealEsperado * 100;
  const diff = ind.juroReal !== null ? meuReal - ind.juroReal : null;

  return (
    <section className="pf-hero-card">
      <span className="pf-eyebrow">Cenário econômico</span>

      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
        {ind.selicMeta !== null && <Item rot="Selic" val={pct(ind.selicMeta)} />}
        {ind.ipca12m !== null && <Item rot="IPCA 12m" val={pct(ind.ipca12m)} />}
        {ind.juroReal !== null && <Item rot="Juro real" val={pct(ind.juroReal)} tom="mint" />}
      </div>

      {diff !== null && (
        <p className="pf-hint" style={{ marginTop: 'var(--space-4)' }}>
          {diff > 1.5 ? (
            <>
              Você projeta <strong>{pct(meuReal, 1)}</strong> de retorno real, e o juro real da renda
              fixa hoje está em <strong>{pct(ind.juroReal!, 1)}</strong>. Sua data assume que você
              rende acima disso — vale checar se o cenário se sustenta.
            </>
          ) : diff < -1.5 ? (
            <>
              Você projeta <strong>{pct(meuReal, 1)}</strong>, abaixo do juro real de hoje (
              <strong>{pct(ind.juroReal!, 1)}</strong>). Sua data está sendo conservadora.
            </>
          ) : (
            <>
              Sua projeção de <strong>{pct(meuReal, 1)}</strong> está alinhada ao juro real de hoje (
              <strong>{pct(ind.juroReal!, 1)}</strong>).
            </>
          )}
        </p>
      )}

      <p className="pf-hint" style={{ marginTop: 'var(--space-2)', opacity: 0.75 }}>
        Fonte: Banco Central (SGS). Informativo — não é recomendação de investimento.
      </p>
    </section>
  );
}

function Item({ rot, val, tom }: { rot: string; val: string; tom?: 'mint' }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
        {rot}
      </div>
      <div className="mono" style={{ fontWeight: 700, fontSize: '1.15rem', marginTop: 4, color: tom === 'mint' ? 'var(--mint)' : 'var(--paper)' }}>
        {val}
      </div>
    </div>
  );
}
