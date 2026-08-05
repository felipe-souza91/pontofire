import { useId, type CSSProperties } from 'react';

export interface PontoGrafico {
  /** posição no eixo X (0..1) */
  t: number;
  /** valor no eixo Y */
  v: number;
}

export interface MarcaX {
  /** posição 0..1 */
  t: number;
  rotulo: string;
}

/**
 * Gráfico de linha com escala legível.
 * O traçado vai num SVG esticado (preserveAspectRatio=none) — só strokes, que
 * não deformam — e rótulos/ponto final são HTML por cima, sempre nítidos.
 */
export function GraficoLinha({
  pontos,
  cor,
  meta,
  rotuloMeta,
  marcasX,
  formatValor,
  altura = 170,
  desdeZero = false,
}: {
  pontos: PontoGrafico[];
  cor: string;
  meta?: number;
  rotuloMeta?: string;
  marcasX: MarcaX[];
  formatValor: (v: number) => string;
  altura?: number;
  desdeZero?: boolean;
}) {
  const gradId = useId();
  if (pontos.length < 2) return null;

  const vals = pontos.map((p) => p.v);
  const maxDado = Math.max(...vals, meta ?? -Infinity);
  const minDado = Math.min(...vals);
  const lo = desdeZero ? 0 : minDado - (maxDado - minDado || maxDado) * 0.15;
  const hi = maxDado + (maxDado - lo) * 0.1;

  const W = 100;
  const H = 100;
  const x = (t: number) => t * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const pctY = (v: number) => (y(v) / H) * 100;

  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'} ${x(p.t).toFixed(2)} ${y(p.v).toFixed(2)}`).join(' ');
  const area = `${linha} L ${W} ${H} L 0 ${H} Z`;
  const ultimo = pontos[pontos.length - 1]!;

  const temMeta = meta !== undefined && meta <= hi;
  // se a meta está colada no topo, o rótulo do topo vira ruído duplicado
  const mostraTopo = !temMeta || pctY(meta!) > 14;
  const grade = [0.25, 0.5, 0.75].map((f) => lo + (hi - lo) * f);

  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <div style={{ position: 'relative', height: altura }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={cor} stopOpacity="0.24" />
              <stop offset="1" stopColor={cor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {grade.map((v) => (
            <line key={v} x1="0" y1={y(v)} x2={W} y2={y(v)} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}

          {temMeta && (
            <line
              x1="0"
              y1={y(meta!)}
              x2={W}
              y2={y(meta!)}
              stroke="var(--mint)"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              opacity="0.85"
            />
          )}

          <path d={area} fill={`url(#${gradId})`} />
          <path d={linha} fill="none" stroke={cor} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>

        {/* ponto final — HTML, então é um círculo de verdade e não é cortado */}
        <span
          style={{
            position: 'absolute',
            left: `${ultimo.t * 100}%`,
            top: `${pctY(ultimo.v)}%`,
            transform: 'translate(-50%, -50%)',
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: cor,
            boxShadow: '0 0 0 3px var(--ink-2)',
            pointerEvents: 'none',
          }}
        />

        {/* eixo Y */}
        {mostraTopo && <span style={rotuloY(0)}>{formatValor(hi)}</span>}
        {temMeta && (
          <span style={{ ...rotuloY(pctY(meta!)), color: 'var(--mint)' }}>
            {rotuloMeta ?? formatValor(meta!)}
          </span>
        )}
        <span style={rotuloY(100)}>{formatValor(lo)}</span>
      </div>

      {/* eixo X */}
      <div style={{ position: 'relative', height: 16, marginTop: 6 }}>
        {marcasX.map((m) => (
          <span
            key={m.rotulo + m.t}
            className="mono"
            style={{
              position: 'absolute',
              left: `${m.t * 100}%`,
              transform: m.t === 0 ? 'none' : m.t >= 0.99 ? 'translateX(-100%)' : 'translateX(-50%)',
              fontSize: '0.68rem',
              color: 'var(--muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {m.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

function rotuloY(pctTopo: number): CSSProperties {
  const noTopo = pctTopo <= 1;
  const naBase = pctTopo >= 99;
  return {
    position: 'absolute',
    left: 0,
    top: `${pctTopo}%`,
    transform: naBase ? 'translateY(-100%)' : noTopo ? 'none' : 'translateY(-50%)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.66rem',
    color: 'var(--muted)',
    background: 'var(--ink-2)',
    padding: '1px 5px',
    borderRadius: 3,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  };
}
