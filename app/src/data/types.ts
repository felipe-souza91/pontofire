import type { Timestamp } from 'firebase/firestore';

/** Documento users/{uid} — §5 + humanização + consentimento LGPD. */
export interface UserDoc {
  // perfil (N2)
  nome?: string;
  apelido?: string;
  dataNascimento?: string; // ISO yyyy-mm-dd
  inicioContribuicao?: string; // yyyy-mm (para o módulo INSS, M6)
  salario?: number;

  // núcleo do motor (N1)
  custoVidaMensal: number;
  aporteMensal: number; // A — quanto consegue investir por mês
  patrimonioInicial: number; // P informado no onboarding
  retornoRealEsperado: number; // ex. 0,05
  metaFire: number; // M
  taxaSaqueSegura: number; // TSS, default 0,04

  // humanização (N2) — vira gatilho do assistente
  porQue?: string;

  // consentimento
  consentimentoLgpd?: { aceitoEm: string; versao: string };

  // estado
  plano: 'free' | 'pro';
  onboardingNivel: 0 | 1 | 2;
  onboardingCompleto: boolean;

  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;
}

/** Dados coletados no Nível 1 do onboarding (aha < 60s). */
export interface OnboardingN1 {
  custoVidaMensal: number;
  aporteMensal: number;
  patrimonioInicial: number;
  metaFire: number;
  retornoRealEsperado: number;
  taxaSaqueSegura: number;
}

/** Dados coletados no Nível 2 (enriquecimento). */
export interface OnboardingN2 {
  nome?: string;
  apelido?: string;
  dataNascimento?: string;
  inicioContribuicao?: string;
  salario?: number;
  porQue?: string;
}
