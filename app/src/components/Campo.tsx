import type { ReactNode } from 'react';

/** Rótulo de campo padronizado: com tooltip (dica) e marca de opcional. */
export function Campo({
  rotulo,
  dica,
  opcional,
  children,
}: {
  rotulo: string;
  dica?: string;
  opcional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="pf-field">
      <span className="pf-label">
        {rotulo}
        {opcional && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · opcional</span>}
        {dica && (
          <span className="pf-info" title={dica} tabIndex={0} aria-label={dica}>
            {' '}
            ⓘ
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
