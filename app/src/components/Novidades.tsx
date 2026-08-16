import { useEffect } from 'react';
import { Flame } from '../theme/Flame';
import { Icone, type NomeIcone } from '../theme/Icone';
import { novidadesDesde, type Novidade, type TipoNovidade } from '../data/novidades';

/**
 * O que mudou desde a última vez que você entrou.
 *
 * Aparece uma vez, por cima do Início, para quem já usava o app — e é isso que
 * justifica interromper: várias mudanças recentes alteram NÚMEROS QUE A PESSOA
 * JÁ VIU. Sem o aviso, a conclusão natural é que o app quebrou.
 *
 * Não disputa espaço com a apresentação: quem está vendo o tour é usuário novo,
 * e usuário novo não tem número antigo pra reaprender. O Dashboard só mostra um
 * dos dois.
 *
 * Ordem dos itens = a ordem escrita em `novidades.ts`, não agrupada por tipo. O
 * que muda a data vem primeiro porque é o que a pessoa vai estranhar primeiro;
 * agrupar por "novidades / correções" jogaria isso pro meio da lista.
 */

const ROTULO: Record<TipoNovidade, { texto: string; icone: NomeIcone }> = {
  novo: { texto: 'novo', icone: 'estrela' },
  correcao: { texto: 'correção', icone: 'check' },
  mudanca: { texto: 'mudou', icone: 'raio' },
};

export function Novidades({
  visto,
  onFechar,
}: {
  visto: string | undefined;
  onFechar: () => void;
}) {
  const pendentes = novidadesDesde(visto);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onFechar]);

  if (pendentes.length === 0) return null;

  return (
    <div
      className="pf-bv-fundo"
      role="dialog"
      aria-modal="true"
      aria-label="O que mudou no Ponto FIRE"
    >
      <div className="pf-glow" style={{ top: '-10%', left: '50%', transform: 'translateX(-50%)' }} />
      <div className="pf-bv-card pf-nov-card">
        <div className="pf-bv-icone"><Flame size={40} /></div>
        <span className="pf-eyebrow">enquanto você esteve fora</span>
        <h2 className="pf-bv-titulo">{pendentes[0]!.titulo}</h2>
        <p className="pf-nov-intro">
          Parte disto <b>muda números que você já viu</b> — não é o app quebrando, é ele passando a
          usar o que você lança. Vale meio minuto de leitura.
        </p>

        {pendentes.map((n) => (
          <Bloco key={n.versao} novidade={n} varias={pendentes.length > 1} />
        ))}

        <button
          className="pf-btn pf-btn-primary"
          style={{ marginTop: 'var(--space-6)' }}
          onClick={onFechar}
        >
          Entendi
        </button>
        <p className="pf-hint" style={{ marginTop: 'var(--space-3)' }}>
          Dá pra reabrir esta lista pelo Perfil.
        </p>
      </div>
    </div>
  );
}

function Bloco({ novidade, varias }: { novidade: Novidade; varias: boolean }) {
  return (
    <>
      {varias && <div className="pf-nov-versao">{novidade.titulo}</div>}
      <ul className="pf-nov-lista">
        {novidade.itens.map((item, k) => (
          <li key={k} className={`pf-nov-item pf-nov-${item.tipo}`}>
            <span className="pf-nov-tag">
              <Icone nome={ROTULO[item.tipo].icone} size={13} />
              {ROTULO[item.tipo].texto}
            </span>
            <p>{item.texto}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
