import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { escalaLegivel } from '../utils/escala';

export interface SerieGrafico {
  id: string;
  nome: string;
  /** nome enxuto pro tooltip, onde a largura é disputada com o próprio gráfico */
  curto?: string;
  cor: string;
  /** um valor por posição do eixo X; `null` = sem dado ali (a linha quebra) */
  valores: readonly (number | null)[];
  /** a série de que o gráfico trata: traço mais grosso, área e pontos */
  principal?: boolean;
  /** estimativa ou projeção — pontilhada, porque não é dado medido */
  estimada?: boolean;
  /** fica fora da legenda e da tabela (ex.: o trecho estimado da própria série) */
  auxiliar?: boolean;
}

export interface MarcaX {
  /** posição 0..1 */
  t: number;
  rotulo: string;
}

/**
 * Gráfico de linha — várias séries, leitura por ponto, tabela.
 *
 * O QUE MUDOU E POR QUÊ
 * A versão anterior era uma figura: uma curva, três rótulos de eixo e nenhum
 * jeito de saber quanto valia cada ponto. Feedback do beta: "os pontos não têm
 * os números". Colar um número em cada ponto não é a resposta (14 rótulos em
 * cima de uma linha é ruído); a resposta é o gráfico responder quando você
 * aponta pra ele.
 *
 * - Passe o dedo ou o mouse: uma régua vertical gruda no ponto mais próximo e
 *   mostra o valor de TODAS as séries naquele mês. Mira-se num mês, não numa
 *   linha de 2px.
 * - Teclado: Tab foca o gráfico; ← → andam ponto a ponto; Home/End, Esc.
 * - A legenda é viva: sem nada apontado ela mostra o último valor de cada
 *   série; apontando, o do ponto. Então o número está na tela mesmo sem hover.
 * - "ver em tabela" abre os mesmos números em linhas — nada fica preso atrás de
 *   um gesto, e leitor de tela tem o que ler.
 *
 * COMO É DESENHADO
 * O traçado vai num SVG esticado (`preserveAspectRatio="none"`): só linhas, que
 * com `vector-effect` não deformam. Tudo que tem forma — pontos, rótulos,
 * régua, tooltip — é HTML posicionado em porcentagem por cima. Assim o gráfico
 * ocupa a largura que tiver sem medir nada em JavaScript.
 */
export function GraficoLinha({
  titulo,
  series,
  rotulos,
  marcasX,
  formatValor,
  formatEixo = formatValor,
  meta,
  rotuloMeta,
  desdeZero = false,
  passos,
  altura = 240,
  detalhe,
  marcadores,
  vazados,
}: {
  /** o que o gráfico mostra — vira o nome acessível */
  titulo: string;
  series: readonly SerieGrafico[];
  /** rótulo completo de cada posição ("out/2026") — tooltip e tabela */
  rotulos: readonly string[];
  marcasX: readonly MarcaX[];
  /** valor exato (tooltip, legenda, tabela) */
  formatValor: (v: number) => string;
  /** valor resumido (eixo). Padrão: o mesmo do exato */
  formatEixo?: (v: number) => string;
  meta?: number;
  rotuloMeta?: string;
  desdeZero?: boolean;
  passos?: readonly number[];
  altura?: number;
  /** linhas extras do tooltip pra posição `i` (rendimento do mês, observação…) */
  detalhe?: (i: number) => ReactNode;
  /** linhas verticais anotadas (ex.: a idade do INSS) */
  marcadores?: readonly MarcaX[];
  /** posições desenhadas com ponto vazado (ex.: mês atípico) */
  vazados?: ReadonlySet<number>;
}) {
  const gradId = useId();
  const plot = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState<number | null>(null);

  const n = rotulos.length;
  const visiveis = series.filter((s) => !s.auxiliar);
  const principal = series.find((s) => s.principal) ?? series[0];

  const escala = useMemo(() => {
    const todos = series.flatMap((s) => s.valores.filter((v): v is number => v !== null));
    if (todos.length === 0) return null;
    const max = Math.max(...todos, meta ?? -Infinity);
    return escalaLegivel(Math.min(...todos), max, { desdeZero, passos });
  }, [series, meta, desdeZero, passos]);

  if (!escala || n < 2 || !principal) return null;

  const { lo, hi, ticks } = escala;
  const tx = (i: number) => (n > 1 ? i / (n - 1) : 0.5);
  /** posição vertical em % a partir do topo */
  const py = (v: number) => (1 - (v - lo) / (hi - lo)) * 100;

  const caminho = (valores: readonly (number | null)[]): string => {
    let d = '';
    let aberto = false;
    valores.forEach((v, i) => {
      if (v === null) {
        aberto = false;
        return;
      }
      d += `${aberto ? 'L' : 'M'} ${(tx(i) * 100).toFixed(2)} ${py(v).toFixed(2)} `;
      aberto = true;
    });
    return d;
  };

  /** área só sob o trecho contínuo inicial da série principal */
  const area = (() => {
    const pts = principal.valores
      .map((v, i) => (v === null ? null : { x: tx(i) * 100, y: py(v) }))
      .filter((p): p is { x: number; y: number } => p !== null);
    if (pts.length < 2) return '';
    const corpo = pts.map((p, k) => `${k ? 'L' : 'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    return `${corpo} L ${pts[pts.length - 1]!.x.toFixed(2)} 100 L ${pts[0]!.x.toFixed(2)} 100 Z`;
  })();

  const ultimoDe = (s: SerieGrafico): { i: number; v: number } | null => {
    for (let i = s.valores.length - 1; i >= 0; i--) {
      const v = s.valores[i];
      if (v !== null && v !== undefined) return { i, v };
    }
    return null;
  };

  const fimPrincipal = ultimoDe(principal);
  // um ponto por mês só quando são poucos: com 40 amostras vira colar de contas
  const mostraPontos = n <= 24;

  function apontar(e: PointerEvent<HTMLDivElement>) {
    const caixa = plot.current?.getBoundingClientRect();
    if (!caixa || caixa.width === 0) return;
    const fr = Math.min(1, Math.max(0, (e.clientX - caixa.left) / caixa.width));
    setAtivo(Math.round(fr * (n - 1)));
  }

  function teclar(e: KeyboardEvent<HTMLDivElement>) {
    const atual = ativo ?? n - 1;
    const destino =
      e.key === 'ArrowLeft' ? Math.max(0, atual - 1)
        : e.key === 'ArrowRight' ? Math.min(n - 1, atual + 1)
          : e.key === 'Home' ? 0
            : e.key === 'End' ? n - 1
              : null;
    if (e.key === 'Escape') {
      setAtivo(null);
      return;
    }
    if (destino === null) return;
    e.preventDefault();
    setAtivo(destino);
  }

  const temMeta = meta !== undefined && meta <= hi && meta >= lo;
  const extra = ativo !== null ? detalhe?.(ativo) : null;

  return (
    <div className="pf-graf">
      {/* Legenda viva. Com uma série só ela não existe: o título já diz o que é. */}
      {visiveis.length >= 2 && (
        <ul className="pf-graf-legenda">
          {visiveis.map((s) => {
            const fim = ultimoDe(s);
            const v = ativo !== null ? s.valores[ativo] ?? null : fim?.v ?? null;
            return (
              <li key={s.id}>
                <i
                  className={s.estimada ? 'pontilhada' : ''}
                  style={{ borderColor: s.cor, borderTopWidth: s.principal ? 3 : 2 }}
                />
                <span>{s.nome}</span>
                <b className="mono">{v === null ? '—' : formatValor(v)}</b>
              </li>
            );
          })}
        </ul>
      )}

      <div className="pf-graf-corpo">
        {/* eixo Y na própria coluna — antes os rótulos ficavam EM CIMA da curva */}
        <div className="pf-graf-eixo-y" style={{ height: altura }} aria-hidden>
          {/* o rótulo mais largo, invisível, é quem dá a largura da coluna */}
          <span className="medida">
            {ticks.map(formatEixo).reduce((a, b) => (b.length > a.length ? b : a), '')}
          </span>
          {ticks.map((t) => (
            <span key={t} style={{ top: `${py(t)}%` }}>{formatEixo(t)}</span>
          ))}
        </div>

        <div
          ref={plot}
          className="pf-graf-plot"
          style={{ height: altura }}
          role="group"
          tabIndex={0}
          aria-label={`${titulo}. Use as setas pra percorrer os pontos; os valores também estão na tabela abaixo.`}
          onPointerMove={apontar}
          onPointerDown={apontar}
          onPointerLeave={(e) => {
            // no toque o dedo sai da tela ao soltar: o valor fica pra ser lido
            if (e.pointerType === 'mouse') setAtivo(null);
          }}
          onBlur={() => setAtivo(null)}
          onKeyDown={teclar}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pf-graf-svg" aria-hidden>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                {/* via `style`: a cor é um token (`var(--serie-…)`), e var() em atributo
                    de apresentação não é garantido em todo navegador */}
                <stop offset="0" style={{ stopColor: principal.cor }} stopOpacity="0.2" />
                <stop offset="1" style={{ stopColor: principal.cor }} stopOpacity="0" />
              </linearGradient>
            </defs>

            {ticks.map((t) => (
              <line key={t} x1="0" y1={py(t)} x2="100" y2={py(t)} className="grade" vectorEffect="non-scaling-stroke" />
            ))}

            {temMeta && (
              <line x1="0" y1={py(meta!)} x2="100" y2={py(meta!)} className="meta" vectorEffect="non-scaling-stroke" />
            )}

            {area && <path d={area} fill={`url(#${gradId})`} />}

            {/* a principal por último: ela passa por cima das réguas */}
            {[...series].sort((a, b) => Number(!!a.principal) - Number(!!b.principal)).map((s) => (
              <path
                key={s.id}
                d={caminho(s.valores)}
                fill="none"
                style={{ stroke: s.cor }}
                strokeWidth={s.principal ? 2.5 : 1.75}
                strokeDasharray={s.estimada ? '2 5' : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {temMeta && (
            <span className="pf-graf-meta" style={{ top: `${py(meta!)}%` }}>
              {rotuloMeta ?? formatValor(meta!)}
            </span>
          )}

          {marcadores?.map((m) => (
            <span key={m.rotulo} className="pf-graf-marcador" style={{ left: `${m.t * 100}%` }}>
              <em style={m.t > 0.7 ? { right: 6 } : { left: 6 }}>{m.rotulo}</em>
            </span>
          ))}

          {/* pontos medidos da série principal */}
          {mostraPontos &&
            principal.valores.map((v, i) =>
              v === null || i === fimPrincipal?.i ? null : (
                <span
                  key={i}
                  className={`pf-graf-ponto ${vazados?.has(i) ? 'vazado' : ''}`}
                  style={{ left: `${tx(i) * 100}%`, top: `${py(v)}%`, ['--cor' as string]: principal.cor }}
                />
              ),
            )}

          {/* o último ponto medido é o "você está aqui" */}
          {fimPrincipal && (
            <span
              className="pf-graf-ponto fim"
              style={{ left: `${tx(fimPrincipal.i) * 100}%`, top: `${py(fimPrincipal.v)}%`, ['--cor' as string]: principal.cor }}
            />
          )}

          {ativo !== null && (
            <>
              <span className="pf-graf-regua" style={{ left: `${tx(ativo) * 100}%` }} />
              {series.map((s) => {
                const v = s.valores[ativo];
                return v === null || v === undefined ? null : (
                  <span
                    key={s.id}
                    className="pf-graf-ponto ativo"
                    style={{ left: `${tx(ativo) * 100}%`, top: `${py(v)}%`, ['--cor' as string]: s.cor }}
                  />
                );
              })}

              {/* fica do lado oposto ao ponto, pra nunca cobrir o que se está lendo */}
              <div
                className="pf-graf-dica"
                role="status"
                style={
                  tx(ativo) > 0.5
                    ? { right: `calc(${(1 - tx(ativo)) * 100}% + 12px)` }
                    : { left: `calc(${tx(ativo) * 100}% + 12px)` }
                }
              >
                <strong>{rotulos[ativo]}</strong>
                {series.map((s) => {
                  const v = s.valores[ativo];
                  return v === null || v === undefined ? null : (
                    <div key={s.id} className="linha">
                      <i className={s.estimada ? 'pontilhada' : ''} style={{ borderColor: s.cor }} />
                      <b className="mono">{formatValor(v)}</b>
                      <span>{s.curto ?? s.nome}</span>
                    </div>
                  );
                })}
                {extra && <div className="extra">{extra}</div>}
              </div>
            </>
          )}
        </div>

        {/* segunda linha da grade: o eixo X fica alinhado ao plot, não ao card */}
        <span aria-hidden />
        <div className="pf-graf-eixo-x" aria-hidden>
          {marcasX.map((m) => (
            <span
              key={m.rotulo + m.t}
              className="mono"
              style={{
                left: `${m.t * 100}%`,
                transform: m.t <= 0.01 ? 'none' : m.t >= 0.99 ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {m.rotulo}
            </span>
          ))}
        </div>
      </div>

      <details className="pf-graf-tabela">
        <summary>ver em tabela</summary>
        <div className="rolagem">
          <table>
            <thead>
              <tr>
                <th scope="col">Período</th>
                {visiveis.map((s) => (
                  <th key={s.id} scope="col">{s.nome}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* mais recente em cima: é o que se procura primeiro */}
              {rotulos.map((_, k) => {
                const i = n - 1 - k;
                return (
                  <tr key={i}>
                    <th scope="row">{rotulos[i]}</th>
                    {visiveis.map((s) => {
                      const v = s.valores[i];
                      return <td key={s.id} className="mono">{v === null || v === undefined ? '—' : formatValor(v)}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
