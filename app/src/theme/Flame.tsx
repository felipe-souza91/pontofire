import { useId } from 'react';

type FlameProps = {
  size?: number;
  /** liga o flicker de vela (respeita prefers-reduced-motion via CSS) */
  flicker?: boolean;
  title?: string;
  className?: string;
};

/**
 * Chama padronizada do Ponto FIRE (§12) — usar em logo, ícone e favicon.
 * Gradiente #FFB27A → #FF7A45 → #E85A2A, com brilho interno #FFD9B8.
 */
export function Flame({ size = 48, flicker = false, title = 'Ponto FIRE', className }: FlameProps) {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 126"
      role="img"
      aria-label={title}
      className={[flicker ? 'flame-flicker' : '', className].filter(Boolean).join(' ')}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={gradId} x1="50" y1="6" x2="50" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFB27A" />
          <stop offset="0.55" stopColor="#FF7A45" />
          <stop offset="1" stopColor="#E85A2A" />
        </linearGradient>
      </defs>
      {/* corpo */}
      <path
        d="M50 6 C 47 34, 73 42, 73 76 C 73 101, 61 120, 50 120 C 39 120, 27 103, 27 78 C 27 59, 44 53, 45 30 C 45.5 21, 48 12, 50 6 Z"
        fill={`url(#${gradId})`}
      />
      {/* brilho interno */}
      <path
        d="M53 52 C 51 67, 62 71, 62 87 C 62 101, 55 111, 49 111 C 43 111, 38 102, 38 91 C 38 81, 47 77, 47 65 C 47 60, 51 55, 53 52 Z"
        fill="#FFD9B8"
      />
    </svg>
  );
}
