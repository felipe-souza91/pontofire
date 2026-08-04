import type { SimulacaoCompra } from '@pontofire/engine';
import { formatBRL } from '../utils/format';

/**
 * A "prova" visual: barras mês a mês do dinheiro que sobra em cada caminho.
 * Verde = quem mantém o dinheiro rendendo e paga as parcelas dele.
 * Cinza = quem pagou à vista e ficou com o troco rendendo.
 */
export function GraficoCompra({
  sim,
  parcelas,
  rotuloCartao,
}: {
  sim: SimulacaoCompra;
  parcelas: number;
  rotuloCartao: string;
}) {
  const { serie } = sim;
  if (serie.length < 2) return null;

  // amostra até ~14 colunas pra não virar sopa de barras
  const passo = Math.max(1, Math.ceil(serie.length / 14));
  const pontos = serie.filter((_, i) => i % passo === 0 || i === serie.length - 1);

  const max = Math.max(...serie.map((p) => Math.max(p.avista, p.cartao)), 1);
  const alt = (v: number) => `${Math.max(0, (v / max) * 100)}%`;
  const cartaoGanha = sim.vantagemCartao >= 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
        <Legenda cor="var(--mint)" texto={rotuloCartao} />
        <Legenda cor="var(--muted)" texto="PIX à vista (troco rendendo)" />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '3px',
          height: 130,
          padding: '0 2px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {pontos.map((p) => (
          <div key={p.mes} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100%' }}>
            <div
              title={`mês ${p.mes} · ${rotuloCartao}: ${formatBRL(p.cartao)}`}
              style={{ flex: 1, height: alt(p.cartao), background: 'var(--mint)', opacity: 0.85, borderRadius: '2px 2px 0 0' }}
            />
            <div
              title={`mês ${p.mes} · à vista: ${formatBRL(p.avista)}`}
              style={{ flex: 1, height: alt(p.avista), background: 'var(--muted)', opacity: 0.45, borderRadius: '2px 2px 0 0' }}
            />
          </div>
        ))}
      </div>

      <div className="pf-bar-row">
        <span>mês 0</span>
        <span>mês {sim.horizonte}</span>
      </div>

      <div style={{ marginTop: 'var(--space-4)', display: 'grid', gap: 'var(--space-2)' }}>
        <Linha rotulo={`Sobra ${rotuloCartao.toLowerCase()}`} valor={formatBRL(sim.saldoFinalCartao)} destaque={cartaoGanha} />
        <Linha rotulo="Sobra pagando no PIX" valor={formatBRL(sim.saldoFinalAVista)} destaque={!cartaoGanha} />
      </div>

      <p className="pf-hint" style={{ marginTop: 'var(--space-3)' }}>
        Nos dois caminhos você parte dos mesmos {formatBRL(sim.capitalInicial)}. Ao fim das {parcelas}{' '}
        parcelas, quem {cartaoGanha ? 'parcelou' : 'pagou à vista'} termina com{' '}
        <strong style={{ color: cartaoGanha ? 'var(--mint)' : 'var(--paper)' }}>
          {formatBRL(Math.abs(sim.vantagemCartao))}
        </strong>{' '}
        a mais no bolso.
      </p>
    </div>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--muted)' }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: cor, display: 'inline-block' }} />
      {texto}
    </span>
  );
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
      <span style={{ color: 'var(--muted)' }}>{rotulo}</span>
      <span className="mono" style={{ color: destaque ? 'var(--mint)' : 'var(--paper)', fontWeight: destaque ? 700 : 400 }}>
        {valor}
      </span>
    </div>
  );
}
