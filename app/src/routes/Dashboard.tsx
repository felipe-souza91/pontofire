import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  coberturaPassiva,
  proporcaoAtipica,
  valorFuturo,
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
import { MenuTopo } from '../components/MenuTopo';
import { marcarTourVisto } from '../data/users';
import { GraficoLinha, type MarcaX, type PontoGrafico } from '../components/GraficoLinha';
import { formatBRLcompact, formatDuracao, formatMesAno, formatPct } from '../utils/format';

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function mesCurto(m: string): string {
  const [ano, mm] = m.split('-');
  return `${MESES_ABREV[parseInt(mm ?? '1', 10) - 1]}/${(ano ?? '').slice(2)}`;
}

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

  const stats: { rot: string; val: string; tom?: 'mint' | 'ember' }[] = [
    { rot: 'Número FIRE', val: formatBRLcompact(meta) },
    { rot: 'Renda ao atingir', val: `${formatBRLcompact(plano.saqueMensalSustentavel)}/mês`, tom: 'mint' },
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
  stats.push({ rot: 'Aporte mensal', val: `${formatBRLcompact(vigente?.aporte.valor ?? 0)}/mês` });
  stats.push({ rot: 'Retorno real a.a.', val: formatPct(doc.retornoRealEsperado), tom: 'ember' });

  const mostraTour = doc.tourVisto === false && !tourFechado;

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
            <div className="pf-hc-date">Livre 🔥</div>
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

      {/* Números — faixa cheia */}
      <div className="pf-stats" style={{ marginTop: 'var(--space-4)' }}>
        {stats.map((st) => (
          <Stat key={st.rot} rot={st.rot} val={st.val} tom={st.tom} />
        ))}
      </div>

      <div className="pf-cols-2" style={{ marginTop: 'var(--space-4)' }}>
        {/* Coluna esquerda: os gráficos (precisam de largura) */}
        <div className="pf-col-graficos">
          {mostraProjecao && (
            <section className="pf-hero-card pf-card-graf">
              <span className="pf-eyebrow">Projeção do patrimônio</span>
              <p className="pf-hc-sub" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                de hoje até a meta, no seu ritmo
              </p>
              <GraficoLinha
                pontos={pontosProjecao(P, vigente?.aporte.valor ?? 0, plano.iMensal, plano.meses!)}
                cor="#FF7A45"
                meta={meta}
                rotuloMeta={`meta ${formatBRLcompact(meta)}`}
                marcasX={marcasProjecao(plano.meses!, plano.dataLiberdade!)}
                formatValor={formatBRLcompact}
                desdeZero
              />
            </section>
          )}

          {(() => {
            /*
             * A trajetória da DATA — o gráfico que só existe porque a Fase 1
             * passou a gravar `mesesAteFire` em cada lançamento. Mostra
             * movimento, não posição: é o retrato de o app estar funcionando.
             */
            const pontos = trajetoriaDaData(lista);
            if (pontos.length < 2) return null;
            const primeiro = pontos[0]!.v;
            const ultimoPonto = pontos[pontos.length - 1]!.v;
            const ganho = primeiro - ultimoPonto;
            return (
              <section className="pf-hero-card pf-card-graf">
                <span className="pf-eyebrow">Sua data ao longo do tempo</span>
                <p className="pf-hc-sub" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                  {Math.abs(ganho) < 0.08
                    ? 'estável desde o primeiro lançamento'
                    : ganho > 0
                      ? `veio ${formatDuracao(ganho * 12)} pra trás desde o 1º lançamento`
                      : `foi ${formatDuracao(-ganho * 12)} pra frente desde o 1º lançamento`}
                </p>
                <GraficoLinha
                  pontos={pontos}
                  cor="#FF9E6B"
                  marcasX={marcasEvolucao(lista.filter((sn) => typeof sn.mesesAteFire === 'number'))}
                  formatValor={anoDecimalCurto}
                />
              </section>
            );
          })()}

          {lista.length >= 2 ? (
            <section className="pf-hero-card pf-card-graf">
              <span className="pf-eyebrow">Evolução do patrimônio</span>
              <p className="pf-hc-sub" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                {lista.length} meses lançados
              </p>
              <GraficoLinha
                pontos={lista.map((sn, i) => ({ t: i / (lista.length - 1), v: sn.patrimonioTotal }))}
                cor="#3FD69B"
                marcasX={marcasEvolucao(lista)}
                formatValor={formatBRLcompact}
              />
            </section>
          ) : (
            <section className="pf-hero-card">
              <span className="pf-eyebrow">Evolução do patrimônio</span>
              <div className="pf-vazio">
                <p>
                  {lista.length === 1
                    ? 'Seu 1º mês está registrado. Com dois pontos eu consigo desenhar a curva — e a partir daí ela é a sua letra, não uma projeção.'
                    : 'Ainda não há mês lançado. A curva aparece assim que houver dois — é ela que mostra se a sua data está andando.'}
                </p>
                <Link className="pf-btn pf-btn-ghost" to="/lancar" style={{ width: 'auto', padding: '0.6rem 1.2rem', textDecoration: 'none' }}>
                  {lista.length === 1 ? 'Lançar mais um mês' : 'Lançar meu primeiro mês'}
                </Link>
              </div>
            </section>
          )}
        </div>

        {/* Coluna direita: o que se lê */}
        <div className="pf-col-lado">
          <CardsInsights insights={insights} />
          <CardEconomico doc={doc} />
          <CardSemana card={daSemana} />
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

function Stat({ rot, val, tom }: { rot: string; val: string; tom?: 'mint' | 'ember' }) {
  return (
    <div className="pf-stat">
      <div className="rot">{rot}</div>
      <div className={`val ${tom ?? ''}`}>{val}</div>
    </div>
  );
}

/** Curva do patrimônio de hoje até a meta. */
function pontosProjecao(P: number, A: number, i: number, meses: number): PontoGrafico[] {
  const n = 40;
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = k / n;
    return { t, v: valorFuturo(P, A, i, meses * t) };
  });
}

function marcasProjecao(meses: number, dataFim: Date): MarcaX[] {
  const meio = new Date();
  meio.setMonth(meio.getMonth() + Math.round(meses / 2));
  return [
    { t: 0, rotulo: 'hoje' },
    { t: 0.5, rotulo: mesCurto(`${meio.getFullYear()}-${String(meio.getMonth() + 1).padStart(2, '0')}`) },
    { t: 1, rotulo: mesCurto(`${dataFim.getFullYear()}-${String(dataFim.getMonth() + 1).padStart(2, '0')}`) },
  ];
}

/** Até 4 marcas no eixo, distribuídas — funciona com 2 ou 36 meses. */
function marcasEvolucao(lista: Snapshot[]): MarcaX[] {
  const n = lista.length;
  if (n < 2) return [];
  const quantas = Math.min(4, n);
  const idx = Array.from({ length: quantas }, (_, k) => Math.round((k * (n - 1)) / (quantas - 1)));
  return [...new Set(idx)].map((i) => ({ t: i / (n - 1), rotulo: mesCurto(lista[i]!.mes) }));
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

/**
 * A data prevista em cada mês lançado, como ano decimal.
 *
 * `mesesAteFire` guardado é PRAZO, e prazo encurta sozinho com o tempo passando.
 * Somá-lo ao mês do lançamento converte pra DATA DE CHEGADA — que só se move
 * quando algo de fato muda. É a diferença entre um gráfico que sempre desce
 * (inútil) e um que mostra se você está ganhando terreno.
 */
function trajetoriaDaData(snapshots: readonly Snapshot[]): PontoGrafico[] {
  const comData = snapshots.filter((s) => typeof s.mesesAteFire === 'number');
  if (comData.length < 2) return [];
  return comData.map((s, i) => {
    const [ano, mes] = s.mes.split('-').map(Number);
    const totalMeses = (ano ?? 2026) * 12 + (mes ?? 1) - 1 + (s.mesesAteFire as number);
    return { t: i / (comData.length - 1), v: totalMeses / 12 };
  });
}

const MESES_ABREV_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** 2051.25 → "abr/51" */
function anoDecimalCurto(v: number): string {
  const ano = Math.floor(v);
  const mes = Math.min(11, Math.max(0, Math.round((v - ano) * 12)));
  return `${MESES_ABREV_CURTO[mes]}/${String(ano).slice(2)}`;
}
