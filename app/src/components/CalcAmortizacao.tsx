import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  amortizarOuInvestir,
  ganhoDeAmortizar,
  pontoDeVirada,
  IPCA_PADRAO,
  type SistemaAmortizacao,
} from '@pontofire/engine';
import { useAuth } from '../auth/useAuth';
import { usePainel } from '../hooks/usePainel';
import { useIndicadores } from '../hooks/useIndicadores';
import { MoedaInput } from '../components/MoedaInput';
import { Campo } from '../components/Campo';
import { formatBRL, formatBRLcompact, formatDuracao, formatPct } from '../utils/format';

/**
 * Amortização de financiamento — e a pergunta que decide: amortizar ou
 * investir a diferença?
 *
 * A tabela SAC × Price qualquer site tem. O diferencial aqui é usar o retorno
 * real que o PRÓPRIO usuário declarou, e trazer a taxa do contrato pra termos
 * reais antes de comparar — porque comparar "financiamento a 12% nominal" com
 * "eu rendo 6% real" é a armadilha que sempre conclui "amortize".
 */
export function CalcAmortizacao() {
  const { user } = useAuth();
  const { doc, vigente, P, carregando } = usePainel(user?.uid ?? null);
  const ind = useIndicadores();

  const [valor, setValor] = useState(0);
  const [taxaAnualPct, setTaxaAnualPct] = useState(11.5);
  const [meses, setMeses] = useState(240);
  const [sistema, setSistema] = useState<SistemaAmortizacao>('price');
  const [extra, setExtra] = useState(0);
  const [modo, setModo] = useState<'prazo' | 'parcela'>('prazo');

  const taxaMensal = useMemo(() => Math.pow(1 + taxaAnualPct / 100, 1 / 12) - 1, [taxaAnualPct]);
  const ipcaAnual = typeof ind?.ipca12m === 'number' ? ind.ipca12m / 100 : IPCA_PADRAO;

  const financiamento = { valor, taxaMensal, meses, sistema };

  const ganho = useMemo(
    () => (valor > 0 && meses > 0 ? ganhoDeAmortizar(financiamento, { mensal: extra, modo }) : null),
    [valor, taxaMensal, meses, sistema, extra, modo],
  );

  /**
   * O "quando parar de amortizar" — que não é um quando, e é aí que está o
   * valor. Roda com o patrimônio e o aporte REAIS do usuário.
   */
  const virada = useMemo(
    () =>
      valor > 0 && meses > 0 && doc && vigente
        ? pontoDeVirada({
            financiamento,
            patrimonioHoje: P,
            aporteMensal: vigente.aporte.valor,
            amortizacaoMensal: extra,
            retornoRealAnual: doc.retornoRealEsperado,
            ipcaAnual,
          })
        : null,
    [valor, taxaMensal, meses, sistema, extra, doc, vigente, P, ipcaAnual],
  );

  const decisao = useMemo(
    () =>
      valor > 0 && meses > 0 && extra > 0 && doc
        ? amortizarOuInvestir({
            financiamento,
            extraMensal: extra,
            retornoRealAnual: doc.retornoRealEsperado,
            ipcaAnual,
          })
        : null,
    [valor, taxaMensal, meses, sistema, extra, doc, ipcaAnual],
  );

  if (carregando) return <p className="pf-hint">Carregando seus números…</p>;

  return (
    <div>
      <p className="pf-hint" style={{ marginTop: 0 }}>
        Simule o financiamento, veja quanto uma amortização extra economiza, descubra se vale mais
        amortizar ou investir esse dinheiro — e, no fim, quando faz sentido parar de amortizar.
      </p>

      <Campo rotulo="Valor financiado" dica="Já descontada a entrada.">
        <MoedaInput value={valor} onChange={setValor} />
      </Campo>

      <Campo rotulo="Taxa de juros" dica="A taxa NOMINAL do contrato, ao ano. É a que aparece no CET.">
        <div style={{ position: 'relative' }}>
          <input
            className="pf-input pf-num"
            type="number"
            min={0}
            max={200}
            step={0.1}
            value={taxaAnualPct}
            onChange={(e) => setTaxaAnualPct(Math.max(0, Number(e.target.value) || 0))}
          />
          <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
            % a.a.
          </span>
        </div>
        <span className="pf-hint">equivale a {formatPct(taxaMensal, 3)} ao mês</span>
      </Campo>

      <Campo rotulo="Prazo" dica="Quantas parcelas no total.">
        <input
          className="pf-input pf-num"
          type="number"
          min={1}
          max={480}
          value={meses}
          onChange={(e) => setMeses(Math.max(1, Math.min(480, Number(e.target.value) || 1)))}
        />
      </Campo>

      <Campo rotulo="Sistema" dica="SAC: parcela começa alta e cai. Price: parcela fixa do começo ao fim.">
        <div className="pf-chips">
          {(['price', 'sac'] as const).map((s) => (
            <button key={s} type="button" className={`pf-chip ${sistema === s ? 'on' : ''}`} onClick={() => setSistema(s)}>
              {s === 'price' ? 'Price (parcela fixa)' : 'SAC (parcela decrescente)'}
            </button>
          ))}
        </div>
      </Campo>

      <Campo rotulo="Amortização extra por mês" opcional dica="Quanto você conseguiria colocar a mais, todo mês, além da parcela.">
        <MoedaInput value={extra} onChange={setExtra} />
      </Campo>

      {extra > 0 && (
        <Campo rotulo="O extra serve pra…" dica="Reduzir prazo economiza mais juros. Reduzir parcela alivia o mês.">
          <div className="pf-chips">
            {([['prazo', 'Reduzir o prazo'], ['parcela', 'Reduzir a parcela']] as const).map(([v, r]) => (
              <button key={v} type="button" className={`pf-chip ${modo === v ? 'on' : ''}`} onClick={() => setModo(v)}>
                {r}
              </button>
            ))}
          </div>
        </Campo>
      )}

      {ganho && (
        <section className="pf-hero-card" style={{ marginTop: 'var(--space-6)' }}>
          <span className="pf-eyebrow">o financiamento</span>
          <div className="pf-divida-grid" style={{ marginTop: 'var(--space-3)' }}>
            <Item
              rot="Parcela"
              val={
                sistema === 'price'
                  ? formatBRL(ganho.original.primeiraParcela)
                  : `${formatBRL(ganho.original.primeiraParcela)} → ${formatBRL(ganho.original.ultimaParcela)}`
              }
              sub={sistema === 'price' ? 'fixa' : 'primeira → última'}
            />
            <Item rot="Total pago" val={formatBRLcompact(ganho.original.totalPago)} sub={`${meses} parcelas`} />
            <Item
              rot="Só de juros"
              val={formatBRLcompact(ganho.original.totalJuros)}
              sub={`${formatPct(ganho.original.totalJuros / Math.max(1, valor))} do valor financiado`}
            />
          </div>

          {extra > 0 && (
            <div className="pf-amort-ganho">
              <span className="pf-eyebrow" style={{ color: 'var(--mint)' }}>com {formatBRL(extra)}/mês a mais</span>
              <div className="pf-divida-grid" style={{ marginTop: 'var(--space-3)' }}>
                {modo === 'prazo' ? (
                  <Item
                    rot="Quita antes"
                    val={formatDuracao(ganho.mesesEconomizados)}
                    sub={`em ${ganho.comExtra.mesesAteQuitar} meses, não ${meses}`}
                  />
                ) : (
                  <Item
                    rot="Parcela cai para"
                    val={formatBRL(ganho.comExtra.ultimaParcela)}
                    sub={`era ${formatBRL(ganho.original.primeiraParcela)}`}
                  />
                )}
                <Item
                  rot="Juros economizados"
                  val={formatBRLcompact(ganho.jurosEconomizados)}
                  sub="dinheiro que fica com você"
                />
              </div>
            </div>
          )}
        </section>
      )}

      {decisao && doc && (
        <section className="pf-hero-card" style={{ marginTop: 'var(--space-4)' }}>
          <span className="pf-eyebrow">amortizar ou investir esse dinheiro?</span>

          <div className="pf-eco-comparacao" style={{ marginTop: 'var(--space-3)', borderTop: 0, paddingTop: 0 }}>
            <div className="pf-eco-linha">
              <span>Seu financiamento, em juros REAIS</span>
              <strong className="mono">{formatPct(decisao.taxaRealContratoAnual)} a.a.</strong>
            </div>
            <div className="pf-eco-linha">
              <span>Seu retorno real esperado</span>
              <strong className="mono" style={{ color: 'var(--mint)' }}>
                {formatPct(doc.retornoRealEsperado)} a.a.
              </strong>
            </div>
          </div>

          <p style={{ lineHeight: 1.6 }}>
            {decisao.vence === 'empate' ? (
              <>
                As duas escolhas terminam praticamente <strong>empatadas</strong> em{' '}
                {formatDuracao(decisao.horizonteMeses)}. Aí a decisão não é financeira: amortizar dá
                tranquilidade, investir dá liquidez.
              </>
            ) : decisao.vence === 'amortizar' ? (
              <>
                <strong style={{ color: 'var(--mint)' }}>Amortizar sai na frente.</strong> Ao fim do
                prazo original você teria{' '}
                <strong className="mono">{formatBRLcompact(decisao.diferencaHoje)}</strong> a mais (em
                dinheiro de hoje) do que investindo o extra — e ainda ficaria livre da dívida{' '}
                {formatDuracao(decisao.mesesEconomizados)} antes.
              </>
            ) : (
              <>
                <strong style={{ color: 'var(--mint)' }}>Investir sai na frente.</strong> Ao fim do
                prazo você teria <strong className="mono">{formatBRLcompact(decisao.diferencaHoje)}</strong>{' '}
                a mais (em dinheiro de hoje) do que amortizando — o seu dinheiro rende mais do que o
                financiamento cobra, em termos reais.
              </>
            )}
          </p>

          <p className="pf-hint" style={{ marginBottom: 0 }}>
            ⓘ A taxa do contrato é <strong>nominal</strong> e o seu retorno é <strong>real</strong>.
            Comparar os dois direto sempre conclui "amortize" — por isso eu trago o contrato pra
            termos reais usando o IPCA{' '}
            {typeof ind?.ipca12m === 'number'
              ? `de ${formatPct(ipcaAnual)} (últimos 12 meses, BACEN)`
              : `estimado em ${formatPct(ipcaAnual)}`}
            . Investir também traz risco que amortizar não tem: a dívida é certa, o retorno não.
          </p>
          <Link className="pf-como-calculo" to="/metodologia#divida">como calculo isso →</Link>
        </section>
      )}

      {virada && (
        <section className="pf-hero-card" style={{ marginTop: 'var(--space-4)' }}>
          <span className="pf-eyebrow">quando eu paro de amortizar?</span>

          <p style={{ lineHeight: 1.6, marginTop: 'var(--space-3)' }}>
            <strong>Nunca por causa do quanto você já tem.</strong> Amortizar R$ 1 rende exatamente a
            taxa do contrato — os juros que você deixa de pagar —, garantido e sem imposto. Investir
            R$ 1 rende a sua carteira, menos IR. É <strong>taxa contra taxa</strong>: se uma ganha,
            ela já ganhava desde o primeiro real, e vai ganhando até o último.
          </p>

          <div className="pf-eco-comparacao" style={{ borderTop: 0, paddingTop: 0 }}>
            <div className="pf-eco-linha">
              <span>Contrato, em juros reais</span>
              <strong className="mono">{formatPct(virada.taxaRealContrato)} a.a.</strong>
            </div>
            <div className="pf-eco-linha">
              <span>Sua carteira, real e já sem IR</span>
              <strong className="mono" style={{ color: virada.vence === 'investir' ? 'var(--mint)' : 'var(--muted)' }}>
                {formatPct(virada.retornoRealLiquido)} a.a.
              </strong>
            </div>
          </div>

          <p style={{ lineHeight: 1.6 }}>
            {virada.vence === 'empate' ? (
              <>
                As duas estão <strong>empatadas</strong>. Aí não é conta, é preferência: amortizar dá
                sossego, investir dá liquidez.
              </>
            ) : virada.vence === 'amortizar' ? (
              <>
                Hoje <strong style={{ color: 'var(--mint)' }}>amortizar ganha</strong> por{' '}
                {formatPct(Math.abs(virada.margem))} ao ano. Pra virar o jogo, sua carteira precisaria
                render <strong className="mono">{formatPct(virada.retornoDeEmpate)} real ao ano</strong>{' '}
                — antes do imposto.
              </>
            ) : (
              <>
                Hoje <strong style={{ color: 'var(--mint)' }}>aportar ganha</strong> por{' '}
                {formatPct(virada.margem)} ao ano, mesmo depois do IR. O empate só voltaria se sua
                carteira caísse pra <strong className="mono">{formatPct(virada.retornoDeEmpate)} real</strong>.
              </>
            )}
          </p>

          <p className="pf-hint">
            ⓘ O IR come <strong>{formatPct(virada.custoDoIR)} do seu retorno real</strong> — mais do
            que os 15% parecem, porque ele incide sobre o ganho <strong>nominal</strong>: a inflação
            é tributada junto. Amortização não paga imposto nenhum, e é isso que a coloca no páreo.
          </p>

          {virada.mesDeIndependencia !== null ? (
            <div className="pf-card-alerta" style={{ marginTop: 'var(--space-4)' }}>
              <strong>O que MUDA com o tempo é outra coisa.</strong>
              <p style={{ margin: 'var(--space-2) 0 0' }}>
                Em <strong>{formatDuracao(virada.mesDeIndependencia)}</strong> o seu investido passa o
                saldo devedor ({formatBRLcompact(virada.patrimonioNaVirada)} contra{' '}
                {formatBRLcompact(virada.saldoNaVirada)}). Dali em diante a dívida deixa de ser risco
                e vira <strong>escolha</strong>: você pode quitar quando quiser. É provavelmente esse
                o marco que a pergunta procurava.
              </p>
            </div>
          ) : (
            <p className="pf-hint">
              No ritmo atual seu investido não alcança o saldo devedor antes de a dívida acabar
              ({formatDuracao(virada.mesesAteQuitar)}). Aumentar o aporte antecipa esse encontro.
            </p>
          )}

          <Link className="pf-como-calculo" to="/metodologia#divida">como calculo isso →</Link>
        </section>
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
