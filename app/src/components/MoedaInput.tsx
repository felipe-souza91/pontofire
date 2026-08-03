import { useEffect, useRef, useState } from 'react';

function formatarBR(intDigits: string, decDigits: string | null): string {
  const intFmt = intDigits ? Number(intDigits).toLocaleString('pt-BR') : decDigits !== null ? '0' : '';
  return decDigits !== null ? `${intFmt},${decDigits}` : intFmt;
}

function paraNumero(intDigits: string, decDigits: string | null): number {
  const reais = Number(intDigits || '0');
  const centavos = decDigits ? Number(decDigits.padEnd(2, '0').slice(0, 2)) / 100 : 0;
  return reais + centavos;
}

/** Input de moeda (R$) com separador de milhar e centavos (vírgula). */
export function MoedaInput({
  value,
  onChange,
  autoFocus,
}: {
  value: number;
  onChange: (v: number) => void;
  autoFocus?: boolean;
}) {
  const [texto, setTexto] = useState('');
  const digitando = useRef(false);

  // sincroniza o display quando o value muda de fora (prefill), sem atrapalhar a digitação
  useEffect(() => {
    if (digitando.current) {
      digitando.current = false;
      return;
    }
    setTexto(
      value
        ? new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: value % 1 ? 2 : 0,
            maximumFractionDigits: 2,
          }).format(value)
        : '',
    );
  }, [value]);

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const partes = e.target.value.replace(/[^\d,]/g, '').split(',');
    const intDigits = (partes[0] ?? '').replace(/\D/g, '');
    const temVirgula = partes.length > 1;
    const decDigits = temVirgula ? (partes[1] ?? '').replace(/\D/g, '').slice(0, 2) : null;
    setTexto(formatarBR(intDigits, decDigits));
    digitando.current = true;
    onChange(paraNumero(intDigits, decDigits));
  }

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
        inputMode="decimal"
        autoFocus={autoFocus}
        value={texto}
        onChange={handle}
        placeholder="0,00"
      />
    </div>
  );
}
