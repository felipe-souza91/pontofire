import { useEffect, useRef, useState } from 'react';
import {
  BLOCOS_DATA,
  BLOCOS_MES,
  aplicarTecla,
  digitosParaISO,
  digitosParaMesISO,
  formatarBlocos,
  isoParaDigitos,
  mesISOParaDigitos,
  soDigitos,
} from '../utils/data';

/**
 * Data digitada, no lugar do calendário nativo.
 *
 * Mesmo desenho do campo de dinheiro: o estado é a string de DÍGITOS, e o que
 * sai pro pai é ISO — ou `''` enquanto a data não estiver completa e válida.
 * Meia data nunca vira valor gravado.
 */
function Base({
  digitos,
  setDigitos,
  blocos,
  max,
  placeholder,
  ariaLabel,
  autoFocus,
  invalido,
  aviso,
}: {
  digitos: string;
  setDigitos: (d: string) => void;
  blocos: readonly number[];
  max: number;
  placeholder: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  invalido: boolean;
  aviso: string;
}) {
  return (
    <div>
      <input
        className="pf-input pf-num"
        style={{ maxWidth: '11rem', letterSpacing: '0.06em' }}
        // teclado numérico no celular; `text` porque `number` come as barras
        inputMode="numeric"
        type="text"
        aria-label={ariaLabel}
        aria-invalid={invalido || undefined}
        autoFocus={autoFocus}
        value={formatarBlocos(digitos, blocos)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          // Backspace tratado aqui pra andar um DÍGITO por vez em vez de
          // brigar com a barra que a máscara reinsere
          if (/^\d$/.test(e.key) || e.key === 'Backspace') {
            e.preventDefault();
            setDigitos(aplicarTecla(digitos, e.key, max));
          }
        }}
        // teclado virtual e colar não passam por onKeyDown
        onChange={(e) => setDigitos(soDigitos(e.target.value, max))}
      />
      {invalido && <p className="pf-hint pf-hint-erro">{aviso}</p>}
    </div>
  );
}

/** Data completa (DD/MM/AAAA). `value`/`onChange` em ISO `yyyy-mm-dd`. */
export function DataInput({
  value,
  onChange,
  autoFocus,
  ariaLabel,
  minimo,
  maximo,
  aviso = 'Data inválida — confira o dia, o mês e o ano.',
}: {
  value: string;
  onChange: (iso: string) => void;
  autoFocus?: boolean;
  ariaLabel?: string;
  minimo?: string;
  maximo?: string;
  aviso?: string;
}) {
  const [digitos, setDigitos] = useState(() => isoParaDigitos(value));
  const digitando = useRef(false);

  useEffect(() => {
    if (digitando.current) {
      digitando.current = false;
      return;
    }
    setDigitos(isoParaDigitos(value));
  }, [value]);

  function aplicar(novos: string) {
    setDigitos(novos);
    digitando.current = true;
    onChange(digitosParaISO(novos, { minimo, maximo }));
  }

  return (
    <Base
      digitos={digitos}
      setDigitos={aplicar}
      blocos={BLOCOS_DATA}
      max={8}
      placeholder="DD/MM/AAAA"
      ariaLabel={ariaLabel}
      autoFocus={autoFocus}
      // só acusa depois de digitado por inteiro: reclamar no 3º dígito é
      // reclamar de algo que a pessoa ainda está escrevendo
      invalido={digitos.length === 8 && digitosParaISO(digitos, { minimo, maximo }) === ''}
      aviso={aviso}
    />
  );
}

/** Mês de referência (MM/AAAA). `value`/`onChange` em ISO `yyyy-mm`. */
export function MesInput({
  value,
  onChange,
  ariaLabel,
  minimo,
  maximo,
  aviso = 'Mês inválido — use MM/AAAA.',
}: {
  value: string;
  onChange: (iso: string) => void;
  ariaLabel?: string;
  minimo?: string;
  maximo?: string;
  aviso?: string;
}) {
  const [digitos, setDigitos] = useState(() => mesISOParaDigitos(value));
  const digitando = useRef(false);

  useEffect(() => {
    if (digitando.current) {
      digitando.current = false;
      return;
    }
    setDigitos(mesISOParaDigitos(value));
  }, [value]);

  function aplicar(novos: string) {
    setDigitos(novos);
    digitando.current = true;
    onChange(digitosParaMesISO(novos, { minimo, maximo }));
  }

  return (
    <Base
      digitos={digitos}
      setDigitos={aplicar}
      blocos={BLOCOS_MES}
      max={6}
      placeholder="MM/AAAA"
      ariaLabel={ariaLabel}
      invalido={digitos.length === 6 && digitosParaMesISO(digitos, { minimo, maximo }) === ''}
      aviso={aviso}
    />
  );
}
