import type { Timestamp } from 'firebase/firestore';
import type { LinhaDePartida } from '@pontofire/engine';

/** Documento users/{uid} — §5 + humanização + consentimento LGPD. */
export interface UserDoc {
  // perfil (N2)
  nome?: string;
  apelido?: string;
  dataNascimento?: string; // ISO yyyy-mm-dd
  inicioContribuicao?: string; // yyyy-mm (para o módulo INSS, M6)
  salario?: number;
  sexoINSS?: 'F' | 'M'; // a lei do INSS usa idade/tempo distintos por sexo

  // núcleo do motor (N1)
  custoVidaMensal: number;
  aporteMensal: number; // A — quanto consegue investir por mês
  patrimonioInicial: number; // P informado no onboarding
  retornoRealEsperado: number; // ex. 0,05
  /**
   * M — o valor GRAVADO. Só vale como meta quando `metaTravada`.
   *
   * NÃO LEIA ESTE CAMPO DIRETO pra calcular nada: use `metaVigente(doc)`. Por
   * padrão a meta é derivada do custo (25× o ano), e ler o gravado faz a meta
   * congelar enquanto o custo anda — que é como a data melhorava quando o gasto
   * piorava. Há um teste que reprova leitura direta fora dos pontos de escrita.
   */
  metaFire: number;
  /** o usuário fixou a meta num número e não quer que ela acompanhe o custo */
  metaTravada?: boolean;
  taxaSaqueSegura: number; // TSS, default 0,04

  /**
   * Reserva de emergência declarada.
   *
   * Fica DENTRO do patrimônio (é dinheiro real e rende; tirá-la de P quebraria
   * a marcação a mercado todo mês) e entra na META, porque no dia do FIRE ela
   * precisa continuar intacta. Ausente = o usuário ainda não declarou, e a meta
   * é só o 25×.
   */
  reservaEmergencia?: number;

  /** de onde ele partiu — congelada no onboarding, nunca reescrita */
  linhaDePartida?: LinhaDePartida;

  // humanização (N2) — âncoras emocionais, viram gatilho do assistente (§7)
  porQues?: string[]; // motivações escolhidas (chips)
  porQue?: string; // texto livre "conta mais"
  nomeSonho?: string; // nome que o usuário dá à meta ("meu sítio")
  idadeAlvo?: number; // idade em que quer poder parar

  // consentimento
  consentimentoLgpd?: { aceitoEm: string; versao: string };

  // estado
  plano: 'free' | 'pro';
  onboardingNivel: 0 | 1 | 2;
  onboardingCompleto: boolean;
  /** já viu a apresentação do sistema (pode rever pelo Perfil) */
  tourVisto?: boolean;

  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;
}

/** Dados coletados no Nível 1 do onboarding (aha < 60s). */
export interface OnboardingN1 {
  custoVidaMensal: number;
  aporteMensal: number;
  patrimonioInicial: number;
  metaFire: number;
  /** o usuário editou a meta em vez de aceitar a sugestão de 25× */
  metaTravada?: boolean;
  retornoRealEsperado: number;
  taxaSaqueSegura: number;
  /** montada na conclusão, a partir do que ele acabou de responder */
  linhaDePartida?: LinhaDePartida;
}

/**
 * O onboarding é um fluxo único (10 perguntas: primeiro quem você é, depois os
 * números). Este é o pacote completo — grava numa escrita só.
 */
export interface OnboardingCompleto extends OnboardingN1, OnboardingN2 {}

/** Dados coletados no Nível 2 (enriquecimento humanizado). */
export interface OnboardingN2 {
  apelido?: string;
  porQues?: string[];
  porQue?: string;
  nomeSonho?: string;
  idadeAlvo?: number;
  // dados utilitários (módulo INSS) — opcionais
  nome?: string;
  dataNascimento?: string;
  inicioContribuicao?: string;
  salario?: number;
  sexoINSS?: 'F' | 'M';
}
