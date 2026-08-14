import { describe, it, expect } from 'vitest';
import { pendencias, reconstruirPartida } from './migracoes';
import type { UserDoc } from './types';

const usuario = (over: Partial<UserDoc> = {}): UserDoc => ({
  custoVidaMensal: 8_000,
  aporteMensal: 2_000,
  patrimonioInicial: 300_000,
  retornoRealEsperado: 0.05,
  metaFire: 2_400_000,
  taxaSaqueSegura: 0.04,
  plano: 'free',
  onboardingNivel: 2,
  onboardingCompleto: true,
  ...over,
});

describe('reconstrução da linha de partida', () => {
  it('sai marcada como aproximação', () => {
    // a partida verdadeira era o perfil no dia do onboarding; isto é o perfil
    // de hoje + patrimonioInicial. A tela precisa poder dizer isso.
    expect(reconstruirPartida(usuario()).origem).toBe('reconstruida');
  });

  it('usa o patrimônio INICIAL, não o de hoje', () => {
    const p = reconstruirPartida(usuario({ patrimonioInicial: 300_000 }));
    expect(p.patrimonioInicial).toBe(300_000);
  });

  it('guarda as premissas junto com a data', () => {
    // sem elas, "melhorou 4 anos" não distingue mérito de mudança de alvo
    const p = reconstruirPartida(usuario());
    expect(p).toMatchObject({
      custoVidaMensal: 8_000,
      aporteMensal: 2_000,
      retornoRealEsperado: 0.05,
      metaFire: 2_400_000,
      taxaSaqueSegura: 0.04,
    });
    expect(p.mesesAteFire).toBeGreaterThan(0);
  });

  it('meta inalcançável vira null, não NaN nem número inventado', () => {
    // sem aporte E sem juro não há caminho; com juro positivo até R$ 100 chega
    // um dia, então este caso precisa dos dois zerados
    const p = reconstruirPartida(
      usuario({ aporteMensal: 0, retornoRealEsperado: 0, patrimonioInicial: 100 }),
    );
    expect(p.mesesAteFire).toBeNull();
  });

  it('sem aporte mas com juro real, a data existe — só é longe', () => {
    const p = reconstruirPartida(usuario({ aporteMensal: 0 }));
    expect(p.mesesAteFire).toBeGreaterThan(0);
  });
});

describe('o que está pendente', () => {
  it('conta nova completa não tem nada a migrar', () => {
    const doc = usuario({
      linhaDePartida: reconstruirPartida(usuario()),
      metaTravada: false,
    });
    expect(pendencias(doc)).toEqual({});
  });

  it('quem não tem partida ganha uma', () => {
    expect(pendencias(usuario({ metaTravada: false })).linhaDePartida).toBeDefined();
  });

  it('quem tem partida não ganha outra — a original é intocável', () => {
    const original = { ...reconstruirPartida(usuario()), origem: 'onboarding' as const };
    const patch = pendencias(usuario({ linhaDePartida: original, metaTravada: false }));
    expect(patch.linhaDePartida).toBeUndefined();
  });

  it('quem tinha meta própria nasce travado', () => {
    const doc = usuario({ metaFire: 1_000_000, linhaDePartida: reconstruirPartida(usuario()) });
    expect(pendencias(doc).metaTravada).toBe(true);
  });

  it('quem aceitou a sugestão nasce derivado', () => {
    const doc = usuario({ linhaDePartida: reconstruirPartida(usuario()) });
    expect(pendencias(doc).metaTravada).toBe(false);
  });

  it('não reescreve metaTravada já decidida', () => {
    const doc = usuario({
      metaFire: 1_000_000,
      metaTravada: false,
      linhaDePartida: reconstruirPartida(usuario()),
    });
    expect(pendencias(doc)).toEqual({});
  });
});
