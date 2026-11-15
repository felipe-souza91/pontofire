import { valorFuturo } from '@pontofire/engine';
import { GraficoLinha, type MarcaX, type SerieGrafico } from './GraficoLinha';
import { formatBRL, formatBRLcompact, formatDuracao, formatMesAno, formatPct } from '../utils/format';
import { competenciaDe, mesCurto, mesMedio } from '../utils/meses';

const AMOSTRAS = 40;
const COR_RITMO = 'var(--serie-ritmo)';
const COR_APORTES = 'var(--serie-cdi)';

/**
 * De hoje até a meta — e quanto desse caminho é juro.
 *
 * A curva sozinha mostrava só "sobe até a meta". A segunda linha (o que você
 * teria se o dinheiro não rendesse nada) é o que dá sentido à primeira: o vão
 * entre as duas é o juro composto, e ele abre devagar no começo e escancara no
 * fim. É o argumento inteiro do produto desenhado em duas linhas.
 *
 * Tudo em dinheiro de hoje: o retorno usado já é real (descontada a inflação),
 * então R$ 2,4 mi no fim do gráfico compram o que R$ 2,4 mi compram agora.
 */
export function GraficoProjecao({
  patrimonio,
  aporte,
  iMensal,
  meses,
  dataLiberdade,
  meta,
  inss,
}: {
  patrimonio: number;
  aporte: number;
  iMensal: number;
  meses: number;
  dataLiberdade: Date;
  meta: number;
  /** quando o INSS chegaria — vira marca no eixo se cair dentro do gráfico */
  inss: { data: Date; idade: number } | null;
}) {
  const hoje = new Date();
  const mesesEm = (k: number) => (meses * k) / AMOSTRAS;
  const dataEm = (k: number) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + Math.round(mesesEm(k)), 1);
    return competenciaDe(d);
  };

  const indices = Array.from({ length: AMOSTRAS + 1 }, (_, k) => k);
  const ritmo = indices.map((k) => valorFuturo(patrimonio, aporte, iMensal, mesesEm(k)));
  const soAportes = indices.map((k) => patrimonio + aporte * mesesEm(k));

  const series: SerieGrafico[] = [
    { id: 'ritmo', nome: 'No seu ritmo', curto: 'no ritmo', cor: COR_RITMO, principal: true, valores: ritmo },
    { id: 'aportes', nome: 'Só o que você aportar', curto: 'só aportes', cor: COR_APORTES, valores: soAportes },
  ];

  const rotulos = indices.map((k) => (k === 0 ? 'hoje' : mesMedio(dataEm(k))));
  const marcasX: MarcaX[] = [
    { t: 0, rotulo: 'hoje' },
    { t: 0.5, rotulo: mesCurto(dataEm(AMOSTRAS / 2)) },
    { t: 1, rotulo: mesCurto(competenciaDe(dataLiberdade)) },
  ];

  const fimRitmo = ritmo[AMOSTRAS]!;
  const fimAportes = soAportes[AMOSTRAS]!;
  const juros = Math.max(0, fimRitmo - fimAportes);

  // o INSS só entra no gráfico se chegar ANTES da meta; depois dela, vira frase
  const mesesAteInss = inss
    ? (inss.data.getFullYear() - hoje.getFullYear()) * 12 + (inss.data.getMonth() - hoje.getMonth())
    : null;
  const inssNoGrafico = mesesAteInss !== null && mesesAteInss > 0 && mesesAteInss < meses;

  return (
    <section className="pf-hero-card pf-card-graf">
      <div className="pf-graf-topo">
        <div>
          <span className="pf-eyebrow">Projeção até a meta</span>
          <div className="pf-graf-numero">{formatMesAno(dataLiberdade)}</div>
          <p className="pf-graf-resumo">
            em dinheiro de hoje · na chegada, <b>{formatBRLcompact(juros)}</b> terão vindo de juros —{' '}
            {formatPct(fimRitmo > 0 ? juros / fimRitmo : 0, 0)} do total
          </p>
        </div>
      </div>

      <GraficoLinha
        titulo="Projeção do patrimônio de hoje até a meta, com e sem juros"
        series={series}
        rotulos={rotulos}
        marcasX={marcasX}
        formatValor={(v) => formatBRL(Math.round(v))}
        formatEixo={formatBRLcompact}
        meta={meta}
        rotuloMeta={`meta ${formatBRLcompact(meta)}`}
        desdeZero
        marcadores={
          inssNoGrafico ? [{ t: mesesAteInss / meses, rotulo: `INSS aos ${Math.round(inss!.idade)}` }] : undefined
        }
        detalhe={(k) => {
          const j = ritmo[k]! - soAportes[k]!;
          return k === 0 ? (
            <span>seu patrimônio de hoje</span>
          ) : (
            <span>
              <b>{formatBRL(Math.round(j))}</b> de juros até aqui ({formatPct(ritmo[k]! > 0 ? j / ritmo[k]! : 0, 0)} do total) ·
              daqui a {formatDuracao(Math.round(mesesEm(k)))}
            </span>
          );
        }}
      />

      {inss && mesesAteInss !== null && !inssNoGrafico && mesesAteInss >= meses && (
        <p className="pf-hint" style={{ marginBottom: 0 }}>
          O INSS só chegaria em {formatMesAno(inss.data)}, aos {Math.round(inss.idade)} —{' '}
          {formatDuracao(mesesAteInss - meses)} depois do fim deste gráfico.
        </p>
      )}
    </section>
  );
}
