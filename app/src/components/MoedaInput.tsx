/** Input de moeda com prefixo R$ e separador de milhar (pt-BR). */
export function MoedaInput({
  value,
  onChange,
  autoFocus,
}: {
  value: number;
  onChange: (v: number) => void;
  autoFocus?: boolean;
}) {
  const display = value ? new Intl.NumberFormat('pt-BR').format(value) : '';
  return (
    <div style={{ position: 'relative' }}>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: '0.9rem',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        R$
      </span>
      <input
        className="pf-input pf-num"
        style={{ paddingLeft: '2.6rem' }}
        inputMode="numeric"
        autoFocus={autoFocus}
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          onChange(digits ? parseInt(digits, 10) : 0);
        }}
      />
    </div>
  );
}
