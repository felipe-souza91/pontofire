import { useMemo } from 'react';
import { estimarINSS, type PlanoFire } from '@pontofire/engine';
import type { UserDoc } from '../data/types';
import { formatBRL, formatMesAno } from '../utils/format';

/**
 * INSS vs. Liberdade (§8) — o choque de realidade.
 * É ESTIMATIVA: deixa isso explícito e manda conferir no Meu INSS.
 */
export function CardINSS({ doc, plano }: { doc: UserDoc; plano: PlanoFire }) {
  const est = useMemo(() => {
    if (!doc.dataNascimento || !doc.inicioContribuicao || !doc.salario || !doc.sexoINSS) return null;
    return estimarINSS({
      dataNascimento: doc.dataNascimento,
      inicioContribuicao: doc.inicioContribuicao,
      salarioBruto: doc.salario,
      sexo: doc.sexoINSS,
    });
  }, [doc]);

  if (!est) {
    return (
      <section className="pf-hero-card">
        <span className="pf-eyebrow">INSS vs. sua liberdade</span>
        <p className="pf-hc-sub" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
          Complete nascimento, início das contribuições, salário e a regra do INSS no seu perfil pra
          ver essa comparação.
        </p>
      </section>
    );
  }

  const fireAntes = plano.status === 'ok' && plano.idadeNaLiberdade !== null
    ? Math.round(est.idadeElegivel) - Math.round(plano.idadeNaLiberdade)
    : null;

  return (
    <section className="pf-hero-card">
      <span className="pf-eyebrow">INSS vs. sua liberdade</span>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        {/* INSS */}
        <div>
          <div className="mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>
            Pelo INSS
          </div>
          <div className="mono" style={{ fontWeight: 700, fontSize: '1.3rem', marginTop: 6 }}>
            {formatBRL(est.beneficioEstimado)}
          </div>
          <div className="pf-hint" style={{ margin: '2px 0 0' }}>
            por mês, aos {Math.round(est.idadeElegivel)} anos
            <br />
            ({formatMesAno(est.dataElegivel)})
          </div>
        </div>

        {/* FIRE */}
        <div>
          <div className="mono" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ember-2)' }}>
            Pelo Ponto FIRE
          </div>
          <div className="mono" style={{ fontWeight: 700, fontSize: '1.3rem', marginTop: 6, color: 'var(--mint)' }}>
            {formatBRL(plano.saqueMensalSustentavel)}
          </div>
          <div className="pf-hint" style={{ margin: '2px 0 0' }}>
            {plano.status === 'ok' && plano.dataLiberdade ? (
              <>
                por mês
                {plano.idadeNaLiberdade !== null && `, aos ${Math.round(plano.idadeNaLiberdade)} anos`}
                <br />({formatMesAno(plano.dataLiberdade)})
              </>
            ) : plano.status === 'atingido' ? (
              'por mês — você já chegou lá'
            ) : (
              'por mês, quando a meta fechar'
            )}
          </div>
        </div>
      </div>

      {/* o gancho */}
      {fireAntes !== null && fireAntes > 0 && (
        <p style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
          Sua liberdade chega <span style={{ color: 'var(--mint)' }}>{fireAntes} anos antes</span> da
          aposentadoria do INSS.
        </p>
      )}
      {est.limitadoAoTeto || est.mediaEstimada >= 8475 ? (
        <p className="pf-hint" style={{ marginTop: 'var(--space-2)' }}>
          Seu salário está acima do teto do INSS — por mais que você ganhe, o benefício para no teto.
        </p>
      ) : null}

      <p className="pf-hint" style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--line)', paddingTop: 'var(--space-3)' }}>
        ⓘ <strong>Estimativa</strong>, não promessa. Usamos seu salário atual como proxy da média —
        o INSS considera todas as contribuições desde jul/1994 corrigidas. Confira o valor oficial no{' '}
        <a href="https://meu.inss.gov.br" target="_blank" rel="noreferrer">Meu INSS</a>.
      </p>
    </section>
  );
}
