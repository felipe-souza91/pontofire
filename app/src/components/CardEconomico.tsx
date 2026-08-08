import { useIndicadores } from '../hooks/useIndicadores';
import type { UserDoc } from '../data/types';

const pct = (v: number, casas = 2) => `${v.toFixed(casas).replace('.', ',')}%`;

/**
 * Cenário econômico (§9) — informa o indicador e o impacto MECÂNICO.
 * Não dá recomendação de investimento (risco regulatório CVM).
 *
 * Cuidado central deste card: os números aqui são uma FOTO (Selic de hoje,
 * IPCA dos últimos 12 meses), enquanto a projeção do usuário é uma MÉDIA de
 * décadas. Comparar os dois direto empurraria ele a subir a expectativa toda
 * vez que a Selic estivesse em pico de ciclo — que é exatamente quando subir
 * é mais perigoso. Por isso a comparação de verdade é contra o juro real
 * MÉDIO dos últimos anos, e todo rótulo diz de que período está falando.
 */
export function CardEconomico({ doc }: { doc: UserDoc }) {
  const ind = useIndicadores();
  if (!ind) return null; // sem dados: simplesmente não aparece

  const meuReal = doc.retornoRealEsperado * 100;
  // Guarda por TIPO, não por `!== null`: um cache antigo traz o campo como
  // `undefined`, que passaria pela comparação com null e quebraria no toFixed.
  const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const hist = numero(ind.juroRealHistorico) ? ind.juroRealHistorico : null;
  const anos = numero(ind.anosHistorico) ? ind.anosHistorico : null;

  return (
    <section className="pf-hero-card">
      <div className="pf-eco-topo">
        <span className="pf-eyebrow">Cenário econômico</span>
        <span className="pf-eco-selo">foto de hoje</span>
      </div>

      <div className="pf-eco-numeros">
        {numero(ind.selicMeta) && <Item rot="Selic" periodo="meta de hoje" val={pct(ind.selicMeta)} />}
        {numero(ind.ipca12m) && <Item rot="IPCA" periodo="últimos 12 meses" val={pct(ind.ipca12m)} />}
        {numero(ind.juroReal) && (
          <Item rot="Juro real" periodo="hoje, anualizado" val={pct(ind.juroReal)} tom="mint" />
        )}
      </div>

      {/* A comparação justa: longo prazo contra longo prazo. */}
      {hist !== null && anos !== null ? (
        <div className="pf-eco-comparacao">
          <div className="pf-eco-linha">
            <span>Sua projeção (média de longo prazo)</span>
            <strong className="mono">{pct(meuReal, 1)} a.a.</strong>
          </div>
          <div className="pf-eco-linha">
            <span>Juro real médio dos últimos {anos} anos</span>
            <strong className="mono" style={{ color: 'var(--mint)' }}>{pct(hist, 1)} a.a.</strong>
          </div>
          <p className="pf-hint" style={{ marginTop: 'var(--space-3)' }}>
            {leitura(meuReal, hist, numero(ind.juroReal) ? ind.juroReal : null)}
          </p>
        </div>
      ) : (
        <p className="pf-hint" style={{ marginTop: 'var(--space-4)' }}>
          Você projeta <strong>{pct(meuReal, 1)}</strong> de retorno real ao ano. Os números acima são
          a foto de <strong>hoje</strong> — a Selic muda a cada 45 dias e o IPCA é acumulado dos
          últimos 12 meses. Sua projeção é uma média de décadas, então ela não deve acompanhar cada
          virada do ciclo.
        </p>
      )}

      <p className="pf-hint pf-eco-fonte">
        Fonte: Banco Central (SGS) · Selic meta de hoje, IPCA acumulado em 12 meses
        {anos !== null && `, juro real médio composto de ${anos} anos (Selic realizada × IPCA)`}.
        Informativo — não é recomendação de investimento.
      </p>
    </section>
  );
}

/**
 * O texto muda com a distância pro histórico, nunca com a distância pra foto
 * de hoje — e nenhuma variação diz pro usuário mexer no número dele.
 */
function leitura(meu: number, historico: number, hoje: number | null): string {
  const diff = meu - historico;
  const acimaDaFoto = hoje !== null && meu < hoje - 1.5;

  if (diff > 2) {
    return `Sua projeção está acima do que o país entregou na média. Pode se realizar, mas aí a data inteira depende de um cenário melhor do que o observado — é uma aposta embutida no plano, não uma base.`;
  }
  if (diff < -2) {
    return `Sua projeção está abaixo da média histórica, o que deixa sua data com folga: se o país render como rendeu, você chega antes.${
      acimaDaFoto ? ` E sim, o juro real de hoje (${pct(hoje!, 1)}) está ainda mais alto — mas isso é pico de ciclo, não trava por décadas.` : ''
    }`;
  }
  return `Sua projeção está em linha com o que o país entregou nos últimos anos.${
    acimaDaFoto
      ? ` O juro real de hoje (${pct(hoje!, 1)}) está acima disso, mas é foto de um momento: a Selic sobe e desce, e seus aportes futuros vão pegar os dois lados.`
      : ''
  }`;
}

function Item({ rot, periodo, val, tom }: { rot: string; periodo: string; val: string; tom?: 'mint' }) {
  return (
    <div>
      <div className="mono pf-eco-rot">{rot}</div>
      <div
        className="mono"
        style={{ fontWeight: 700, fontSize: '1.15rem', marginTop: 4, color: tom === 'mint' ? 'var(--mint)' : 'var(--paper)' }}
      >
        {val}
      </div>
      <div className="pf-eco-periodo">{periodo}</div>
    </div>
  );
}
