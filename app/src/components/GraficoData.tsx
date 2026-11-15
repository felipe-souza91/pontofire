import type { Snapshot } from '../data/snapshots';
import { GraficoLinha, type MarcaX } from './GraficoLinha';
import { formatDuracao } from '../utils/format';
import { competenciaDoAnoDecimal, mesCurto, mesMedio } from '../utils/meses';

/** Passos do eixo em anos: um mês, um trimestre, um semestre… nunca "0,2 ano". */
const PASSOS_EM_ANOS = [1 / 12, 0.25, 0.5, 1, 2, 5, 10] as const;

/**
 * A data prevista em cada mês lançado, como ano decimal.
 *
 * `mesesAteFire` guardado é PRAZO, e prazo encurta sozinho com o tempo passando.
 * Somá-lo ao mês do lançamento converte pra DATA DE CHEGADA — que só se move
 * quando algo de fato muda. É a diferença entre um gráfico que sempre desce
 * (inútil) e um que mostra se você está ganhando terreno.
 */
export function trajetoriaDaData(snapshots: readonly Snapshot[]): { mes: Snapshot; anoDecimal: number }[] {
  return snapshots
    .filter((s) => typeof s.mesesAteFire === 'number')
    .map((s) => {
      const [ano, mes] = s.mes.split('-').map(Number);
      const totalMeses = (ano ?? 2026) * 12 + (mes ?? 1) - 1 + (s.mesesAteFire as number);
      return { mes: s, anoDecimal: totalMeses / 12 };
    });
}

/**
 * A trajetória da DATA — mostra movimento, não posição.
 *
 * Linha pra baixo é boa notícia (a liberdade veio pra mais perto). Cada ponto
 * diz quanto a data andou desde o lançamento anterior, que é a pergunta que o
 * gráfico antigo deixava sem resposta: dava pra ver que mexeu, não quanto.
 */
export function GraficoData({ snapshots }: { snapshots: readonly Snapshot[] }) {
  const pontos = trajetoriaDaData(snapshots);
  if (pontos.length < 2) return null;

  const valores = pontos.map((p) => p.anoDecimal);
  const primeiro = valores[0]!;
  const atual = valores[valores.length - 1]!;
  const ganho = primeiro - atual; // em anos; positivo = veio pra mais cedo
  const rotuloData = (v: number) => mesMedio(competenciaDoAnoDecimal(v));

  const n = pontos.length;
  const quantas = Math.min(3, n);
  const marcasX: MarcaX[] = [...new Set(Array.from({ length: quantas }, (_, k) => Math.round((k * (n - 1)) / (quantas - 1))))].map(
    (i) => ({ t: i / (n - 1), rotulo: mesCurto(pontos[i]!.mes.mes) }),
  );

  return (
    <section className="pf-hero-card pf-card-graf">
      <div className="pf-graf-topo">
        <div>
          <span className="pf-eyebrow">Sua data ao longo do tempo</span>
          <div className="pf-graf-numero">{rotuloData(atual)}</div>
          <p className="pf-graf-resumo">
            {Math.abs(ganho) < 0.08 ? (
              'estável desde o primeiro lançamento'
            ) : ganho > 0 ? (
              <>
                <b className="sobe">{formatDuracao(ganho * 12)} mais cedo</b> do que no 1º lançamento
              </>
            ) : (
              <>
                <b>{formatDuracao(-ganho * 12)} mais tarde</b> do que no 1º lançamento
              </>
            )}
            {' · linha pra baixo é liberdade mais perto'}
          </p>
        </div>
      </div>

      <GraficoLinha
        titulo="A data prevista do seu ponto FIRE em cada mês lançado"
        series={[{ id: 'data', nome: 'Data prevista', cor: 'var(--serie-data)', principal: true, valores }]}
        rotulos={pontos.map((p) => `lançamento de ${mesMedio(p.mes.mes)}`)}
        marcasX={marcasX}
        formatValor={rotuloData}
        formatEixo={(v) => mesCurto(competenciaDoAnoDecimal(v))}
        passos={PASSOS_EM_ANOS}
        vazados={new Set(pontos.flatMap((p, i) => (p.mes.atipico ? [i] : [])))}
        detalhe={(i) => {
          const s = pontos[i]!.mes;
          const delta = i > 0 ? Math.round((valores[i]! - valores[i - 1]!) * 12) : null;
          return (
            <>
              {delta !== null && (
                <span>
                  {delta === 0
                    ? 'mesma data do lançamento anterior'
                    : `${formatDuracao(Math.abs(delta))} ${delta < 0 ? 'mais cedo' : 'mais tarde'} que no lançamento anterior`}
                </span>
              )}
              {s.atipico && <span>mês marcado como atípico — fica fora da sua média</span>}
              {s.observacao && <span>“{s.observacao}”</span>}
            </>
          );
        }}
      />
    </section>
  );
}
