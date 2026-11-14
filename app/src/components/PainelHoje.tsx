import { Link } from 'react-router-dom';
import { ultimoDiaDoMes } from '@pontofire/engine';
import type { EstimativaDeHoje, SemEstimativa } from '../utils/pulso';
import { formatBRL, formatBRLcompact, formatPct } from '../utils/format';
import { diaCurto, nomeDoMes } from '../utils/meses';

const DIA_DA_SEMANA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const inteiro = new Intl.NumberFormat('pt-BR');

/**
 * "Hoje" — a parte do Início que muda todo dia.
 *
 * O resto do painel só se mexe quando o usuário lança o mês. Este card é o
 * motivo pra abrir o app no dia 9: três números que são verdade HOJE e não
 * eram ontem.
 *
 *  1. Dias até a data — o prazo em contagem que anda sozinha.
 *  2. Patrimônio estimado pela régua do CDI — dado do Banco Central, publicado
 *     todo dia útil. Dito como condicional ("se rendeu o CDI"), porque o app
 *     não conhece a carteira dia a dia e não finge conhecer.
 *  3. Dias do mês que o patrimônio já paga — o progresso na única unidade que
 *     todo mundo sente.
 *
 * §6: nada aqui é número inventado pra dar movimento. Quando não há régua
 * (BACEN fora, lançamento recém-feito), o item some em vez de mostrar zero.
 */
export function PainelHoje({
  hoje,
  diasParaFire,
  estimativa,
  ultimoMes,
  semEstimativa,
  diasPagos,
  rendaSustentavel,
}: {
  hoje: Date;
  /** `null` quando não há data (meta inalcançável ou já atingida) */
  diasParaFire: number | null;
  estimativa: EstimativaDeHoje | null;
  /** competência do último lançamento, pra dizer "desde o fechamento de outubro" */
  ultimoMes: string | null;
  /** por que não há estimativa — só é lido quando `estimativa` é null */
  semEstimativa: SemEstimativa;
  /** 0..30 */
  diasPagos: number;
  /** renda mensal que o patrimônio sustenta hoje, pela taxa de saque segura */
  rendaSustentavel: number;
}) {
  const cheios = Math.floor(diasPagos);
  const fracao = diasPagos - cheios;

  return (
    <section className="pf-hero-card pf-hoje">
      <div className="pf-hoje-topo">
        <span className="pf-eyebrow">Hoje</span>
        <span className="pf-hoje-data">{DIA_DA_SEMANA.format(hoje)}</span>
      </div>

      {diasParaFire !== null && diasParaFire > 0 && (
        <div className="pf-hoje-item">
          <div className="pf-hoje-valor">
            {inteiro.format(diasParaFire)} <small>{diasParaFire === 1 ? 'dia' : 'dias'}</small>
          </div>
          <p>até o seu ponto FIRE · ontem eram {inteiro.format(diasParaFire + 1)}</p>
        </div>
      )}

      {estimativa ? (
        <div className="pf-hoje-item">
          <div className="pf-hoje-valor">
            {formatBRL(Math.round(estimativa.valor))}
            <span className="pf-hoje-delta">+{formatBRL(Math.round(estimativa.ganho))}</span>
          </div>
          <p>
            patrimônio estimado, <b>se rendeu o CDI</b> desde{' '}
            {/* mês fechado conta do último dia dele; mês corrente, do dia em que foi lançado */}
            {ultimoMes && estimativa.desde === ultimoDiaDoMes(ultimoMes)
              ? `o fechamento de ${nomeDoMes(ultimoMes)}`
              : `o seu lançamento de ${diaCurto(estimativa.desde)}`}
            : {formatPct(estimativa.acumulado, 2)} em {estimativa.diasUteis}{' '}
            {estimativa.diasUteis === 1 ? 'dia útil' : 'dias úteis'}, até {diaCurto(estimativa.ate)}.
            O número de verdade aparece quando você lançar.
          </p>
        </div>
      ) : (
        <div className="pf-hoje-item">
          <p>
            {semEstimativa === 'sem-lancamento' ? (
              <>
                Com o primeiro mês lançado, este espaço passa a acompanhar seu patrimônio contra o CDI
                todo dia útil. <Link to="/lancar">Lançar agora →</Link>
              </>
            ) : semEstimativa === 'sem-regua' ? (
              <>
                Não consegui falar com o Banco Central agora, então hoje estou sem a régua do CDI pra
                estimar seu patrimônio. Ela volta sozinha.
              </>
            ) : semEstimativa === 'antigo' ? (
              <>
                Seu último lançamento{ultimoMes ? ` é de ${nomeDoMes(ultimoMes)}` : ''} — tempo demais
                pra uma estimativa pelo CDI valer alguma coisa.{' '}
                <Link to="/lancar">Lançar o mês →</Link>
              </>
            ) : (
              <>
                Lançamento em dia. A partir do próximo dia útil eu passo a estimar aqui o seu
                patrimônio pela régua do CDI, um dia de cada vez.
              </>
            )}
          </p>
        </div>
      )}

      <div className="pf-hoje-item">
        <div className="pf-hoje-valor">
          {diasPagos.toFixed(1).replace('.', ',')} <small>de 30 dias</small>
        </div>
        <div
          className="pf-dias"
          role="img"
          aria-label={`Seu patrimônio já paga ${diasPagos.toFixed(1).replace('.', ',')} dias de cada mês`}
        >
          {Array.from({ length: 30 }, (_, k) => (
            <i
              key={k}
              className={k < cheios ? 'cheio' : ''}
              style={k === cheios && fracao > 0 ? { ['--parte' as string]: `${Math.round(fracao * 100)}%` } : undefined}
              data-parcial={k === cheios && fracao > 0 ? '' : undefined}
            />
          ))}
        </div>
        <p>
          de cada mês seu já são pagos pelo patrimônio, pra sempre —{' '}
          {formatBRLcompact(rendaSustentavel)}/mês de renda que ele sustenta sem se consumir.
        </p>
      </div>
    </section>
  );
}
