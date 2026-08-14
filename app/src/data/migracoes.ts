import { calcularPlanoFire, deveNascerTravada, type LinhaDePartida } from '@pontofire/engine';
import type { UserDoc } from './types';

/**
 * Migrações de conta — a DECISÃO, sem o Firestore.
 *
 * Sem plano Blaze não há Cloud Function pra varrer a base, então cada usuário
 * migra a própria conta ao abrir o app. Quem grava é `useMigracoes`; aqui só se
 * decide o quê. A separação não é purismo: importar o módulo de escrita
 * arrastaria a inicialização do Firebase pra dentro do teste, e esta é
 * exatamente a lógica que precisa de teste.
 *
 * `pendencias` é **idempotente**: roda em todo carregamento e devolve vazio
 * quando não há o que fazer.
 */

/**
 * Reconstrói a linha de partida de quem entrou antes de ela existir.
 *
 * É APROXIMAÇÃO e a tela precisa dizer isso. A partida verdadeira era o perfil
 * no dia do onboarding; o que temos é o perfil de hoje mais o
 * `patrimonioInicial`, que é o único campo que ninguém reescreve. Se a pessoa
 * mexeu no custo ou no aporte desde então, a data reconstruída não é a que ela
 * viu.
 *
 * Ainda assim vale gravar: quanto mais se espera, mais gente perde a partida —
 * e uma aproximação declarada é melhor que um "desde sempre" sem número.
 */
export function reconstruirPartida(doc: UserDoc): LinhaDePartida {
  const plano = calcularPlanoFire({
    patrimonioInvestivel: doc.patrimonioInicial,
    aporteMensal: doc.aporteMensal,
    custoVidaMensal: doc.custoVidaMensal,
    retornoRealAnual: doc.retornoRealEsperado,
    metaFire: doc.metaFire,
    tss: doc.taxaSaqueSegura,
    hoje: new Date(),
  });

  return {
    em: new Date().toISOString().slice(0, 10),
    custoVidaMensal: doc.custoVidaMensal,
    aporteMensal: doc.aporteMensal,
    patrimonioInicial: doc.patrimonioInicial,
    retornoRealEsperado: doc.retornoRealEsperado,
    metaFire: doc.metaFire,
    taxaSaqueSegura: doc.taxaSaqueSegura,
    mesesAteFire: plano.meses,
    origem: 'reconstruida',
  };
}

/** O que falta migrar neste doc — vazio quando não há nada a fazer. */
export function pendencias(doc: UserDoc): Partial<UserDoc> {
  const patch: Partial<UserDoc> = {};

  if (!doc.linhaDePartida) {
    patch.linhaDePartida = reconstruirPartida(doc);
  }

  // Quem já tinha meta diferente da regra dos 25× escolheu aquele número.
  // Passar a derivar sem avisar mudaria a meta dessas pessoas do nada.
  if (doc.metaTravada === undefined) {
    patch.metaTravada = deveNascerTravada({
      metaFire: doc.metaFire,
      custoVidaMensal: doc.custoVidaMensal,
      taxaSaqueSegura: doc.taxaSaqueSegura,
    });
  }

  return patch;
}
