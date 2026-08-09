import { describe, it, expect } from 'vitest';
import { analisar, type EntradaAnalise } from './analisar';
import type { ContextoImport, ItemImportado, JaSalvo, MemoriaCategoria } from './tipos';
import {
  CSV_BAGUNCADO,
  CSV_EXTRATO_VIRGULA,
  CSV_FATURA_POSITIVA,
  CSV_PLANILHA_AMBIGUA,
  CSV_PLANILHA_NATUREZA,
  CSV_SEM_CABECALHO,
  OFX_EXTRATO,
  OFX_FATURA,
} from './fixtures';

function rodar(
  conteudo: string,
  contexto?: ContextoImport,
  extra: Partial<EntradaAnalise> = {},
  encoding: BufferEncoding = 'utf-8',
) {
  return analisar({
    nome: 'arquivo',
    bytes: new Uint8Array(Buffer.from(conteudo, encoding)),
    contexto,
    ...extra,
  });
}

const acha = (itens: ItemImportado[], trecho: string) =>
  itens.find((i) => i.descricao.toUpperCase().includes(trecho.toUpperCase()));

// ---------------------------------------------------------------------------

describe('OFX — extrato bancário', () => {
  const r = rodar(OFX_EXTRATO);

  it('lê todos os lançamentos e identifica o banco', () => {
    expect(r.itens).toHaveLength(10);
    expect(r.diagnostico.formato).toBe('ofx');
    expect(r.diagnostico.documentoDetectado).toBe('extrato');
    expect(r.diagnostico.instituicao).toBe('Banco Exemplo S.A.');
    expect(r.diagnostico.conta).toBe('12345-6');
    expect(r.diagnostico.periodo).toEqual({ inicio: '2026-08-01', fim: '2026-08-31' });
  });

  it('guarda o valor sempre positivo — a direção mora no tipo', () => {
    const aluguel = acha(r.itens, 'ALUGUEL')!;
    expect(aluguel.valor).toBe(1800);
    expect(aluguel.tipo).toBe('saida');
    expect(aluguel.categoria).toBe('Moradia');
  });

  it('reconhece salário como receita ativa e rendimento como renda passiva', () => {
    expect(acha(r.itens, 'SALARIO')).toMatchObject({ tipo: 'ativa', categoria: 'Salário', valor: 9500 });
    expect(acha(r.itens, 'RENDIMENTO CDB')).toMatchObject({ tipo: 'passiva', categoria: 'Juros / Renda fixa' });
  });

  it('desmarca pagamento de fatura — senão o gasto conta duas vezes', () => {
    const pgto = acha(r.itens, 'PAGAMENTO DE FATURA')!;
    expect(pgto.incluir).toBe(false);
    expect(pgto.alertas).toContain('transferencia');
    expect(r.avisos.some((a) => a.includes('contar em dobro'))).toBe(true);
  });

  it('desmarca aplicação — é movimento entre contas, não despesa', () => {
    expect(acha(r.itens, 'APLICACAO')!.incluir).toBe(false);
  });

  it('agrupa as duas corridas de Uber na mesma chave', () => {
    const ubers = r.itens.filter((i) => i.descricao.includes('UBER'));
    expect(ubers).toHaveLength(2);
    expect(ubers[0]!.chave).toBe(ubers[1]!.chave);
    expect(ubers.every((u) => u.categoria === 'Transporte')).toBe(true);
  });

  it('a direção não é incerta — OFX tem sinal', () => {
    expect(r.diagnostico.direcaoIncerta).toBe(false);
  });
});

describe('OFX — fatura de cartão', () => {
  const r = rodar(OFX_FATURA);

  it('detecta que é fatura sem o usuário declarar', () => {
    expect(r.diagnostico.documentoDetectado).toBe('fatura');
    expect(r.avisos.some((a) => a.includes('fatura de cartão'))).toBe(true);
  });

  it('compra é saída e estorno é entrada', () => {
    expect(acha(r.itens, 'DROGARIA')).toMatchObject({ tipo: 'saida', categoria: 'Saúde', valor: 249.9 });
    expect(acha(r.itens, 'ESTORNO')!.tipo).toBe('ativa');
  });

  it('mantém a parcela como gasto do mês (é saída de caixa de verdade)', () => {
    expect(acha(r.itens, 'PARCELA 03/10')).toMatchObject({ tipo: 'saida', valor: 1200, incluir: true });
  });
});

describe('CSV — extrato', () => {
  it('lê vírgula, DD/MM e sinal negativo', () => {
    const r = rodar(CSV_EXTRATO_VIRGULA);
    expect(r.itens).toHaveLength(5);
    expect(r.diagnostico.separador).toBe(',');
    expect(r.diagnostico.formatoData).toBe('DD/MM/AAAA');
    expect(acha(r.itens, 'EMPRESA XYZ')).toMatchObject({ tipo: 'ativa' });
    expect(acha(r.itens, 'BOM PRECO')).toMatchObject({ tipo: 'saida', categoria: 'Mercado', valor: 432.15 });
  });

  it('atravessa lixo antes do cabeçalho e usa crédito/débito separados', () => {
    const r = rodar(CSV_BAGUNCADO, undefined, {}, 'latin1');
    expect(r.diagnostico.codificacao).toBe('Windows-1252');
    expect(r.diagnostico.separador).toBe(';');
    expect(r.itens).toHaveLength(4);
    expect(r.diagnostico.colunas).toMatchObject({ data: 'Data', descricao: 'Histórico' });
    expect(acha(r.itens, 'SALARIO')).toMatchObject({ tipo: 'ativa', valor: 9500 });
    expect(acha(r.itens, 'ALUGUEL')).toMatchObject({ tipo: 'saida', valor: 1800 });
  });

  it('não confunde a coluna de saldo com a de valor', () => {
    const r = rodar(CSV_BAGUNCADO, undefined, {}, 'latin1');
    // se pegasse o saldo, o mercado viria 7.267,85
    expect(acha(r.itens, 'BOM PRECO')!.valor).toBe(432.15);
  });

  it('ignora a linha de total do rodapé', () => {
    const r = rodar(CSV_BAGUNCADO, undefined, {}, 'latin1');
    expect(r.itens.some((i) => i.descricao.toUpperCase().includes('TOTAL'))).toBe(false);
  });

  it('adivinha as colunas quando não há cabeçalho — e avisa', () => {
    const r = rodar(CSV_SEM_CABECALHO);
    expect(r.itens).toHaveLength(3);
    expect(r.avisos.some((a) => a.includes('Não reconheci o cabeçalho'))).toBe(true);
    expect(acha(r.itens, 'IPIRANGA')).toMatchObject({ tipo: 'saida', categoria: 'Transporte' });
  });
});

describe('CSV — fatura com tudo positivo', () => {
  it('com o tipo declarado, trata tudo como despesa', () => {
    const r = rodar(CSV_FATURA_POSITIVA, { tipoDocumento: 'fatura' });
    expect(r.diagnostico.direcaoIncerta).toBe(false);
    expect(r.itens.every((i) => i.tipo === 'saida')).toBe(true);
    expect(acha(r.itens, 'IFOOD')).toMatchObject({ categoria: 'Delivery', valor: 78.4 });
  });

  it('sem declarar nada, pergunta em vez de chutar', () => {
    const r = rodar(CSV_FATURA_POSITIVA);
    expect(r.diagnostico.direcaoIncerta).toBe(true);
    expect(r.itens.every((i) => i.alertas.includes('direcao-incerta'))).toBe(true);
    expect(r.avisos.some((a) => a.includes('Não deu pra saber'))).toBe(true);
  });

  it('aproveita a categoria que o emissor mandou quando o dicionário não sabe', () => {
    const r = rodar(CSV_FATURA_POSITIVA, { tipoDocumento: 'fatura' });
    expect(acha(r.itens, 'ATELIE')!.categoria).toBe('servicos');
  });
});

describe('CSV — planilha do usuário', () => {
  it('tudo positivo sem natureza: marca direção incerta', () => {
    const r = rodar(CSV_PLANILHA_AMBIGUA, { tipoDocumento: 'planilha' });
    expect(r.diagnostico.direcaoIncerta).toBe(true);
  });

  it('com coluna D/C, a direção fica confiável', () => {
    const r = rodar(CSV_PLANILHA_NATUREZA, { tipoDocumento: 'planilha' });
    expect(r.diagnostico.direcaoIncerta).toBe(false);
    expect(acha(r.itens, 'SALARIO')!.tipo).toBe('ativa');
    expect(acha(r.itens, 'MERCADO')!.tipo).toBe('saida');
    expect(acha(r.itens, 'DENTISTA')).toMatchObject({ tipo: 'saida', categoria: 'Saúde' });
  });
});

describe('memória memo→categoria', () => {
  const memoria: MemoriaCategoria[] = [{ chave: 'UBER TRIP', categoria: 'Lazer', tipo: 'saida' }];

  it('a correção do usuário ganha do dicionário', () => {
    const r = rodar(OFX_EXTRATO, undefined, { memoria });
    const uber = r.itens.find((i) => i.descricao.includes('UBER'))!;
    expect(uber.categoria).toBe('Lazer');
    expect(uber.motivo).toContain('já classificou');
  });
});

describe('dedupe', () => {
  it('reimportar o mesmo arquivo não traz nada marcado', () => {
    const primeiro = rodar(OFX_EXTRATO);
    const jaSalvos: JaSalvo[] = primeiro.itens.map((i) => ({ impressao: i.impressao, fitid: i.fitid }));
    const segundo = rodar(OFX_EXTRATO, undefined, { jaSalvos });

    expect(segundo.itens.every((i) => !i.incluir)).toBe(true);
    expect(segundo.itens.every((i) => i.alertas.includes('duplicata-salva'))).toBe(true);
    expect(segundo.avisos.some((a) => a.includes('já estavam no Ponto FIRE'))).toBe(true);
  });

  it('pega a duplicata mesmo quando o arquivo é CSV (sem FITID)', () => {
    const primeiro = rodar(CSV_EXTRATO_VIRGULA);
    const jaSalvos: JaSalvo[] = primeiro.itens.map((i) => ({ impressao: i.impressao }));
    const segundo = rodar(CSV_EXTRATO_VIRGULA, undefined, { jaSalvos });
    expect(segundo.itens.every((i) => i.incluir)).toBe(false);
  });

  it('duplicata dentro do arquivo só avisa — compra repetida acontece', () => {
    const dobrado = `${CSV_SEM_CABECALHO}\n14/08/2026;Padaria Sao Jose;-24,50`;
    const r = rodar(dobrado);
    const repetido = r.itens[3]!;
    expect(repetido.alertas).toContain('duplicata-arquivo');
    expect(repetido.incluir).toBe(true);
  });
});

describe('período declarado', () => {
  it('avisa quando o arquivo traz mês diferente do declarado', () => {
    const r = rodar(CSV_EXTRATO_VIRGULA, { mesEsperado: '2026-07' });
    expect(r.itens.every((i) => i.alertas.includes('fora-do-periodo'))).toBe(true);
    expect(r.avisos.some((a) => a.includes('outro mês'))).toBe(true);
  });

  it('não avisa nada quando bate', () => {
    const r = rodar(CSV_EXTRATO_VIRGULA, { mesEsperado: '2026-08' });
    expect(r.itens.some((i) => i.alertas.includes('fora-do-periodo'))).toBe(false);
  });
});

describe('robustez', () => {
  it('arquivo vazio não quebra', () => {
    const r = rodar('');
    expect(r.itens).toHaveLength(0);
  });

  it('arquivo que não é extrato nenhum não quebra', () => {
    const r = rodar('era uma vez\num arquivo\nque não era extrato');
    expect(r.itens).toHaveLength(0);
    expect(r.avisos.length).toBeGreaterThan(0);
  });

  it('OFX truncado no meio devolve o que deu pra ler', () => {
    const r = rodar(OFX_EXTRATO.slice(0, OFX_EXTRATO.indexOf('A005')));
    expect(r.itens.length).toBeGreaterThan(0);
    expect(r.itens.length).toBeLessThan(10);
  });

  it('a soma do que vai ser salvo bate, já sem as transferências', () => {
    const r = rodar(OFX_EXTRATO);
    const somar = (t: string) =>
      r.itens.filter((i) => i.incluir && i.tipo === t).reduce((s, i) => s + i.valor, 0);

    expect(somar('ativa')).toBeCloseTo(9500, 2);
    expect(somar('passiva')).toBeCloseTo(318.44, 2);
    // fora os 2.450 da fatura e os 3.000 da aplicação: contariam em dobro
    expect(somar('saida')).toBeCloseTo(1800 + 432.15 + 89.9 + 45.9 + 52.3 + 38, 2);
    expect(somar('aporte')).toBe(0);
  });

  it('aplicação em CDB, se o usuário resolver incluir, cai como aporte', () => {
    const r = rodar(OFX_EXTRATO);
    expect(acha(r.itens, 'APLICACAO')).toMatchObject({ tipo: 'aporte', incluir: false });
  });
});
