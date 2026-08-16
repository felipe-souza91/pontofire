/**
 * Ícones do Ponto FIRE — traço fino, 24×24, `currentColor`.
 *
 * POR QUE ISTO EXISTE
 * O app usava 43 emoji diferentes como ícone. A landing do produto usa ZERO —
 * então além de ser o atalho que denuncia interface montada às pressas, era uma
 * costura visível entre as duas metades do mesmo produto.
 *
 * A régua do desenho: traço de 1.5 com pontas arredondadas, mesma família
 * geométrica da chama do §12, sem preenchimento. Conversa com a Space Mono dos
 * números — linha fina, nada de volume.
 *
 * As conquistas NÃO ganharam 17 desenhos. Elas viraram três famílias que
 * compartilham a forma e variam só o preenchimento (`Anel`, `Arco`, `Pilha`).
 * É a diferença entre um sistema e uma cartela de adesivos — e é justamente o
 * que faz a tela parecer desenhada em vez de montada.
 */

export type NomeIcone =
  // navegação e ações
  | 'casa' | 'lancar' | 'importar' | 'trofeu' | 'calculadora' | 'engrenagem'
  | 'sair' | 'fechar' | 'check' | 'editar' | 'olho' | 'alerta' | 'estrela'
  // conteúdo
  | 'balao' | 'lampada' | 'bug' | 'coracao' | 'grafico' | 'barras'
  | 'combustivel' | 'cartao' | 'banco' | 'raio' | 'balanca' | 'chama'
  // conquistas
  | 'broto' | 'arvore' | 'diamante' | 'pico' | 'calendario' | 'bandeira'
  | 'coroa' | 'barco' | 'trigo' | 'barraca' | 'medalha';

const CAMINHOS: Record<NomeIcone, string> = {
  casa: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-5.5h5V20',
  lancar: 'M4 20h16M5 15.5 15.5 5a2.1 2.1 0 0 1 3 3L8 18.5l-4 1z',
  importar: 'M12 3v10m0 0 3.5-3.5M12 13 8.5 9.5M4 16v3.5h16V16',
  trofeu: 'M7 4h10v5a5 5 0 0 1-10 0zM7 5.5H4V8a3 3 0 0 0 3 3m10-5.5h3V8a3 3 0 0 1-3 3M12 14v4m-3.5 2h7',
  calculadora: 'M5 3h14v18H5zM8 7h8M8 11h1m3.5 0h1m3.5 0h1M8 15h1m3.5 0h1m3.5 0h1M8 18.5h1m3.5 0h1',
  engrenagem: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M12 2.5l1.2 2.2 2.5-.4.6 2.4 2.3 1-1 2.3 1 2.3-2.3 1-.6 2.4-2.5-.4L12 21.5l-1.2-2.2-2.5.4-.6-2.4-2.3-1 1-2.3-1-2.3 2.3-1 .6-2.4 2.5.4z',
  sair: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h9',
  fechar: 'M6 6l12 12M18 6 6 18',
  check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
  editar: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM14.5 7.5l2 2',
  olho: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  alerta: 'M12 3.5 22 20H2zM12 10v4.5M12 17.2v.1',
  estrela: 'M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.9 9.4 9z',
  balao: 'M4 5h16v11H9l-5 4z',
  lampada: 'M9 17h6M10 20h4M8.5 14a5.5 5.5 0 1 1 7 0c-.7.6-1 1.3-1 2h-5c0-.7-.3-1.4-1-2',
  bug: 'M8 8a4 4 0 0 1 8 0M6 12h12M8 8h8v6a4 4 0 0 1-8 0zM4 9l2.5 1.5M20 9l-2.5 1.5M3.5 15l3-.8M20.5 15l-3-.8M6 20l2.5-2.5M18 20l-2.5-2.5',
  coracao: 'M12 20S3.5 14.5 3.5 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8.5 2.2C20.5 14.5 12 20 12 20',
  grafico: 'M3 20h18M5 20V9.5m4.7 10.5V5m4.6 15v-7.5M19 20V8',
  barras: 'M3 20h18M6.5 20v-6m5 6V7.5m5 12.5V11',
  combustivel: 'M4 20V5.5A1.5 1.5 0 0 1 5.5 4h6A1.5 1.5 0 0 1 13 5.5V20M2.5 20h12M6 8h5M16 9.5l2.5 2.5V17a1.5 1.5 0 0 0 3 0V9l-3-3',
  cartao: 'M2.5 6h19v12h-19zM2.5 10h19M6 14.5h3.5',
  banco: 'M3 9.5 12 4l9 5.5M4.5 9.5V18M9 9.5V18m6-8.5V18m4.5-8.5V18M3 20.5h18',
  raio: 'M13.5 2.5 5 13.5h6l-1.5 8L18 10.5h-6z',
  balanca: 'M12 4v16M8 20h8M12 6.5 4 9m8-2.5L20 9M4 9l-2.5 5.5a2.8 2.8 0 0 0 5 0zM20 9l-2.5 5.5a2.8 2.8 0 0 0 5 0z',
  chama: 'M12 3c-.6 5.6 4.6 6.9 4.6 13.7 0 5-2.4 4.8-4.6 4.8s-4.6.2-4.6-4.8c0-3.8 3.4-5 3.5-9.6',
  broto: 'M12 21v-7M12 14c0-3.3-2.5-5.5-5.5-5.5C6.5 12 8.7 14 12 14M12 14c0-2.8 2.2-4.8 5-4.8.2 3-2 4.8-5 4.8',
  arvore: 'M12 21v-5M12 16a6 6 0 1 1 0-12 6 6 0 0 1 0 12M8 19h8',
  diamante: 'M6 4h12l3.5 5L12 21 2.5 9zM2.5 9h19M9 4 6 9l6 12M15 4l3 5-6 12',
  pico: 'M2 20 9 7l4 6.5L15.5 10 22 20zM9 7l2 3.5M15.5 10l1.6 2.6',
  calendario: 'M4 6h16v14H4zM4 10h16M8.5 3.5V7M15.5 3.5V7',
  bandeira: 'M6 21V3.5M6 4.5h12l-2.5 4 2.5 4H6',
  coroa: 'M4 18h16M3.5 7 7 12l5-7.5L17 12l3.5-5-1.5 10H5z',
  barco: 'M12 3v10M12 5.5 18.5 13H12M3 16.5h18l-2.5 4h-13z',
  trigo: 'M12 21V9M12 9c-2.2 0-3.5-1.5-3.5-3.5C10.7 5.5 12 7 12 9m0 0c2.2 0 3.5-1.5 3.5-3.5C13.3 5.5 12 7 12 9M12 14c-2.2 0-3.5-1.5-3.5-3.5C10.7 10.5 12 12 12 14m0 0c2.2 0 3.5-1.5 3.5-3.5C13.3 10.5 12 12 12 14',
  barraca: 'M2.5 20 12 4l9.5 16zM12 4v16M12 20l-3.5-6M12 20l3.5-6',
  medalha: 'M8.5 2.5 12 9l3.5-6.5M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12M12 12.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 14.8l2.2-.3z',
};

export function Icone({
  nome,
  size = 20,
  className,
  title,
}: {
  nome: NomeIcone;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ flexShrink: 0 }}
    >
      {title && <title>{title}</title>}
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Famílias progressivas: mesma forma, o que muda é o quanto está preenchido.

const TAU = Math.PI * 2;

/** Anel segmentado — sequência (3, 6, 12 meses no azul). */
export function Anel({ total, cheios, size = 20 }: { total: number; cheios: number; size?: number }) {
  const r = 8.5;
  const passo = TAU / total;
  const vao = 0.14;
  return (
    <Base size={size}>
      {Array.from({ length: total }, (_, k) => {
        const a0 = -TAU / 4 + k * passo + vao / 2;
        const a1 = a0 + passo - vao;
        const grande = passo - vao > Math.PI ? 1 : 0;
        return (
          <path
            key={k}
            d={`M ${12 + r * Math.cos(a0)} ${12 + r * Math.sin(a0)} A ${r} ${r} 0 ${grande} 1 ${12 + r * Math.cos(a1)} ${12 + r * Math.sin(a1)}`}
            opacity={k < cheios ? 1 : 0.25}
          />
        );
      })}
    </Base>
  );
}

/** Arco proporcional — progresso rumo à meta (10%, 25%, 50%, 75%). */
export function Arco({ fracao, size = 20 }: { fracao: number; size?: number }) {
  const r = 8.5;
  const f = Math.max(0.02, Math.min(1, fracao));
  const a1 = -TAU / 4 + f * TAU;
  const grande = f > 0.5 ? 1 : 0;
  return (
    <Base size={size}>
      <circle cx={12} cy={12} r={r} opacity={0.25} />
      <path d={`M 12 ${12 - r} A ${r} ${r} 0 ${grande} 1 ${12 + r * Math.cos(a1)} ${12 + r * Math.sin(a1)}`} />
    </Base>
  );
}

/** Pilha crescente — marcos de patrimônio (100k → 5 mi). */
export function Pilha({ camadas, size = 20 }: { camadas: number; size?: number }) {
  const n = Math.max(1, Math.min(4, camadas));
  return (
    <Base size={size}>
      {Array.from({ length: 4 }, (_, k) => {
        const y = 19 - k * 4;
        const meia = 3 + k * 1.6;
        return (
          <path
            key={k}
            d={`M ${12 - meia} ${y} h ${meia * 2}`}
            opacity={k < n ? 1 : 0.2}
            strokeWidth={2.4}
          />
        );
      })}
    </Base>
  );
}

function Base({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}
