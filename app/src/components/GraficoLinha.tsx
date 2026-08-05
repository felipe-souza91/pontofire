import { useId } from 'react';

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
 * Gráfico de linha com escala e eixos legíveis.
 * O traçado vai num SVG esticado (preserveAspectRatio=none) e os rótulos são
 * HTML por cima — assim o gráfico ocupa toda a largura sem deformar o texto.
 */
export function GraficoLinha({
  pontos,
  cor,
  meta,
  rotuloMeta,
  marcasX,
  formatValor,
  altura = 170,
  /** força o eixo Y a começar no zero (senão usa a faixa dos dados) */
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
  const lo = desdeZero ? 0 : minDado - (maxDado - minDado || maxDado) * 0.12;
  const hi = maxDado + (maxDado - lo) * 0.08;

  const W = 100;
  const H = 100;
  const x = (t: number) => t * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;

  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'} ${x(p.t).toFixed(2)} ${y(p.v).toFixed(2)}`).join(' ');
  const area = `${linha} L ${W} ${H} L 0 ${H} Z`;
  const ultimo = pontos[pontos.length - 1]!;

  // 3 linhas de grade horizontais
  const grade = [0.25, 0.5, 0.75].map((f) => lo + (hi - lo) * f);

  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <div style={{ position: 'relative', height: altura }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={cor} stopOpacity="0.26" />
              <stop offset="1" stopColor={cor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {grade.map((v) => (
            <line
              key={v}
              x1="0"
              y1={y(v)}
              x2={W}
              y2={y(v)}
              stroke="var(--line)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {meta !== undefined && meta <= hi && (
            <line
              x1="0"
              y1={y(meta)}
              x2={W}
              y2={y(meta)}
              stroke="var(--mint)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
              opacity="0.8"
            />
          )}

          <path d={area} fill={`url(#${gradId})`} />
          <path
            d={linha}
            fill="none"
            stroke={cor}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={x(ultimo.t)} cy={y(ultimo.v)} r="3" fill={cor} vectorEffect="non-scaling-stroke" />
        </svg>

        {/* rótulos do eixo Y (HTML por cima, texto sempre nítido) */}
        <span style={rotuloY(0)}>{formatValor(hi)}</span>
        {meta !== undefined && meta <= hi && (
          <span style={{ ...rotuloY(((y(meta) / H) * 100)), color: 'var(--mint)' }}>
            {rotuloMeta ?? formatValor(meta)}
          </span>
        )}
        <span style={rotuloY(100)}>{formatValor(lo)}</span>
      </div>

      {/* eixo X */}
      <div style={{ position: 'relative', height: 18, marginTop: 4 }}>
        {marcasX.map((m) => (
          <span
            key={m.rotulo + m.t}
            className="mono"
            style={{
              position: 'absolute',
              left: `${m.t * 100}%`,
              transform: m.t === 0 ? 'none' : m.t === 1 ? 'translateX(-100%)' : 'translateX(-50%)',
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

function rotuloY(pctTopo: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: 0,
    top: `${pctTopo}%`,
    transform: pctTopo >= 99 ? 'translateY(-100%)' : pctTopo <= 1 ? 'none' : 'translateY(-50%)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.66rem',
    color: 'var(--muted)',
    background: 'rgba(12,15,46,.72)',
    padding: '0 4px',
    borderRadius: 3,
    pointerEvents: 'none',
  };
}
