import { useEffect, useRef, useState } from 'react';
import {
  aplicarTecla,
  digitosParaValor,
  formatarDigitos,
  soDigitos,
  valorParaDigitos,
} from '../utils/moeda';

/**
 * Campo de dinheiro com máscara odômetro: digita corrido, preenche da direita.
 *
 * O estado real é a string de DÍGITOS, não o texto formatado nem o número —
 * é o que permite "0" ser uma resposta digitada de verdade (`'0'`) e não a
 * mesma coisa que campo vazio (`''`). A obrigatoriedade do lançamento mensal
 * depende dessa distinção.
 */
export function MoedaInput({
  value,
  onChange,
  autoFocus,
  ariaLabel,
  onTocar,
}: {
  value: number;
  onChange: (v: number) => void;
  autoFocus?: boolean;
  ariaLabel?: string;
  /** avisa que o usuário mexeu neste campo (mesmo que pra digitar zero) */
  onTocar?: () => void;
}) {
  const [digitos, setDigitos] = useState(() => valorParaDigitos(value));
  const digitando = useRef(false);

  // valor vindo de fora (prefill, edição) reescreve o campo — mas nunca no meio
  // de uma digitação, senão o cursor briga com o pai a cada tecla
  useEffect(() => {
    if (digitando.current) {
      digitando.current = false;
      return;
    }
    setDigitos(valorParaDigitos(value));
  }, [value]);

  function aplicar(novos: string) {
    setDigitos(novos);
    digitando.current = true;
    onTocar?.();
    onChange(digitosParaValor(novos));
  }

  function teclado(e: React.KeyboardEvent<HTMLInputElement>) {
    // dígito e Backspace são tratados aqui pra que o Backspace ande de um
    // dígito por vez, em vez de tentar apagar a vírgula ou o ponto de milhar
    if (/^\d$/.test(e.key) || e.key === 'Backspace') {
      e.preventDefault();
      aplicar(aplicarTecla(digitos, e.key));
    }
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
        inputMode="numeric"
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        value={formatarDigitos(digitos)}
        placeholder="0,00"
        onKeyDown={teclado}
        // teclado virtual e colar não passam por onKeyDown: aqui o que vale é
        // o texto inteiro do campo, do qual só os dígitos interessam
        onChange={(e) => aplicar(soDigitos(e.target.value))}
        onFocus={(e) => e.currentTarget.setSelectionRange(999, 999)}
      />
    </div>
  );
}
