import { describe, it, expect } from 'vitest';
import { CATEGORIA_FATURA, CATEGORIA_TRANSFERENCIA } from '@pontofire/engine';
import { analisar, type EntradaAnalise } from './analisar';
import type {
  ContextoImport,
  ItemImportado,
  JaSalvo,
  MemoriaCategoria,
  ResultadoAnalise,
  TransferenciaSalva,
} from './tipos';
import {
  CSV_BAGUNCADO,
  CSV_BRADESCO,
  CSV_MERCADO_PAGO,
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

  it('pagamento de fatura já vem rotulado, não em branco', () => {
    // antes ficava sem categoria: se o usuário incluísse, virava "Outros" e
    // engordava um balde de consumo com dinheiro que não é consumo
    expect(acha(r.itens, 'PAGAMENTO DE FATURA')!.categoria).toBe(CATEGORIA_FATURA);
  });

  it('desmarca aplicação — é movimento entre contas, não despesa', () => {
    expect(acha(r.itens, 'APLICACAO')).toMatchObject({
      incluir: false,
      categoria: CATEGORIA_TRANSFERENCIA,
    });
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

  it('categoria neutra aprendida CONTINUA sendo transferência', () => {
    // Armadilha: a memória ganha do dicionário, então um "Transferência entre
    // contas" aprendido faria o próximo entrar MARCADO e contar como gasto —
    // com o nome da transferência estampado nele.
    const uber = rodar(OFX_EXTRATO).itens.find((i) => i.descricao.includes('UBER'))!;
    const r = rodar(OFX_EXTRATO, undefined, {
      memoria: [{ chave: uber.chave, categoria: CATEGORIA_TRANSFERENCIA, tipo: 'saida' }],
    });
    const depois = r.itens.find((i) => i.descricao.includes('UBER'))!;
    expect(depois.categoria).toBe(CATEGORIA_TRANSFERENCIA);
    expect(depois.alertas).toContain('transferencia');
    expect(depois.incluir).toBe(false);
  });

  it('aceita a categoria neutra escrita à mão, sem acento', () => {
    const uber = rodar(OFX_EXTRATO).itens.find((i) => i.descricao.includes('UBER'))!;
    const r = rodar(OFX_EXTRATO, undefined, {
      memoria: [{ chave: uber.chave, categoria: 'transferencia entre contas', tipo: 'saida' }],
    });
    expect(r.itens.find((i) => i.descricao.includes('UBER'))!.incluir).toBe(false);
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

// ---------------------------------------------------------------------------
// Regressões achadas rodando o parser em extratos REAIS (jul/2026).
// Cada teste aqui nasceu de um bug que só apareceu com arquivo de banco de
// verdade — as fixtures são anonimizadas, os formatos são fiéis.

describe('Mercado Pago — layout real', () => {
  const ctx = { nomeUsuario: 'Maria da Silva Santos' };
  const r = rodar(CSV_MERCADO_PAGO, ctx);

  it('NÃO confunde TRANSACTION_TYPE com coluna de natureza', () => {
    // Era o bug mais grave: a coluna casava com a palavra "TYPE", virava
    // `natureza`, e TODAS as 89 descrições do arquivo viravam "(sem descrição)"
    expect(r.diagnostico.colunas).toMatchObject({ descricao: 'TRANSACTION_TYPE' });
    expect(r.diagnostico.colunas).not.toHaveProperty('natureza');
    expect(r.itens.every((i) => i.descricao !== '(sem descrição)')).toBe(true);
  });

  it('atravessa o bloco de saldos que vem antes do cabeçalho real', () => {
    expect(r.itens.length).toBe(14);
    expect(r.diagnostico.periodo).toEqual({ inicio: '2026-07-01', fim: '2026-07-29' });
  });

  it('lê data com hífen (DD-MM-YYYY)', () => {
    expect(r.diagnostico.formatoData).toBe('DD/MM/AAAA');
    expect(acha(r.itens, 'JTM')!.data).toBe('2026-07-29');
  });

  it('cofrinho não é gasto nem receita', () => {
    for (const t of ['Reserva por gastos', 'Reserva programada', 'Dinheiro retirado']) {
      const i = acha(r.itens, t)!;
      expect(i.incluir, t).toBe(false);
      expect(i.alertas, t).toContain('transferencia');
      expect(i.categoria, t).toBe(CATEGORIA_TRANSFERENCIA);
    }
  });

  it('a chave é o estabelecimento, não o prefixo "Pagamento com QR Pix"', () => {
    const noves = r.itens.filter((i) => i.descricao.includes('99 TECNOLOGIA'));
    expect(noves.length).toBeGreaterThan(1);
    expect(new Set(noves.map((i) => i.chave)).size).toBe(1);
    expect(noves[0]!.chave).toContain('99 TECNOLOGIA');
    expect(noves.every((i) => i.categoria === 'Transporte')).toBe(true);
  });

  it('99 Food é delivery, 99 Tecnologia é transporte', () => {
    expect(acha(r.itens, '99 FOOD')!.categoria).toBe('Delivery');
    expect(acha(r.itens, 'IFOOD')!.categoria).toBe('Delivery');
  });

  it('rendimento do saldo é renda passiva', () => {
    expect(acha(r.itens, 'Rendimentos')).toMatchObject({ tipo: 'passiva', categoria: 'Juros / Renda fixa' });
  });
});

describe('Bradesco — layout real', () => {
  const r = rodar(CSV_BRADESCO, { nomeUsuario: 'Maria da Silva Santos' }, {}, 'latin1');

  it('lê arquivo com \\r sozinho como quebra de linha', () => {
    expect(r.itens.length).toBe(5);
    expect(r.diagnostico.codificacao).toBe('Windows-1252');
  });

  it('RECUPERA A CONTRAPARTE da linha de continuação', () => {
    // Era jogada fora como "linha ignorada" — e é a informação que mais ajuda
    // a identificar a transação
    expect(acha(r.itens, 'Conta Telefone')!.contraparte).toContain('Vivo');
    expect(acha(r.itens, 'Trans Sal')!.contraparte).toBe('Empregador Exemplo Ltda');
    expect(acha(r.itens, 'Joao Pereira')!.contraparte).toBe('Joao Pereira Lima');
  });

  it('a contraparte entra na categorização', () => {
    // "Conta Telefone" sozinho não diz nada; com "Vivo" vira Contas
    expect(acha(r.itens, 'Conta Telefone')!.categoria).toBe('Contas');
  });

  it('tira o prefixo Des:/Rem:/Remet. sem comer letra do nome', () => {
    expect(acha(r.itens, 'Joao Pereira')!.contraparte).not.toMatch(/^(es|em|et)/);
  });

  it('não gruda o rodapé nem o título de seção na última transação', () => {
    expect(r.itens.every((i) => !/dados acima|Total/i.test(i.contraparte ?? ''))).toBe(true);
  });

  it('"Rentab.invest" é rendimento, não aplicação', () => {
    // O padrão de transferência "INVEST FACIL" casava com "invest Facilcred"
    expect(acha(r.itens, 'Rentab')).toMatchObject({ tipo: 'passiva', incluir: true });
  });
});

describe('transferência do usuário pra ele mesmo', () => {
  it('reconhece mesmo com o nome truncado pelo banco', () => {
    // Bradesco grava "Des: Maria da Silva Santos 04/07"; o Mercado Pago grava
    // o nome inteiro. Os dois lados têm que casar com o mesmo usuário.
    const bra = rodar(CSV_BRADESCO, { nomeUsuario: 'Maria da Silva Santos' }, {}, 'latin1');
    const mp = rodar(CSV_MERCADO_PAGO, { nomeUsuario: 'Maria da Silva Santos' });

    expect(bra.diagnostico.transferenciasProprias).toBeGreaterThan(0);
    expect(mp.diagnostico.transferenciasProprias).toBeGreaterThan(0);
  });

  it('vem desmarcada — não é receita nem despesa', () => {
    const r = rodar(CSV_MERCADO_PAGO, { nomeUsuario: 'Maria da Silva Santos' });
    const propria = r.itens.find((i) => i.alertas.includes('transferencia-propria'))!;
    expect(propria.incluir).toBe(false);
  });

  it('ganha a categoria mesmo sem casar com o dicionário', () => {
    // "Pix recebido MARIA DA SILVA SANTOS" não bate com padrão nenhum; quem
    // resolve é o nome no destinatário
    const r = rodar(CSV_MERCADO_PAGO, { nomeUsuario: 'Maria da Silva Santos' });
    const proprias = r.itens.filter((i) => i.alertas.includes('transferencia-propria'));
    expect(proprias.length).toBeGreaterThan(0);
    expect(proprias.every((i) => i.categoria === CATEGORIA_TRANSFERENCIA)).toBe(true);
  });

  it('sugere importar o extrato da outra instituição', () => {
    const r = rodar(CSV_MERCADO_PAGO, { nomeUsuario: 'Maria da Silva Santos' });
    expect(r.avisos.some((a) => /extrato da outra institui/i.test(a))).toBe(true);
  });

  it('não confunde um terceiro com o próprio usuário', () => {
    const r = rodar(CSV_MERCADO_PAGO, { nomeUsuario: 'Maria da Silva Santos' });
    expect(acha(r.itens, 'Joao Pereira')!.alertas).not.toContain('transferencia-propria');
  });

  it('sem o nome do usuário, nada é marcado como próprio', () => {
    const r = rodar(CSV_MERCADO_PAGO);
    expect(r.diagnostico.transferenciasProprias).toBe(0);
  });

  it('nome de uma palavra só não dispara (evita falso positivo)', () => {
    const r = rodar(CSV_MERCADO_PAGO, { nomeUsuario: 'Maria' });
    expect(r.diagnostico.transferenciasProprias).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe('conciliação entre instituições — o 0 a 0', () => {
  const EU = { nomeUsuario: 'Maria da Silva Santos' };

  /** Simula o que o app grava depois de importar um extrato. */
  const guardar = (r: ResultadoAnalise, instituicao: string): TransferenciaSalva[] =>
    r.itens
      .filter((i) => i.alertas.includes('transferencia-propria'))
      .map((i) => ({
        impressao: i.impressao,
        data: i.data,
        valor: i.valor,
        sentido: i.tipo === 'saida' ? ('saida' as const) : ('entrada' as const),
        instituicao,
      }));

  // Bradesco 06/07: saída de R$ 6.770,00 pra ela mesma.
  // Mercado Pago 04/07: entrada de R$ 6.770,00 dela mesma. É o mesmo dinheiro.
  const bradesco = rodar(CSV_BRADESCO, EU, {}, 'latin1');
  const salvas = guardar(bradesco, 'Bradesco');

  it('o primeiro extrato não tem com o que conciliar', () => {
    expect(bradesco.diagnostico.transferenciasConciliadas).toBe(0);
  });

  it('o segundo extrato acha o outro lado e fecha em zero', () => {
    const mp = rodar(CSV_MERCADO_PAGO, EU, { transferenciasSalvas: salvas });
    const par = mp.itens.find((i) => i.alertas.includes('conciliada'));

    expect(mp.diagnostico.transferenciasConciliadas).toBe(1);
    expect(par?.valor).toBe(6770);
    expect(par?.conciliadaCom).toEqual({ data: '2026-07-06', instituicao: 'Bradesco' });
    // conciliada continua fora dos totais: o 0 a 0 é justamente não contar
    expect(par?.incluir).toBe(false);
  });

  it('diz de onde veio o outro lado', () => {
    const mp = rodar(CSV_MERCADO_PAGO, EU, { transferenciasSalvas: salvas });
    const par = mp.itens.find((i) => i.alertas.includes('conciliada'))!;
    expect(par.motivo).toMatch(/Bradesco/);
    expect(mp.avisos.some((a) => /fecharam com o outro lado/.test(a))).toBe(true);
  });

  it('as que não acharam par continuam cobrando o outro extrato', () => {
    const mp = rodar(CSV_MERCADO_PAGO, EU, { transferenciasSalvas: salvas });
    // sobram a entrada de 394,74 e a saída de 500,00
    expect(mp.diagnostico.transferenciasProprias - mp.diagnostico.transferenciasConciliadas).toBe(2);
    expect(mp.avisos.some((a) => /ainda est(ã|a)o sem par/.test(a))).toBe(true);
  });

  it('não casa dois lançamentos no MESMO sentido', () => {
    // saída contra saída não é transferência entre contas, é gasto duplicado
    const mp = rodar(CSV_MERCADO_PAGO, EU, {
      transferenciasSalvas: [
        { impressao: 'x', data: '2026-07-04', valor: 6770, sentido: 'entrada', instituicao: 'Itaú' },
      ],
    });
    expect(mp.diagnostico.transferenciasConciliadas).toBe(0);
  });

  it('não casa valor diferente, nem por um centavo', () => {
    const mp = rodar(CSV_MERCADO_PAGO, EU, {
      transferenciasSalvas: [
        { impressao: 'x', data: '2026-07-04', valor: 6770.01, sentido: 'saida' },
      ],
    });
    expect(mp.diagnostico.transferenciasConciliadas).toBe(0);
  });

  it('não casa fora da janela de 3 dias', () => {
    const mp = rodar(CSV_MERCADO_PAGO, EU, {
      transferenciasSalvas: [
        { impressao: 'x', data: '2026-07-09', valor: 6770, sentido: 'saida' },
      ],
    });
    expect(mp.diagnostico.transferenciasConciliadas).toBe(0);
  });

  it('uma salva fecha com um item só — não vira par de todo mundo', () => {
    // duas entradas iguais no arquivo contra UMA saída salva: só uma concilia
    const mp = rodar(CSV_MERCADO_PAGO, EU, {
      transferenciasSalvas: [
        { impressao: 'a', data: '2026-07-04', valor: 6770, sentido: 'saida' },
        { impressao: 'b', data: '2026-07-04', valor: 6770, sentido: 'saida' },
      ],
    });
    // só existe uma entrada de 6770 no MP, então no máximo uma conciliação
    expect(mp.diagnostico.transferenciasConciliadas).toBe(1);
  });

  it('sem memória de transferências, nada concilia (e nada quebra)', () => {
    const mp = rodar(CSV_MERCADO_PAGO, EU);
    expect(mp.diagnostico.transferenciasConciliadas).toBe(0);
    expect(mp.itens.every((i) => i.conciliadaCom === undefined)).toBe(true);
  });
});
