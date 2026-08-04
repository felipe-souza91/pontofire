import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  coberturaPassiva,
  jaEhCoastFire,
  patrimonioCoast,
  valorFuturo,
  type PlanoFire,
} from '@pontofire/engine';
import { useAuth } from '../auth/useAuth';
import { usePainel, idadeDe } from '../hooks/usePainel';
import { useConquistas } from '../hooks/useConquistas';
import type { UserDoc } from '../data/types';
import type { Snapshot } from '../data/snapshots';
import { Flame } from '../theme/Flame';
import { gerarInsights, conquistasAtingidas } from '@pontofire/insights';
import { CardINSS } from '../components/CardINSS';
import { CardEconomico } from '../components/CardEconomico';
import { CardsInsights } from '../components/CardsInsights';
import { TrofeusResumo } from '../components/TrofeusResumo';
import { formatBRLcompact, formatDuracao, formatMesAno, formatPct } from '../utils/format';

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function mesCurto(m: string): string {
  const [ano, mm] = m.split('-');
  return `${MESES_ABREV[parseInt(mm ?? '1', 10) - 1]}/${(ano ?? '').slice(2)}`;
}

export function Dashboard() {
  const { user, sair } = useAuth();
  const { doc, plano, ctx, P, R, netWorth, snapshots: lista, ultimo, bens, carregando } = usePainel(
    user?.uid ?? null,
  );
  const atingidas = ctx ? conquistasAtingidas(ctx) : [];
  const { salvas } = useConquistas(user?.uid ?? null, atingidas);
  const trofeus = new Set([...atingidas, ...salvas]);

  if (carregando) return <Centro>Carregando…</Centro>;
  if (!doc || !plano || !ctx) return <Centro>Sem dados ainda.</Centro>;

  const saudacao = doc.apelido || doc.nome?.split(' ')[0] || 'você';
  const progressoPct = Math.min(100, Math.max(0, plano.progresso * 100));

  const mostraProjecao = plano.status === 'ok' && plano.meses !== null;

  // assistente (§7): catálogo de regras determinístico
  const temCardCoast = !!doc.idadeAlvo && idadeDe(doc.dataNascimento) !== undefined;
  const insights = gerarInsights(
    ctx,
    {
      moeda: (v) => formatBRLcompact(v),
      duracao: (m) => formatDuracao(m),
      pct: (v) => formatPct(v, 0),
    },
    // o Coast já tem card dedicado; não repetir a mesma notícia
    { limite: 4, excluir: temCardCoast ? ['coast-atingido'] : [] },
  );

  const stats: { rot: string; val: string; tom?: 'mint' | 'ember' }[] = [
    { rot: 'Número FIRE', val: formatBRLcompact(doc.metaFire) },
    { rot: 'Renda ao atingir', val: `${formatBRLcompact(plano.saqueMensalSustentavel)}/mês`, tom: 'mint' },
  ];
  if (bens.length > 0) {
    stats.push({ rot: 'Patrimônio líquido', val: formatBRLcompact(netWorth), tom: 'mint' });
  }
  if (ultimo) {
    stats.push({ rot: 'Taxa de poupança', val: formatPct(ultimo.taxaPoupanca), tom: 'mint' });
  }
  if (R > 0) {
    stats.push({ rot: 'Cobertura passiva', val: formatPct(coberturaPassiva(R, doc.custoVidaMensal)), tom: 'mint' });
  }
  stats.push({ rot: 'Aporte mensal', val: `${formatBRLcompact(doc.aporteMensal)}/mês` });
  stats.push({ rot: 'Retorno real a.a.', val: formatPct(doc.retornoRealEsperado), tom: 'ember' });

  return (
    <main className="pf-dash">
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-8)', position: 'relative', zIndex: 1 }}>
        <Flame size={30} />
        <strong className="pf-logo" style={{ flex: 1 }}>Ponto FIRE</strong>
        <span className="pf-pill">beta fechado</span>
        <Link className="pf-btn-link" to="/lancar">Lançar</Link>
        <Link className="pf-btn-link" to="/bens">Bens</Link>
        <Link className="pf-btn-link" to="/conquistas">Conquistas</Link>
        <Link className="pf-btn-link" to="/ferramentas">Ferramentas</Link>
        <Link className="pf-btn-link" to="/perfil">Perfil</Link>
        <button className="pf-btn-link" onClick={() => void sair()}>Sair</button>
      </header>

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

        <div className="pf-bar">
          <i style={{ width: `${progressoPct}%` }} />
        </div>
        <div className="pf-bar-row">
          <span>{formatBRLcompact(P)}</span>
          <span>
            meta {formatBRLcompact(doc.metaFire)} · {progressoPct.toFixed(0)}%
          </span>
        </div>
      </section>

      <div className="pf-cols-2" style={{ marginTop: 'var(--space-4)' }}>
        {/* Coluna esquerda: números + evolução */}
        <div style={{ display: 'grid', gap: 'var(--space-4)', alignContent: 'start' }}>
          <div className="pf-stats">
            {stats.map((s) => (
              <Stat key={s.rot} rot={s.rot} val={s.val} tom={s.tom} />
            ))}
          </div>

          {lista.length >= 1 && (
            <section className="pf-hero-card">
              <span className="pf-eyebrow">Evolução do patrimônio</span>
              {lista.length >= 2 ? (
                <>
                  <p className="pf-hc-sub" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                    {lista.length} meses lançados
                  </p>
                  <GraficoEvolucao lista={lista} />
                  <div className="pf-bar-row">
                    <span>{mesCurto(lista[0]!.mes)} · {formatBRLcompact(lista[0]!.patrimonioTotal)}</span>
                    <span>{mesCurto(lista[lista.length - 1]!.mes)} · {formatBRLcompact(lista[lista.length - 1]!.patrimonioTotal)}</span>
                  </div>
                </>
              ) : (
                <p className="pf-hc-sub" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                  seu 1º mês está registrado — lance mais um pra ver a curva crescer.
                </p>
              )}
            </section>
          )}
        </div>

        {/* Coluna direita: projeção + insight */}
        <div style={{ display: 'grid', gap: 'var(--space-4)', alignContent: 'start' }}>
          {mostraProjecao && (
            <section className="pf-hero-card">
              <span className="pf-eyebrow">Projeção do patrimônio</span>
              <p className="pf-hc-sub" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                do valor de hoje até a meta, no seu ritmo
              </p>
              <GraficoProjecao P={P} A={doc.aporteMensal} i={plano.iMensal} M={doc.metaFire} meses={plano.meses!} />
            </section>
          )}
          <CardsInsights insights={insights} />
          <Coast doc={doc} plano={plano} P={P} />
          <CardINSS doc={doc} plano={plano} />
          <CardEconomico doc={doc} />
          {doc.retornoRealEsperado > 0.07 && (
            <p className="pf-hint" style={{ margin: 0 }}>
              ⚠️ {formatPct(doc.retornoRealEsperado)} de retorno real ao ano é otimista — no Brasil o
              juro real de longo prazo costuma ser menor. Vale simular um cenário mais conservador.
            </p>
          )}
        </div>
      </div>

      {!ultimo ? (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
          <Link className="pf-btn pf-btn-primary" to="/lancar" style={{ display: 'inline-flex', width: 'auto', padding: '0.85rem 2rem', textDecoration: 'none' }}>
            Lançar meu primeiro mês
          </Link>
          <p className="pf-hint" style={{ marginTop: 'var(--space-3)' }}>
            Registre um mês pra ver taxa de poupança e evolução — e sua data começar a andar sozinha.
          </p>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
          <Link className="pf-btn-link" to="/lancar">+ Lançar novo mês</Link>
        </div>
      )}
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

function Coast({ doc, plano, P }: { doc: UserDoc; plano: PlanoFire; P: number }) {
  const idadeAtual = idadeDe(doc.dataNascimento);
  if (
    !doc.idadeAlvo ||
    idadeAtual === undefined ||
    doc.idadeAlvo <= idadeAtual ||
    plano.status !== 'ok' ||
    plano.idadeNaLiberdade === null
  ) {
    return null;
  }

  const mesesAlvo = (doc.idadeAlvo - idadeAtual) * 12;
  const coast = patrimonioCoast(doc.metaFire, plano.iMensal, mesesAlvo);
  const jaCoast = jaEhCoastFire(P, doc.metaFire, plano.iMensal, mesesAlvo);
  const idadeLib = Math.round(plano.idadeNaLiberdade);
  const antes = doc.idadeAlvo - idadeLib;

  return (
    <div className="pf-stat" style={{ borderColor: 'rgba(63,214,155,0.3)' }}>
      <div className="rot">Sua meta de idade · {doc.idadeAlvo} anos</div>
      <p style={{ margin: 'var(--space-2) 0 0', fontSize: '0.95rem', lineHeight: 1.5 }}>
        {antes > 0 ? (
          <>
            No seu ritmo você chega <span style={{ color: 'var(--mint)' }}>aos {idadeLib}</span> —{' '}
            {formatDuracao(antes * 12)} antes da sua meta.{' '}
          </>
        ) : (
          <>No seu ritmo você chega aos {idadeLib}. </>
        )}
        {jaCoast ? (
          <span className="pf-insight" style={{ display: 'inline', border: 0, padding: 0, background: 'none', color: 'var(--mint)' }}>
            Você já é CoastFIRE: podia parar de aportar hoje e ainda bateria a meta aos {doc.idadeAlvo},
            só com os juros.
          </span>
        ) : (
          <>
            Pra bater a meta aos {doc.idadeAlvo} sem novos aportes, precisaria de{' '}
            <span style={{ color: 'var(--ember-2)' }}>{formatBRLcompact(coast)}</span> investidos hoje.
          </>
        )}
      </p>
    </div>
  );
}

function GraficoProjecao({ P, A, i, M, meses }: { P: number; A: number; i: number; M: number; meses: number }) {
  const w = 100;
  const h = 42;
  const n = 48;
  const pts = Array.from({ length: n + 1 }, (_, k) => {
    const t = (meses * k) / n;
    return { x: (t / meses) * w, v: valorFuturo(P, A, i, t) };
  });
  const maxV = Math.max(M, pts[pts.length - 1]!.v) * 1.02;
  const y = (v: number) => h - (v / maxV) * h;
  const linha = pts.map((p, idx) => `${idx ? 'L' : 'M'} ${p.x.toFixed(2)} ${y(p.v).toFixed(2)}`).join(' ');
  const area = `${linha} L ${w} ${h} L 0 ${h} Z`;
  const metaY = y(M);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '130px', marginTop: 'var(--space-3)', display: 'block' }} aria-hidden>
      <defs>
        <linearGradient id="pf-proj" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF7A45" stopOpacity="0.28" />
          <stop offset="1" stopColor="#FF7A45" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* linha da meta */}
      <line x1="0" y1={metaY} x2={w} y2={metaY} stroke="#3FD69B" strokeWidth="1" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" opacity="0.7" />
      <path d={area} fill="url(#pf-proj)" />
      <path d={linha} fill="none" stroke="#FF7A45" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function GraficoEvolucao({ lista }: { lista: Snapshot[] }) {
  const w = 100;
  const h = 42;
  const n = lista.length;
  const vals = lista.map((s) => s.patrimonioTotal);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  // escala nos PRÓPRIOS dados (com folga) para o movimento aparecer
  const span = max - min || max || 1;
  const lo = min - span * 0.18;
  const hi = max + span * 0.18;
  const x = (i: number) => (i / (n - 1)) * w;
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * h;
  const pts = lista.map((s, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(2)} ${y(s.patrimonioTotal).toFixed(2)}`).join(' ');
  const area = `${pts} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '120px', marginTop: 'var(--space-3)', display: 'block' }} aria-hidden>
      <defs>
        <linearGradient id="pf-evo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3FD69B" stopOpacity="0.26" />
          <stop offset="1" stopColor="#3FD69B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#pf-evo)" />
      <path d={pts} fill="none" stroke="#3FD69B" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Centro({ children }: { children: ReactNode }) {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
      {children}
    </main>
  );
}
