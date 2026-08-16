import { Link } from 'react-router-dom';
import type { Decomposicao, FatorFire } from '@pontofire/engine';
import { formatDuracao, formatMesAno } from '../utils/format';

/**
 * O que aquele lançamento fez com a data.
 *
 * Antes, salvar o mês navegava pro painel e nada acontecia — o momento mais
 * anticlimático do app: você reúne os números e não ganha nada de volta. Agora
 * é aqui que o trabalho de lançar se paga.
 *
 * §14: data que atrasa chega sempre com o que mexeu e quanto. Nunca "você
 * gastou demais".
 */

const ROTULO: Record<FatorFire, { adiou: string; antecipou: string }> = {
  patrimonio: {
    adiou: 'seu patrimônio rendeu abaixo do esperado',
    antecipou: 'seu patrimônio rendeu acima do esperado',
  },
  aporte: { adiou: 'seu aporte médio caiu', antecipou: 'seu aporte médio subiu' },
  retorno: { adiou: 'o retorno esperado caiu', antecipou: 'o retorno esperado subiu' },
  meta: { adiou: 'seu custo de vida subiu', antecipou: 'seu custo de vida caiu' },
};

/** Menos de meio mês é ruído de arredondamento, não notícia. */
const RELEVANTE = 0.5;

export function EfeitoDoMes({
  mes,
  dataAntes,
  dataDepois,
  decomposicao,
  desdeAPartida,
  onContinuar,
}: {
  mes: string;
  dataAntes: Date | null;
  dataDepois: Date | null;
  decomposicao: Decomposicao;
  /** meses que a data andou desde o onboarding (negativo = antecipou) */
  desdeAPartida: number | null;
  onContinuar: () => void;
}) {
  const total = decomposicao.total;
  const mexeu = total !== null && Math.abs(total) >= RELEVANTE;

  const causas = decomposicao.contribuicoes
    .filter((c) => Math.abs(c.meses) >= RELEVANTE)
    .sort((a, b) => Math.abs(b.meses) - Math.abs(a.meses));

  return (
    <div className="pf-hero-card" style={{ textAlign: 'center' }}>
      <span className="pf-eyebrow">{rotuloMes(mes)} lançado</span>

      {dataDepois ? (
        <>
          <div className="pf-hc-date" style={{ marginTop: 'var(--space-2)' }}>
            {formatMesAno(dataDepois)}
          </div>
          {mexeu ? (
            <p className="pf-hc-sub">
              sua data {total! > 0 ? 'andou' : 'voltou'}{' '}
              <strong style={{ color: total! > 0 ? 'var(--ember-2)' : 'var(--mint)' }}>
                {formatDuracao(Math.abs(total!))}
              </strong>{' '}
              {total! > 0 ? 'pra frente' : 'pra trás'}
              {dataAntes && ` · era ${formatMesAno(dataAntes)}`}
            </p>
          ) : (
            <p className="pf-hc-sub">sua data não se mexeu — o mês veio dentro do seu padrão</p>
          )}
        </>
      ) : (
        <>
          <div className="pf-hc-date" style={{ color: 'var(--ember-2)', fontSize: 'clamp(22px, 6vw, 32px)' }}>
            sem data ainda
          </div>
          <p className="pf-hc-sub">no ritmo atual a meta não fecha — simular um aporte maior muda o jogo</p>
        </>
      )}

      {mexeu && causas.length > 0 && (
        <ul className="pf-efeito-causas">
          {causas.map((c) => (
            <li key={c.fator}>
              <span className="mono" style={{ color: c.meses > 0 ? 'var(--ember-2)' : 'var(--mint)' }}>
                {c.meses > 0 ? '+' : '−'}
                {formatDuracao(Math.abs(c.meses))}
              </span>
              <span>{ROTULO[c.fator][c.meses > 0 ? 'adiou' : 'antecipou']}</span>
            </li>
          ))}
        </ul>
      )}

      {mexeu && !decomposicao.completa && (
        <p className="pf-hint">
          Não consigo separar o quanto cada coisa pesou desta vez — em alguma combinação a meta não
          fecha, e aí a conta não existe. Prefiro dizer isso a inventar a divisão.
        </p>
      )}

      {desdeAPartida !== null && Math.abs(desdeAPartida) >= 1 && (
        <p
          style={{
            marginTop: 'var(--space-4)',
            color: desdeAPartida < 0 ? 'var(--mint)' : 'var(--muted)',
            fontSize: '0.95rem',
          }}
        >
          Desde que você começou, sua data está{' '}
          <strong>{formatDuracao(Math.abs(desdeAPartida))}</strong>{' '}
          {desdeAPartida < 0 ? 'mais cedo' : 'mais tarde'}.
        </p>
      )}

      <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
        <button className="pf-btn pf-btn-primary" onClick={onContinuar}>
          Ver meu painel
        </button>
        <Link className="pf-btn-link" to={`/detalhar/${mes}`}>
          Detalhar este mês por categoria →
        </Link>
      </div>
    </div>
  );
}

const rotuloMes = (m: string) => formatMesAno(new Date(`${m}-01T00:00:00`));
