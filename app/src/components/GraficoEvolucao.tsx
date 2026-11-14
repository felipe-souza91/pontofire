import { Link } from 'react-router-dom';
import {
  carteiraSombra,
  rentabilidade,
  type MesDeCarteira,
  type Rentabilidade,
} from '@pontofire/engine';
import type { Snapshot } from '../data/snapshots';
import type { Mercado } from '../data/mercado';
import type { EstimativaDeHoje } from '../utils/pulso';
import { GraficoLinha, type MarcaX, type SerieGrafico } from './GraficoLinha';
import { formatBRL, formatBRLcompact, formatPct } from '../utils/format';
import { diaCurto, mesCurto, mesMedio } from '../utils/meses';

/**
 * Cores das séries. Conferidas contra o fundo do card (#141838) pra daltonismo
 * e contraste — as três se distinguem em protanopia, deuteranopia e tritanopia.
 * A sua é a mais grossa e a única com área: identidade não depende só de cor.
 */
export const COR = {
  voce: '#3FD69B',
  cdi: '#7C8CFF',
  ipca: '#E8A53A',
} as const;

/**
 * Evolução do patrimônio, ao lado de duas réguas.
 *
 * "Meu patrimônio subiu" não diz nada — ele sobe só de aportar. As duas linhas
 * a mais respondem o que a curva sozinha esconde:
 *
 *  - CDI: os MESMOS aportes, nas mesmas datas, rendendo o CDI. É o "e se eu
 *    tivesse deixado tudo no pós-fixado?".
 *  - IPCA: os mesmos aportes só corrigidos pela inflação. Abaixo dessa linha o
 *    dinheiro perdeu poder de compra.
 *
 * As réguas recebem os seus aportes de propósito. Comparar patrimônio contra um
 * índice puro seria injusto: o índice não recebeu R$ 3 mil por mês.
 */
export function GraficoEvolucao({
  snapshots,
  mercado,
  estimativa,
  retornoEsperado,
}: {
  /** os meses da janela escolhida, em ordem */
  snapshots: readonly Snapshot[];
  mercado: Mercado | null;
  /** só quando a janela termina no último lançamento */
  estimativa: EstimativaDeHoje | null;
  /** retorno real ao ano que a data FIRE pressupõe */
  retornoEsperado: number;
}) {
  const carteira: MesDeCarteira[] = snapshots.map((s) => ({
    mes: s.mes,
    patrimonio: s.patrimonioTotal,
    aporte: s.aportesMes,
  }));
  const nMeses = snapshots.length;
  const primeiro = snapshots[0]!;
  const ultimo = snapshots[nMeses - 1]!;

  const sombraCdi = mercado ? carteiraSombra(carteira, mercado.cdiMensal) : [];
  const sombraIpca = mercado ? carteiraSombra(carteira, mercado.ipcaMensal) : [];
  /** régua com um ponto só (o de partida) não é linha — fica de fora */
  const util = (v: readonly (number | null)[]) => v.filter((x) => x !== null).length >= 2;

  // posição extra "hoje": o trecho pontilhado da estimativa
  const comHoje = estimativa !== null;
  const rotulos = [
    ...snapshots.map((s) => mesMedio(s.mes)),
    ...(comHoje ? [`hoje · CDI até ${diaCurto(estimativa.ate)}`] : []),
  ];
  const n = rotulos.length;
  const estender = <T,>(v: readonly T[], fim: T | null): (T | null)[] => (comHoje ? [...v, fim] : [...v]);

  const series: SerieGrafico[] = [
    {
      id: 'voce',
      nome: 'Você',
      cor: COR.voce,
      principal: true,
      valores: estender(carteira.map((m) => m.patrimonio), null),
    },
  ];
  if (comHoje) {
    series.push({
      id: 'estimativa',
      nome: 'Você, se rendeu o CDI',
      curto: 'você, pelo CDI',
      cor: COR.voce,
      estimada: true,
      auxiliar: true,
      valores: [...Array.from({ length: nMeses - 1 }, () => null), ultimo.patrimonioTotal, estimativa.valor],
    });
  }
  if (util(sombraCdi)) {
    const fim = sombraCdi[nMeses - 1];
    series.push({
      id: 'cdi',
      nome: 'Mesmos aportes no CDI',
      curto: 'no CDI',
      cor: COR.cdi,
      // o CDI de hoje é dado publicado, não estimativa: a régua segue cheia
      valores: estender(sombraCdi, fim !== null && fim !== undefined && comHoje ? fim * (1 + estimativa.acumulado) : null),
    });
  }
  if (util(sombraIpca)) {
    series.push({
      id: 'ipca',
      nome: 'Mesmos aportes + inflação',
      curto: 'só inflação',
      cor: COR.ipca,
      valores: estender(sombraIpca, null),
    });
  }

  const rent = mercado ? rentabilidade(carteira, { cdi: mercado.cdiMensal, ipca: mercado.ipcaMensal }) : null;

  // de onde veio o crescimento da janela: do bolso ou do juro
  const variacao = ultimo.patrimonioTotal - primeiro.patrimonioTotal;
  const aportado = snapshots.slice(1).reduce((soma, s) => soma + s.aportesMes, 0);
  const rendido = variacao - aportado;

  const atipicos = new Set(snapshots.flatMap((s, i) => (s.atipico ? [i] : [])));

  return (
    <section className="pf-hero-card pf-card-graf">
      <div className="pf-graf-topo">
        <div>
          <span className="pf-eyebrow">Evolução do patrimônio</span>
          <div className="pf-graf-numero">{formatBRL(Math.round(ultimo.patrimonioTotal))}</div>
          <p className="pf-graf-resumo">
            <b className={variacao >= 0 ? 'sobe' : 'desce'}>
              {variacao >= 0 ? '+' : '−'}
              {formatBRLcompact(Math.abs(variacao))}
            </b>{' '}
            desde {mesCurto(primeiro.mes)}
            {nMeses > 1 && (
              <>
                {' · '}
                {formatBRLcompact(aportado)} saíram do seu bolso,{' '}
                <span className={rendido >= 0 ? 'sobe' : 'desce'}>
                  {rendido >= 0 ? '' : '−'}
                  {formatBRLcompact(Math.abs(rendido))}
                </span>{' '}
                {rendido >= 0 ? 'o dinheiro fez sozinho' : 'o mercado levou'}
              </>
            )}
          </p>
        </div>
      </div>

      <GraficoLinha
        titulo="Evolução do patrimônio mês a mês, comparada ao CDI e à inflação"
        series={series}
        rotulos={rotulos}
        marcasX={marcasDosMeses(snapshots, n)}
        formatValor={(v) => formatBRL(Math.round(v))}
        formatEixo={formatBRLcompact}
        vazados={atipicos}
        altura={280}
        detalhe={(i) => {
          if (i >= nMeses) {
            return estimativa ? (
              <>
                O CDI rendeu {formatPct(estimativa.acumulado, 2)} em {estimativa.diasUteis}{' '}
                {estimativa.diasUteis === 1 ? 'dia útil' : 'dias úteis'} desde o seu lançamento. É
                régua, não extrato — o valor real aparece quando você lançar.
              </>
            ) : null;
          }
          const s = snapshots[i]!;
          const base = s.patrimonioTotal - s.rendimentosMes - s.aportesMes;
          return (
            <>
              {i > 0 && (
                <span>
                  rendeu <b>{formatBRL(Math.round(s.rendimentosMes))}</b>
                  {base > 0 && ` (${formatPct(s.rendimentosMes / base, 2)})`} · aporte{' '}
                  <b>{formatBRL(Math.round(s.aportesMes))}</b>
                </span>
              )}
              {s.atipico && <span>mês marcado como atípico</span>}
              {s.observacao && <span>“{s.observacao}”</span>}
            </>
          );
        }}
      />

      {rent && <Leitura rent={rent} retornoEsperado={retornoEsperado} ultimoMes={ultimo.mes} />}

      {!mercado && (
        <p className="pf-hint" style={{ marginBottom: 0 }}>
          Não consegui falar com o Banco Central agora, então o gráfico está sem as réguas do CDI e
          da inflação. Elas voltam sozinhas.
        </p>
      )}
      <Link className="pf-como-calculo" to="/metodologia#mercado">como calculo isso →</Link>
    </section>
  );
}

/**
 * Três marcas no eixo — começo, meio e fim (o "hoje" não ganha marca).
 * Eram quatro, e no celular "set/25" e "jan/26" se atropelavam.
 */
function marcasDosMeses(snapshots: readonly Snapshot[], posicoes: number): MarcaX[] {
  const m = snapshots.length;
  if (m < 2) return [];
  const quantas = Math.min(3, m);
  const indices = [...new Set(Array.from({ length: quantas }, (_, k) => Math.round((k * (m - 1)) / (quantas - 1))))];
  return indices.map((i) => ({ t: i / (posicoes - 1), rotulo: mesCurto(snapshots[i]!.mes) }));
}

/**
 * O que os números da comparação querem dizer — sem dizer o que fazer.
 *
 * Risco regulatório (CVM): o app informa a régua e o efeito mecânico na data.
 * Nenhuma variação deste texto sugere trocar de investimento.
 */
function Leitura({
  rent,
  retornoEsperado,
  ultimoMes,
}: {
  rent: Rentabilidade;
  retornoEsperado: number;
  /** competência do último lançamento da janela */
  ultimoMes: string;
}) {
  const periodo = `${mesCurto(rent.de)} → ${mesCurto(rent.ate)}`;
  // a comparação para onde as duas réguas fecham — e isso precisa ser dito
  const recuou = rent.ate < ultimoMes;

  return (
    <div className="pf-rent">
      <div className="pf-rent-topo">
        <span className="pf-eyebrow">Rentabilidade no período</span>
        <span className="pf-rent-periodo mono">
          {periodo} · {rent.meses} {rent.meses === 1 ? 'mês' : 'meses'}
        </span>
      </div>

      <div className="pf-rent-numeros">
        <Figura cor={COR.voce} rot="Sua carteira" val={formatPct(rent.carteira)} />
        {rent.cdi !== null && <Figura cor={COR.cdi} rot="CDI" val={formatPct(rent.cdi)} />}
        {rent.ipca !== null && <Figura cor={COR.ipca} rot="Inflação" val={formatPct(rent.ipca)} />}
      </div>

      <ul className="pf-rent-leitura">
        {rent.percentualDoCdi !== null && (
          <li>
            Sua carteira rendeu <b>{formatPct(rent.percentualDoCdi, 0)} do CDI</b>
            {/* empate técnico não é vitória nem derrota: a conta tem aproximação de dias */}
            {Math.abs(rent.percentualDoCdi - 1) < 0.03
              ? ' — praticamente o mesmo que os mesmos aportes renderiam parados no pós-fixado.'
              : rent.percentualDoCdi > 1
                ? ' — mais do que os mesmos aportes renderiam parados no pós-fixado.'
                : ' — menos do que os mesmos aportes renderiam parados no pós-fixado.'}
          </li>
        )}
        {rent.realAnual !== null ? (
          <li>
            Acima da inflação, isso dá <b>{formatPct(rent.realAnual)} ao ano</b>. Sua data é calculada
            com {formatPct(retornoEsperado)}.{' '}
            {rent.realAnual < retornoEsperado - 0.015
              ? 'Se o ritmo continuar abaixo da premissa, a data real chega depois da que o app mostra.'
              : rent.realAnual > retornoEsperado + 0.015
                ? 'Se o ritmo continuar acima da premissa, a data real chega antes da que o app mostra.'
                : 'Os dois estão em linha: a data se sustenta no que a carteira vem entregando.'}{' '}
            Um ano é pouco pra julgar décadas — é sinal, não sentença.
          </li>
        ) : rent.realAcumulado !== null ? (
          <li>
            Descontada a inflação, o ganho foi de <b>{formatPct(rent.realAcumulado)}</b> no período.
            Com menos de 12 meses ainda não dá pra falar em taxa ao ano sem transformar ruído em
            número — essa linha aparece quando o histórico fechar um ano.
          </li>
        ) : null}
      </ul>

      <p className="pf-hint pf-rent-nota">
        {recuou &&
          `A comparação vai até ${mesCurto(rent.ate)}: a inflação dos meses seguintes ainda não foi publicada, e comparar períodos de tamanhos diferentes favoreceria a carteira. `}
        Aproximação: considera cada aporte feito no fim do mês. Fonte das réguas: Banco Central (SGS).
        Informativo — não é recomendação de investimento.
      </p>
    </div>
  );
}

function Figura({ cor, rot, val }: { cor: string; rot: string; val: string }) {
  return (
    <div className="pf-rent-figura">
      <span className="rot">
        <i style={{ borderColor: cor }} />
        {rot}
      </span>
      <b className="mono">{val}</b>
    </div>
  );
}
