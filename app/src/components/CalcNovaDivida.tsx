import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cabeNoOrcamento, taxaEmbutida, type VeredictoOrcamento } from '@pontofire/engine';
import { useAuth } from '../auth/useAuth';
import { usePainel } from '../hooks/usePainel';
import { MoedaInput } from '../components/MoedaInput';
import { Campo } from '../components/Campo';
import { formatBRL, formatDuracao, formatPct } from '../utils/format';

const ESTILO: Record<VeredictoOrcamento, { rotulo: string; cor: string; borda: string }> = {
  cabe: { rotulo: 'cabe no seu orçamento', cor: 'var(--mint)', borda: 'rgba(63,214,155,.35)' },
  aperta: { rotulo: 'cabe, mas aperta', cor: 'var(--ember-2)', borda: 'rgba(255,122,69,.35)' },
  'nao-cabe': { rotulo: 'não cabe sem cortar', cor: 'var(--ember-2)', borda: 'rgba(255,122,69,.5)' },
};

/**
 * "Essa dívida cabe?" — e, o que nenhuma calculadora de banco responde:
 * quanto ela custa em TEMPO da sua vida.
 *
 * A premissa está à mostra na tela: a parcela sai primeiro do aporte, que é o
 * que sobra. Enquanto a dívida durar, o aporte cai; quitada, volta ao normal.
 * Esse degrau é o que adia a data — e é o número que a ferramenta existe pra
 * mostrar.
 */
export function CalcNovaDivida() {
  const { user } = useAuth();
  const { doc, plano, P, carregando } = usePainel(user?.uid ?? null);

  const [parcela, setParcela] = useState(0);
  const [meses, setMeses] = useState(24);
  const [precoAVista, setPrecoAVista] = useState(0);

  const r = useMemo(() => {
    if (!doc || !plano || parcela <= 0 || meses <= 0) return null;
    return cabeNoOrcamento({
      parcela,
      mesesDaDivida: meses,
      patrimonio: P,
      aporteMensal: doc.aporteMensal,
      custoVidaMensal: doc.custoVidaMensal,
      metaFire: doc.metaFire,
      iMensal: plano.iMensal,
    });
  }, [doc, plano, P, parcela, meses]);

  /** Se ele souber o preço à vista, dá pra revelar o juro escondido. */
  const juroEmbutido = useMemo(() => {
    if (precoAVista <= 0 || parcela <= 0 || meses <= 0) return null;
    const total = parcela * meses;
    if (total <= precoAVista) return null;
    const i = taxaEmbutida(precoAVista, parcela, meses);
    return i === null ? null : { mensal: i, anual: Math.pow(1 + i, 12) - 1, juros: total - precoAVista };
  }, [precoAVista, parcela, meses]);

  if (carregando) return <p className="pf-hint">Carregando seus números…</p>;
  if (!doc || !plano) return <p className="pf-hint">Complete seu perfil pra usar esta calculadora.</p>;

  const est = r ? ESTILO[r.veredicto] : null;

  return (
    <div>
      <p className="pf-hint" style={{ marginTop: 0 }}>
        Pensando em assumir uma parcela nova? Eu comparo com o que sobra no seu mês e digo{' '}
        <strong>quanto tempo de liberdade ela custa</strong>.
      </p>

      <Campo rotulo="Valor da parcela" dica="Quanto vai sair do seu bolso por mês.">
        <MoedaInput value={parcela} onChange={setParcela} />
      </Campo>

      <Campo rotulo="Por quantos meses" dica="O prazo total do financiamento ou do parcelamento.">
        <input
          className="pf-input pf-num"
          type="number"
          min={1}
          max={480}
          value={meses}
          onChange={(e) => setMeses(Math.max(1, Math.min(480, Number(e.target.value) || 1)))}
        />
      </Campo>

      <Campo
        rotulo="Preço à vista"
        opcional
        dica="Se você souber quanto custaria à vista, eu mostro o juro que está embutido nas parcelas."
      >
        <MoedaInput value={precoAVista} onChange={setPrecoAVista} />
      </Campo>

      {r && est && (
        <>
          <section className="pf-hero-card" style={{ marginTop: 'var(--space-6)', borderColor: est.borda }}>
            <span className="pf-eyebrow" style={{ color: est.cor }}>{est.rotulo}</span>

            {r.atrasoMeses !== null && (
              <>
                <div className="pf-hc-date" style={{ color: r.atrasoMeses > 0 ? 'var(--ember-2)' : 'var(--mint)' }}>
                  {r.atrasoMeses > 0 ? `+${formatDuracao(r.atrasoMeses)}` : 'sem atraso'}
                </div>
                <p className="pf-hc-sub" style={{ marginBottom: 'var(--space-4)' }}>
                  {r.atrasoMeses > 0
                    ? 'é o quanto essa dívida adia a sua liberdade'
                    : 'essa parcela não muda a sua data'}
                </p>
              </>
            )}

            <div className="pf-divida-grid">
              <Item rot="Sobra pra aportar" val={formatBRL(Math.max(0, r.aporteDurante))} sub={`hoje são ${formatBRL(doc.aporteMensal)}`} />
              <Item rot="Comprometimento da renda" val={formatPct(r.comprometimento)} sub={r.comprometimento > 0.3 ? 'acima dos 30% que os bancos usam de limite' : 'dentro do limite usual de 30%'} />
              <Item rot="Custo total das parcelas" val={formatBRL(r.custoTotal)} sub={`${meses} × ${formatBRL(parcela)}`} />
            </div>

            {r.veredicto === 'nao-cabe' && (
              <p className="pf-metodo-nota" style={{ color: 'var(--ember-2)', marginBottom: 0 }}>
                A parcela é {formatBRL(r.cortarPorMes)} maior que o que sobra no seu mês. Pra assumir
                essa dívida você precisaria <strong>cortar {formatBRL(r.cortarPorMes)} do padrão de
                vida</strong> — e enquanto ela durar seu aporte fica em zero. O atraso acima já conta
                com isso.
              </p>
            )}
          </section>

          {juroEmbutido && (
            <section className="pf-hero-card" style={{ marginTop: 'var(--space-4)' }}>
              <span className="pf-eyebrow">o juro que não está escrito</span>
              <div className="pf-divida-grid" style={{ marginTop: 'var(--space-3)' }}>
                <Item rot="Taxa embutida" val={`${formatPct(juroEmbutido.mensal, 2)} a.m.`} sub={`${formatPct(juroEmbutido.anual)} ao ano`} />
                <Item rot="Juros que você paga" val={formatBRL(juroEmbutido.juros)} sub={`sobre ${formatBRL(precoAVista)} à vista`} />
              </div>
              <p className="pf-hint" style={{ marginBottom: 0 }}>
                Compare com o seu retorno real de {formatPct(doc.retornoRealEsperado)} ao ano: se a
                taxa embutida for maior, a parcela custa mais do que o seu dinheiro rende.
              </p>
            </section>
          )}

          <p className="pf-hint">
            ⓘ A conta assume que a parcela sai do que você já consegue investir, e que o resto do seu
            mês continua igual. Nenhuma decisão aqui é recomendação — dívida pode ser a escolha certa,
            e o objetivo é você saber o preço antes de assinar.
          </p>
          <Link className="pf-como-calculo" to="/metodologia#divida">como calculo isso →</Link>
        </>
      )}
    </div>
  );
}

function Item({ rot, val, sub }: { rot: string; val: string; sub?: string }) {
  return (
    <div>
      <div className="pf-eco-rot mono">{rot}</div>
      <div className="mono" style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: 4 }}>{val}</div>
      {sub && <div className="pf-eco-periodo">{sub}</div>}
    </div>
  );
}
