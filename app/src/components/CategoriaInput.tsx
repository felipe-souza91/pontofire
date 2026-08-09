import { useId } from 'react';

/** Input com sugestões conhecidas (datalist) + digitação livre. */
export function CategoriaInput({
  value,
  onChange,
  opcoes,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  opcoes: readonly string[];
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const listId = useId();
  return (
    <>
      <input
        className="pf-input"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      <datalist id={listId}>
        {opcoes.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
