import type { SimulacaoCompra } from '@pontofire/engine';
import { formatBRL } from '../utils/format';

/**
 * A "prova" visual: os dois caminhos partem do mesmo dinheiro e da mesma
 * renda. Os DOIS saldos crescem — o que importa é a distância entre eles.
 */
export function GraficoCompra({
  sim,
  parcelas,
  valorParcela,
  rotuloCartao,
}: {
  sim: SimulacaoCompra;
  parcelas: number;
  valorParcela: number;
  rotuloCartao: string;
}) {
  const { serie } = sim;
  if (serie.length < 2) return null;

  const passo = Math.max(1, Math.ceil(serie.length / 14));
  const pontos = serie.filter((_, i) => i % passo === 0 || i === serie.length - 1);
  const max = Math.max(...serie.map((p) => Math.max(p.avista, p.cartao)), 1);
  const alt = (v: number) => `${Math.max(1, (v / max) * 100)}%`;
  const cartaoGanha = sim.vantagemCartao >= 0;

  return (
    <div>
      {/* explica o experimento antes de mostrar o gráfico */}
      <div style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <Cenario
          cor="var(--mint)"
          titulo={rotuloCartao}
          texto={`mantém ${formatBRL(sim.capitalInicial)} rendendo e paga ${formatBRL(valorParcela)}/mês da fatura`}
        />
        <Cenario
          cor="var(--muted)"
          titulo="Pagando no PIX"
          texto={`gasta os ${formatBRL(sim.capitalInicial)} agora e passa a investir ${formatBRL(valorParcela)}/mês`}
        />
      </div>

      <p className="pf-hint" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
        Nos dois casos sai o mesmo dinheiro do seu bolso todo mês. As barras mostram{' '}
        <strong>quanto você tem investido</strong> em cada caminho.
      </p>

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
              title={`Mês ${p.mes} — ${rotuloCartao}: você tem ${formatBRL(p.cartao)} investidos`}
              style={{ flex: 1, height: alt(p.cartao), background: 'var(--mint)', opacity: 0.85, borderRadius: '2px 2px 0 0' }}
            />
            <div
              title={`Mês ${p.mes} — pagando no PIX: você tem ${formatBRL(p.avista)} investidos`}
              style={{ flex: 1, height: alt(p.avista), background: 'var(--muted)', opacity: 0.5, borderRadius: '2px 2px 0 0' }}
            />
          </div>
        ))}
      </div>

      <div className="pf-bar-row">
        <span>hoje</span>
        <span>mês {sim.horizonte}</span>
      </div>

      <div style={{ marginTop: 'var(--space-4)', display: 'grid', gap: 'var(--space-2)' }}>
        <Linha rotulo={`Termina com — ${rotuloCartao.toLowerCase()}`} valor={formatBRL(sim.saldoFinalCartao)} destaque={cartaoGanha} />
        <Linha rotulo="Termina com — pagando no PIX" valor={formatBRL(sim.saldoFinalAVista)} destaque={!cartaoGanha} />
      </div>

      <p className="pf-hint" style={{ marginTop: 'var(--space-3)' }}>
        Depois de {parcelas} {parcelas === 1 ? 'mês' : 'meses'}, quem{' '}
        {cartaoGanha ? 'parcelou' : 'pagou no PIX'} fica com{' '}
        <strong style={{ color: cartaoGanha ? 'var(--mint)' : 'var(--paper)' }}>
          {formatBRL(Math.abs(sim.vantagemCartao))}
        </strong>{' '}
        a mais — o produto é o mesmo, só muda quanto sobra pra você.
      </p>
    </div>
  );
}

function Cenario({ cor, titulo, texto }: { cor: string; titulo: string; texto: string }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: cor, flex: 'none', marginTop: 6 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: '0.92rem' }}>{titulo}</div>
        <div className="pf-hint" style={{ margin: 0 }}>{texto}</div>
      </div>
    </div>
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
