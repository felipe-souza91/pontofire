import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  alavancasParaAlvo,
  jaEhCoastFire,
  metaComCusto,
  patrimonioCoast,
  type Alavanca,
  type EstadoVigente,
  type PlanoFire,
} from '@pontofire/engine';
import type { UserDoc } from '../data/types';
import { idadeDe } from '../hooks/usePainel';
import { formatBRL, formatBRLcompact, formatDuracao, formatPct } from '../utils/format';

/**
 * "Sua meta de idade" — dois estados.
 *
 * Chegando ANTES da meta: comemora e mostra o CoastFIRE.
 * Chegando DEPOIS: mostra o motor reverso (§ backlog puxado pra frente) —
 * quanto aportar, quanto cortar, que retorno seria preciso, uma alavanca de
 * cada vez.
 *
 * §14: nenhuma alavanca é conselho, é conta. E a última linha sempre oferece
 * a saída honesta — a data de hoje já é boa, mesmo sem mudar nada.
 */
export function CardMetaIdade({
  doc,
  plano,
  P,
  vigente,
}: {
  doc: UserDoc;
  plano: PlanoFire;
  P: number;
  vigente: EstadoVigente;
}) {
  // as alavancas têm que partir dos MESMOS números que geraram a data
  const meta = vigente.meta;
  const idadeAtual = idadeDe(doc.dataNascimento);

  const dados = useMemo(() => {
    if (
      !doc.idadeAlvo ||
      idadeAtual === undefined ||
      doc.idadeAlvo <= idadeAtual ||
      plano.status !== 'ok' ||
      plano.idadeNaLiberdade === null
    ) {
      return null;
    }
    const mesesAlvo = (doc.idadeAlvo - idadeAtual) * 12;
    return {
      mesesAlvo,
      idadeLib: Math.round(plano.idadeNaLiberdade),
      alavancas: alavancasParaAlvo({
        patrimonio: P,
        aporteMensal: vigente.aporte.valor,
        custoVidaMensal: vigente.custo.valor,
        metaFire: meta,
        iMensal: plano.iMensal,
        mesesAlvo,
      }),
    };
  }, [doc, plano, P, idadeAtual, vigente]);

  if (!dados || idadeAtual === undefined || !doc.idadeAlvo) return null;

  const { mesesAlvo, idadeLib, alavancas } = dados;
  const atrasoAnos = idadeLib - doc.idadeAlvo;

  // ---------------------------------------------------- já chega antes da meta
  if (atrasoAnos <= 0) {
    const coast = patrimonioCoast(meta, plano.iMensal, mesesAlvo);
    const jaCoast = jaEhCoastFire(P, meta, plano.iMensal, mesesAlvo);
    const antes = doc.idadeAlvo - idadeLib;
    return (
      <div className="pf-stat" style={{ borderColor: 'rgba(63,214,155,0.3)' }}>
        <div className="rot">Sua meta de idade · {doc.idadeAlvo} anos</div>
        <p style={{ margin: 'var(--space-2) 0 0', fontSize: '0.95rem', lineHeight: 1.5 }}>
          {antes > 0 ? (
            <>
              No seu ritmo você chega <span style={{ color: 'var(--mint)' }}>aos {idadeLib}</span> —{' '}
              {formatDuracao(antes * 12)} antes da sua meta.{' '}
            </>
          ) : (
            <>No seu ritmo você chega aos {idadeLib}, bem em cima da sua meta. </>
          )}
          {jaCoast ? (
            <span style={{ color: 'var(--mint)' }}>
              Você já é CoastFIRE: podia parar de aportar hoje e ainda bateria a meta aos{' '}
              {doc.idadeAlvo}, só com os juros.
            </span>
          ) : (
            <>
              Pra bater a meta aos {doc.idadeAlvo} sem novos aportes, precisaria de{' '}
              <span style={{ color: 'var(--ember-2)' }}>{formatBRLcompact(coast)}</span> investidos hoje.
            </>
          )}
        </p>
      </div>
    );
  }

  // ---------------------------------------------------- chega depois: alavancas
  const novaMeta =
    alavancas.gasto.status === 'possivel' || alavancas.gasto.status === 'drastica'
      ? metaComCusto(meta, vigente.custo.valor, alavancas.gasto.alvo)
      : null;

  const idadeComMetade =
    alavancas.mesesComMetadeDoAporte !== null
      ? Math.round(idadeAtual + alavancas.mesesComMetadeDoAporte / 12)
      : null;

  return (
    <section className="pf-hero-card">
      <span className="pf-eyebrow">Sua meta de idade · {doc.idadeAlvo} anos</span>
      <p className="pf-hc-sub" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        No seu ritmo você chega <strong style={{ color: 'var(--paper)' }}>aos {idadeLib}</strong> —{' '}
        {formatDuracao(atrasoAnos * 12)} depois. Cada linha abaixo fecharia essa diferença{' '}
        <strong style={{ color: 'var(--paper)' }}>sozinha</strong>, com o resto igual.
      </p>

      <div className="pf-alavancas">
        <LinhaAlavanca
          icone="↑"
          titulo="Aportar mais"
          alavanca={alavancas.aporte}
          valor={`${formatBRL(alavancas.aporte.alvo)}/mês`}
          esforco={`+${formatBRL(alavancas.aporte.delta)}`}
          nota={
            alavancas.aporte.status === 'drastica'
              ? 'isso é aportar mais do que você gasta pra viver — taxa de poupança acima de 50%.'
              : undefined
          }
        />

        <LinhaAlavanca
          icone="↓"
          titulo="Gastar menos"
          alavanca={alavancas.gasto}
          valor={`${formatBRL(alavancas.gasto.alvo)}/mês`}
          esforco={`−${formatBRL(alavancas.gasto.delta)}`}
          nota={
            alavancas.gasto.status === 'impossivel'
              ? 'não existe corte que resolva nesse prazo.'
              : novaMeta !== null
                ? `vale por dois: o corte vira aporte e ainda derruba sua meta pra ${formatBRLcompact(novaMeta)}.${
                    alavancas.gasto.status === 'drastica'
                      ? ' Mas cortar mais de um terço do padrão de vida não é apertar o cinto, é outra vida.'
                      : ''
                  }`
                : undefined
          }
          destaque={alavancas.gasto.status === 'possivel' && alavancas.gasto.delta < alavancas.aporte.delta}
        />

        <LinhaAlavanca
          icone="%"
          titulo="Render mais"
          alavanca={alavancas.retorno}
          valor={`${formatPct(alavancas.retorno.alvo)} real a.a.`}
          esforco={`+${formatPct(alavancas.retorno.delta)}`}
          nota={
            alavancas.retorno.status === 'impossivel'
              ? 'não existe retorno plausível que feche nesse prazo — essa porta está fechada.'
              : alavancas.retorno.status === 'drastica'
                ? 'é mais que o dobro do juro real histórico do Brasil. Buscar isso é aceitar um risco bem maior, e risco não é uma alavanca que você controla.'
                : 'a única aqui que não depende de você. Mais retorno vem com mais risco — e o mercado não promete nada.'
          }
        />
      </div>

      {alavancas.patrimonio.status !== 'desnecessaria' && (
        <p className="pf-hint" style={{ marginTop: 'var(--space-4)' }}>
          Ou <strong className="mono">{formatBRLcompact(alavancas.patrimonio.alvo)}</strong> já
          investidos hoje (mantendo o aporte atual) — {formatBRLcompact(alavancas.patrimonio.delta)} a
          mais do que você tem.
        </p>
      )}

      <div className="pf-alavanca-saida">
        {idadeComMetade !== null && idadeComMetade < idadeLib && (
          <p>
            Não precisa ser tudo ou nada:{' '}
            <strong style={{ color: 'var(--mint)' }}>
              metade desse aporte (+{formatBRL(alavancas.aporte.delta / 2)})
            </strong>{' '}
            já traz sua data pros {idadeComMetade} anos.
          </p>
        )}
        <p>
          E se nada disso couber agora, tudo bem: aos {idadeLib} você ainda decide quando parar — o
          que é bem diferente de descobrir aos 65 que a decisão nunca foi sua.
        </p>
        <Link className="pf-como-calculo" to="/metodologia#alavancas">como calculo isso →</Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function LinhaAlavanca({
  icone,
  titulo,
  alavanca,
  valor,
  esforco,
  nota,
  destaque,
}: {
  icone: string;
  titulo: string;
  alavanca: Alavanca;
  valor: string;
  esforco: string;
  nota?: string;
  destaque?: boolean;
}) {
  if (alavanca.status === 'desnecessaria') return null;
  const impossivel = alavanca.status === 'impossivel';
  const drastica = alavanca.status === 'drastica';

  return (
    <div className={`pf-alavanca ${destaque ? 'destaque' : ''} ${impossivel ? 'fechada' : ''}`}>
      <span className="pf-alavanca-icone" aria-hidden>{icone}</span>
      <div className="pf-alavanca-corpo">
        <div className="pf-alavanca-linha">
          <span className="pf-alavanca-titulo">
            {titulo}
            {destaque && <span className="pf-alavanca-selo">menor esforço</span>}
          </span>
          {!impossivel && (
            <span className="mono pf-alavanca-valor">
              {valor} <em className={drastica ? 'aviso' : ''}>{esforco}</em>
            </span>
          )}
        </div>
        {nota && <p className={`pf-alavanca-nota ${drastica || impossivel ? 'aviso' : ''}`}>{nota}</p>}
      </div>
    </div>
  );
}
