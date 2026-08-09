/**
 * Retrato do Brasil — números públicos usados no "Card da semana".
 *
 * REGRA DESTE ARQUIVO: todo número aqui tem fonte, ano e link. Se não tem
 * fonte verificável, não entra. É o que sustenta o princípio de honestidade
 * (§6/§14): a comparação com o país só vale se o dado for auditável.
 *
 * MANUTENÇÃO: revisar uma vez por ano (ou quando IBGE/ANBIMA/CNC publicarem
 * nova edição). Os valores abaixo são arredondados de propósito — o card fala
 * "cerca de", "1 em cada 3", e nunca finge precisão que a pesquisa não tem.
 *
 * Nada aqui é conselho de investimento; são estatísticas de contexto.
 */

export interface DadoBrasil {
  /** valor arredondado — proporções em 0..1, dinheiro em reais */
  valor: number;
  /** como citar no rodapé do card */
  fonte: string;
  link: string;
}

export const BRASIL = {
  /** Salário mínimo federal vigente. Bate com INSS_2026.piso no engine. */
  salarioMinimo: {
    valor: 1621,
    fonte: 'Salário mínimo federal, 2026',
    link: 'https://www.gov.br/trabalho-e-emprego/pt-br',
  },

  /** Rendimento médio real habitual de todos os trabalhos. */
  rendimentoMedio: {
    valor: 3300,
    fonte: 'IBGE · PNAD Contínua, 2024',
    link: 'https://www.ibge.gov.br/estatisticas/sociais/trabalho/9173-pesquisa-nacional-por-amostra-de-domicilios-continua-trimestral.html',
  },

  /** Proporção de famílias com alguma dívida (cartão, carnê, financiamento). */
  familiasEndividadas: {
    valor: 0.77,
    fonte: 'CNC · Peic (Pesquisa de Endividamento do Consumidor)',
    link: 'https://www.portaldocomercio.org.br/peic',
  },

  /** Proporção de adultos que declaram ter algum investimento. */
  adultosQueInvestem: {
    valor: 0.36,
    fonte: 'ANBIMA · Raio X do Investidor Brasileiro',
    link: 'https://www.anbima.com.br/pt_br/especial/raio-x-do-investidor.htm',
  },

  /** Proporção de adultos sem reserva para cobrir 3 meses parados. */
  semReserva: {
    valor: 0.6,
    fonte: 'ANBIMA · Raio X do Investidor Brasileiro',
    link: 'https://www.anbima.com.br/pt_br/especial/raio-x-do-investidor.htm',
  },

  /**
   * Rendimento real aproximado da poupança com a Selic acima de 8,5% a.a.
   * (regra: 0,5% a.m. + TR, contra IPCA na casa de 4,5% a.a.).
   */
  poupancaRealAnual: {
    valor: 0.015,
    fonte: 'Regra da poupança (Lei 12.703/2012) vs. IPCA/IBGE',
    link: 'https://www.bcb.gov.br/estatisticas/remuneradepositospoupanca',
  },

  /** Proporção de aposentadorias do RGPS que pagam até um salário mínimo. */
  aposentadoriasAteUmMinimo: {
    valor: 0.66,
    fonte: 'INSS · Boletim Estatístico da Previdência Social',
    link: 'https://www.gov.br/previdencia/pt-br/assuntos/previdencia-social/dados-abertos/dados-abertos-previdencia-social',
  },

  /** Expectativa de vida ao nascer, ambos os sexos. */
  expectativaVida: {
    valor: 76.4,
    fonte: 'IBGE · Tábua Completa de Mortalidade, 2023',
    link: 'https://www.ibge.gov.br/estatisticas/sociais/populacao/9126-tabuas-completas-de-mortalidade.html',
  },
} as const satisfies Record<string, DadoBrasil>;
