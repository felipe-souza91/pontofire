import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  coberturaPassiva,
  estimarINSS,
  proporcaoAtipica,
  variacaoDaData,
  type EstadoVigente,
} from '@pontofire/engine';
import { useAuth } from '../auth/useAuth';
import { usePainel, idadeDe } from '../hooks/usePainel';
import { useConquistas } from '../hooks/useConquistas';
import type { Snapshot } from '../data/snapshots';
import { gerarInsights, conquistasAtingidas, cardDaSemana } from '@pontofire/insights';
import { CardINSS } from '../components/CardINSS';
import { CardEconomico } from '../components/CardEconomico';
import { CardsInsights } from '../components/CardsInsights';
import { CardSemana } from '../components/CardSemana';
import { CardMetaIdade } from '../components/CardMetaIdade';
import { TrofeusResumo } from '../components/TrofeusResumo';
import { BoasVindas } from '../components/BoasVindas';
import { Novidades } from '../components/Novidades';
import { MenuTopo } from '../components/MenuTopo';
import { novidadesDesde } from '../data/novidades';
import { marcarNovidadesVistas, marcarTourVisto } from '../data/users';
import { GraficoEvolucao } from '../components/GraficoEvolucao';
import { GraficoProjecao } from '../components/GraficoProjecao';
import { GraficoData } from '../components/GraficoData';
import { PainelHoje } from '../components/PainelHoje';
import { useMercado } from '../hooks/useMercado';
import { diasAte, diasPagosPorMes, estimativaDeHoje, motivoSemEstimativa } from '../utils/pulso';
import { formatBRLcompact, formatDuracao, formatMesAno, formatPct } from '../utils/format';

/**
 * Janela dos gráficos de histórico. Um controle só, acima dos dois: se cada
 * gráfico tivesse o seu, "evolução" e "data" poderiam estar mostrando períodos
 * diferentes lado a lado sem ninguém perceber.
 */
type Periodo = '6m' | '12m' | 'tudo';
const PERIODOS: { id: Periodo; rotulo: string; meses: number | null }[] = [
  { id: '6m', rotulo: '6 meses', meses: 6 },
  { id: '12m', rotulo: '12 meses', meses: 12 },
  { id: 'tudo', rotulo: 'Tudo', meses: null },
];

export function Dashboard() {
  const { user, sair } = useAuth();
  const { doc, plano, ctx, vigente, P, R, netWorth, snapshots: lista, ultimo, bens, carregando } = usePainel(
    user?.uid ?? null,
  );
  const atingidas = ctx ? conquistasAtingidas(ctx) : [];
  const { salvas } = useConquistas(user?.uid ?? null, atingidas);
  const trofeus = new Set([...atingidas, ...salvas]);
  // apresentação: só pra quem terminou o onboarding e ainda não viu
  const [tourFechado, setTourFechado] = useState(false);
  const [novidadesFechadas, setNovidadesFechadas] = useState(false);
  const mercado = useMercado();
  const [periodo, setPeriodo] = useState<Periodo>('tudo');

  if (carregando) return <Centro>Carregando…</Centro>;
  if (!doc || !plano || !ctx) return <Centro>Sem dados ainda.</Centro>;

  const meta = vigente?.meta ?? 0;

  /**
   * Quanto a DATA andou desde o onboarding — não quanto o prazo encurtou.
   *
   * Se há um ano faltavam 300 meses e hoje faltam 288, nada melhorou: passou um
   * ano. O que conta é a data de chegada se mover no calendário.
   */
  const desdeAPartida = doc.linhaDePartida
    ? variacaoDaData(
        {
          em: new Date(`${doc.linhaDePartida.em}T00:00:00`),
          mesesAteFire: doc.linhaDePartida.mesesAteFire,
        },
        { em: new Date(), mesesAteFire: plano.meses },
      )
    : null;
  const saudacao = doc.apelido || doc.nome?.split(' ')[0] || 'você';
  const progressoPct = Math.min(100, Math.max(0, plano.progresso * 100));

  const mostraProjecao = plano.status === 'ok' && plano.meses !== null;

  // assistente (§7): catálogo de regras determinístico
  const temCardCoast = !!doc.idadeAlvo && idadeDe(doc.dataNascimento) !== undefined;
  const fmt = {
    moeda: (v: number) => formatBRLcompact(v),
    duracao: (m: number) => formatDuracao(m),
    pct: (v: number) => formatPct(v, 0),
  };
  const insights = gerarInsights(
    ctx,
    fmt,
    // o Coast já tem card dedicado; não repetir a mesma notícia
    { limite: 4, excluir: temCardCoast ? ['coast-atingido'] : [] },
  );

  // card da semana: determinístico por uid + semana, muda sozinho na segunda
  const daSemana = cardDaSemana(ctx, fmt, { semente: user?.uid });

  const stats: { rot: string; val: string; un?: string; tom?: 'mint' | 'ember' }[] = [
    { rot: 'Número FIRE', val: formatBRLcompact(meta) },
    { rot: 'Renda ao atingir', val: formatBRLcompact(plano.saqueMensalSustentavel), un: '/mês', tom: 'mint' },
  ];
  if (bens.length > 0) {
    stats.push({ rot: 'Patrimônio líquido', val: formatBRLcompact(netWorth), tom: 'mint' });
  }
  if (ultimo) {
    stats.push({ rot: 'Taxa de poupança', val: formatPct(ultimo.taxaPoupanca), tom: 'mint' });
  }
  if (R > 0) {
    stats.push({ rot: 'Cobertura passiva', val: formatPct(coberturaPassiva(R, vigente?.custo.valor ?? 0)), tom: 'mint' });
  }
  stats.push({ rot: 'Aporte mensal', val: formatBRLcompact(vigente?.aporte.valor ?? 0), un: '/mês' });
  stats.push({ rot: 'Retorno real a.a.', val: formatPct(doc.retornoRealEsperado), tom: 'ember' });

  const mostraTour = doc.tourVisto === false && !tourFechado;

  // --- o que muda todo dia
  const hoje = new Date();
  const estimativa = estimativaDeHoje(ultimo, mercado?.cdiDiario ?? [], hoje);
  const reserva = vigente?.reserva ?? 0;
  const custoVigente = vigente?.custo.valor ?? 0;
  const diasPagos = diasPagosPorMes(P, reserva, doc.taxaSaqueSegura, custoVigente);
  const rendaSustentavel = (Math.max(0, P - reserva) * doc.taxaSaqueSegura) / 12;
  const diasParaFire =
    plano.status === 'ok' && plano.dataLiberdade ? diasAte(plano.dataLiberdade, hoje) : null;

  // --- janela dos gráficos de histórico (N meses = N+1 pontos: precisa do de partida)
  const mesesDaJanela = PERIODOS.find((p) => p.id === periodo)?.meses ?? null;
  const janela = mesesDaJanela === null ? lista : lista.slice(-(mesesDaJanela + 1));

  // --- INSS: só pra marcar no gráfico de projeção quando ele chegaria
  const inss =
    doc.dataNascimento && doc.inicioContribuicao && doc.salario && doc.sexoINSS
      ? estimarINSS({
          dataNascimento: doc.dataNascimento,
          inicioContribuicao: doc.inicioContribuicao,
          salarioBruto: doc.salario,
          sexo: doc.sexoINSS,
        })
      : null;

  /**
   * Changelog e apresentação são excludentes.
   *
   * Quem está vendo o tour acabou de criar a conta — não tem número antigo pra
   * reaprender, e empilhar dois modais no primeiro acesso é o caminho pra não
   * ler nenhum dos dois.
   */
  const mostraNovidades =
    !mostraTour && !novidadesFechadas && novidadesDesde(doc.novidadesVistasEm).length > 0;

  return (
    <main className="pf-dash">
      {mostraTour && (
        <BoasVindas
          nome={saudacao}
          onFechar={() => {
            setTourFechado(true);
            if (user) void marcarTourVisto(user.uid).catch(() => undefined);
          }}
        />
      )}
      {mostraNovidades && (
        <Novidades
          visto={doc.novidadesVistasEm}
          onFechar={() => {
            setNovidadesFechadas(true);
            if (user) void marcarNovidadesVistas(user.uid).catch(() => undefined);
          }}
        />
      )}
      <MenuTopo onSair={() => void sair()} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
          marginBottom: 'var(--space-4)',
        }}
      >
        <span className="pf-eyebrow">Olá, {saudacao}</span>
        <span style={{ flex: 1 }} />
        <TrofeusResumo ids={trofeus} />
      </div>

      {/* Topo: a data (o que você persegue) e o hoje (o que mudou desde ontem) */}
      <div className="pf-topo-grid">
        {/* Card da data — termômetro + contagem regressiva (full width) */}
        <section className="pf-hero-card">
          <span className="pf-eyebrow">Seu ponto FIRE</span>
          {plano.status === 'ok' && plano.dataLiberdade && plano.meses !== null ? (
            <>
              <div className="pf-hc-date">{formatMesAno(plano.dataLiberdade)}</div>
              <p className="pf-hc-sub">
                faltam {formatDuracao(plano.meses)} no seu ritmo atual
                {plano.idadeNaLiberdade !== null && ` · aos ${Math.round(plano.idadeNaLiberdade)} anos`}
              </p>
            </>
          ) : plano.status === 'atingido' ? (
            <>
              <div className="pf-hc-date">Livre</div>
              <p className="pf-hc-sub">seu patrimônio já cobre sua meta</p>
            </>
          ) : (
            <>
              <div className="pf-hc-date" style={{ color: 'var(--ember-2)', fontSize: 'clamp(22px, 6vw, 32px)' }}>
                sem data ainda
              </div>
              <p className="pf-hc-sub">no aporte atual a meta não fecha — simular um aporte maior muda o jogo</p>
            </>
          )}

          {doc.nomeSonho && (
            <p style={{ color: 'var(--muted)', marginTop: '-10px', marginBottom: '18px' }}>
              rumo a <span style={{ color: 'var(--mint)', fontStyle: 'italic' }}>“{doc.nomeSonho}”</span>
            </p>
          )}

          {desdeAPartida !== null && Math.abs(desdeAPartida) >= 1 && (
            <p
              className="pf-hc-sub"
              style={{ marginTop: '-14px', color: desdeAPartida < 0 ? 'var(--mint)' : 'var(--muted)' }}
            >
              {formatDuracao(Math.abs(desdeAPartida))} {desdeAPartida < 0 ? 'mais cedo' : 'mais tarde'} do
              que quando você começou
              {doc.linhaDePartida?.origem === 'reconstruida' && ' (partida aproximada)'}
            </p>
          )}

          {vigente && <Vigencia vigente={vigente} snapshots={lista} />}

          <div className="pf-bar">
            <i style={{ width: `${progressoPct}%` }} />
          </div>
          <div className="pf-bar-row">
            <span>{formatBRLcompact(P)}</span>
            <span>
              meta {formatBRLcompact(meta)} · {progressoPct.toFixed(0)}%
            </span>
          </div>
          {/*
            Duas réguas pro mesmo número. Muita gente não considera a reserva como
            patrimônio de liberdade — e não está errada: ela é dinheiro carimbado,
            que existe pra não precisar vender a carteira num mês ruim. Mostrar as
            duas leituras serve as duas cabeças sem partir o dado.
          */}
          {vigente && vigente.reserva > 0 && (
            <p className="pf-hint" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
              Sem contar a reserva: {formatBRLcompact(Math.max(0, P - vigente.reserva))} de{' '}
              {formatBRLcompact(vigente.metaSemReserva)} ·{' '}
              {(
                (Math.max(0, P - vigente.reserva) / Math.max(1, vigente.metaSemReserva)) *
                100
              ).toFixed(0)}
              % — a reserva fica parada de propósito, então não conta como caminho andado.
            </p>
          )}
          <Link className="pf-como-calculo" to="/metodologia#data">como calculo isso →</Link>
        </section>
        <PainelHoje
          hoje={hoje}
          diasParaFire={diasParaFire}
          estimativa={estimativa ? { ...estimativa, valor: P + estimativa.ganho } : null}
          ultimoMes={ultimo?.mes ?? null}
          semEstimativa={motivoSemEstimativa(ultimo, mercado?.cdiDiario ?? [], hoje)}
          diasPagos={diasPagos}
          rendaSustentavel={rendaSustentavel}
        />
      </div>

      {/* Números — faixa cheia */}
      <div className="pf-stats" style={{ marginTop: 'var(--space-4)' }}>
        {stats.map((st) => (
          <Stat key={st.rot} rot={st.rot} val={st.val} un={st.un} tom={st.tom} />
        ))}
      </div>

      {lista.length > 7 && (
        <div className="pf-periodo" role="group" aria-label="Período dos gráficos de histórico">
          <span className="pf-periodo-rot">Histórico</span>
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={periodo === p.id ? 'on' : ''}
              aria-pressed={periodo === p.id}
              onClick={() => setPeriodo(p.id)}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      )}

      <div className="pf-bloco">
        {janela.length >= 2 ? (
          <GraficoEvolucao
            snapshots={janela}
            mercado={mercado}
            estimativa={estimativa}
            retornoEsperado={doc.retornoRealEsperado}
          />
        ) : (
          <section className="pf-hero-card">
            <span className="pf-eyebrow">Evolução do patrimônio</span>
            <div className="pf-vazio">
              <p>
                {lista.length === 1
                  ? 'Seu 1º mês está registrado. Com dois pontos eu consigo desenhar a curva — e colocar ao lado dela o que os mesmos aportes renderiam no CDI.'
                  : 'Ainda não há mês lançado. A curva aparece assim que houver dois — é ela que mostra se a sua data está andando, e como você se sai contra o CDI e a inflação.'}
              </p>
              <Link className="pf-btn pf-btn-ghost" to="/lancar" style={{ width: 'auto', padding: '0.6rem 1.2rem', textDecoration: 'none' }}>
                {lista.length === 1 ? 'Lançar mais um mês' : 'Lançar meu primeiro mês'}
              </Link>
            </div>
          </section>
        )}
      </div>

      {/* Os dois gráficos do FUTURO: pra onde a curva vai, e como a chegada vem se movendo */}
      <div className="pf-bloco pf-grade-graf">
        {mostraProjecao && (
          <GraficoProjecao
            patrimonio={P}
            aporte={vigente?.aporte.valor ?? 0}
            iMensal={plano.iMensal}
            meses={plano.meses!}
            dataLiberdade={plano.dataLiberdade!}
            meta={meta}
            inss={inss ? { data: inss.dataElegivel, idade: inss.idadeElegivel } : null}
          />
        )}
        <GraficoData snapshots={janela} />
      </div>

      {/* O que se lê */}
      <div className="pf-bloco pf-cols-2">
        <div className="pf-col-lado">
          <CardsInsights insights={insights} />
          <CardSemana card={daSemana} />
        </div>
        <div className="pf-col-lado">
          <CardEconomico doc={doc} />
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-4)', display: 'grid', gap: 'var(--space-4)' }}>
        {vigente && <CardMetaIdade doc={doc} plano={plano} P={P} vigente={vigente} />}
        <CardINSS doc={doc} plano={plano} meta={meta} />
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
        {!ultimo && (
          <p className="pf-hint" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
            Registre um mês pra ver taxa de poupança e evolução — e sua data começar a andar sozinha.
          </p>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="pf-btn-link" to="/lancar">{ultimo ? '+ Lançar novo mês' : '+ Lançar meu primeiro mês'}</Link>
          <Link className="pf-btn-link" to="/importar">importar extrato ou fatura</Link>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------

function Stat({ rot, val, un, tom }: { rot: string; val: string; un?: string; tom?: 'mint' | 'ember' }) {
  return (
    <div className="pf-stat">
      <div className="rot">{rot}</div>
      {/* a unidade vai separada e menor: "R$ 8,1 mil/mês" inteiro estourava o card no celular */}
      <div className={`val ${tom ?? ''}`}>
        {val}
        {un && <small>{un}</small>}
      </div>
    </div>
  );
}

function Centro({ children }: { children: ReactNode }) {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
      {children}
    </main>
  );
}

/**
 * De onde vieram os números que geraram a data.
 *
 * A data agora se mexe conforme o usuário lança, e movimento sem explicação é
 * ansiedade. Estes dois avisos cobrem os momentos em que ela se comporta de um
 * jeito que parece defeito: quando ainda NÃO responde (histórico curto) e
 * quando parou de responder (o usuário marcou quase tudo como atípico).
 */
function Vigencia({ vigente, snapshots }: { vigente: EstadoVigente; snapshots: Snapshot[] }) {
  const { atipicos, total } = proporcaoAtipica(snapshots);
  const faltam = Math.max(vigente.custo.faltam, vigente.aporte.faltam);

  if (total >= 3 && atipicos > total / 2) {
    return (
      <p className="pf-hint" style={{ marginTop: '-6px', marginBottom: '18px' }}>
        Você marcou {atipicos} dos últimos {total} meses como atípicos, então eles ficam de fora da
        sua média — talvez o atípico já seja o normal.
      </p>
    );
  }

  if (faltam > 0) {
    return (
      <p className="pf-hint" style={{ marginTop: '-6px', marginBottom: '18px' }}>
        Esta data ainda usa os números do seu perfil.{' '}
        {faltam === 1 ? 'Falta 1 mês lançado' : `Faltam ${faltam} meses lançados`} pra ela passar a
        responder ao que você vive de verdade.
      </p>
    );
  }

  return (
    <p className="pf-hint" style={{ marginTop: '-6px', marginBottom: '18px' }}>
      Calculada com {formatBRLcompact(vigente.custo.valor)}/mês de custo e{' '}
      {formatBRLcompact(vigente.aporte.valor)}/mês de aporte — a mediana dos seus últimos{' '}
      {vigente.custo.mesesUsados} meses.
    </p>
  );
}
