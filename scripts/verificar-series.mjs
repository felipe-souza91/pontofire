#!/usr/bin/env node
/**
 * Verificador das séries do BACEN (SGS) usadas pelo Ponto FIRE.
 *
 * POR QUE ISSO EXISTE
 * O app depende de códigos de série do SGS (432, 433, 188, 189, 4390). Um
 * código errado não quebra nada visivelmente — ele devolve NÚMEROS, só que os
 * números de outra coisa. Isso é o pior tipo de bug num produto que promete
 * honestidade: some silenciosamente dentro de um card com cara de verdade.
 *
 * COMO ELE VERIFICA SEM SABER A RESPOSTA
 * Não dá pra perguntar ao SGS "esta série é o INPC?". Então a checagem é por
 * COMPORTAMENTO e por CRUZAMENTO entre séries que precisam concordar entre si:
 *
 *  - Selic acumulada no mês (4390) composta em 12 meses tem que cair perto da
 *    Selic meta de hoje (432). Se 4390 fosse outra coisa, essas duas não se
 *    encontrariam.
 *  - INPC (188) e IPCA (433) em 12 meses medem cestas parecidas e andam
 *    coladas. Se 188 fosse outro índice, a distância explodiria.
 *
 * Isso transforma "o Claude precisa lembrar o código certo" em "o repositório
 * confere sozinho, toda semana".
 *
 * Roda no GitHub Actions, que alcança api.bcb.gov.br. Saída em Markdown no
 * resumo do job, pra ser lida no navegador sem abrir log.
 */

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';
const TIMEOUT_MS = 20_000;

/** O manifesto espelha SERIES em app/src/data/indicadores.ts. */
const SERIES = {
  selicMeta: { codigo: 432, rotulo: 'Selic meta', unidade: '% a.a.', pontos: 1 },
  selicMensal: { codigo: 4390, rotulo: 'Selic acumulada no mês', unidade: '% a.m.', pontos: 120 },
  ipca: { codigo: 433, rotulo: 'IPCA', unidade: '% a.m.', pontos: 120 },
  inpc: { codigo: 188, rotulo: 'INPC', unidade: '% a.m.', pontos: 12 },
  igpm: { codigo: 189, rotulo: 'IGP-M', unidade: '% a.m.', pontos: 12 },
};

// ---------------------------------------------------------------------------

async function pedir(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  if (!Array.isArray(json) || json.length === 0) throw new Error('resposta vazia');
  return json.map((p) => ({ data: p.data, valor: Number(String(p.valor).replace(',', '.')) }));
}

const ddmmaaaa = (d) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/**
 * O SGS recusa `/dados/ultimos/N` com N grande em algumas séries — devolve
 * HTTP 400, não uma lista menor. Descoberto na prática: 432 (1 ponto), 188 e
 * 189 (12) passaram, enquanto 4390 e 433 pedindo 120 quebraram.
 *
 * Então: tenta o caminho curto e, se ele falhar num pedido longo, cai pra
 * janela por data, que o SGS aceita sem limite de tamanho.
 */
async function buscar(codigo, pontos) {
  try {
    return await pedir(`${BASE}.${codigo}/dados/ultimos/${pontos}?formato=json`);
  } catch (e) {
    if (pontos <= 12) throw e;
    const fim = new Date();
    const ini = new Date(fim.getFullYear(), fim.getMonth() - pontos - 1, 1);
    const pts = await pedir(
      `${BASE}.${codigo}/dados?formato=json&dataInicial=${ddmmaaaa(ini)}&dataFinal=${ddmmaaaa(fim)}`,
    );
    return pts.slice(-pontos);
  }
}

const valores = (pts) => pts.map((p) => p.valor);
const ultimo = (pts) => pts[pts.length - 1];

/** Compõe % mensais e anualiza: (Πfatores)^(12/n) − 1, em %. */
function anualizar(mensais) {
  const fator = mensais.reduce((acc, v) => acc * (1 + v / 100), 1);
  return (Math.pow(fator, 12 / mensais.length) - 1) * 100;
}

/** Acumulado simples do período informado, em %. */
function acumular(mensais) {
  return (mensais.reduce((acc, v) => acc * (1 + v / 100), 1) - 1) * 100;
}

const dentro = (v, [min, max]) => Number.isFinite(v) && v >= min && v <= max;
const num = (v, casas = 2) => (Number.isFinite(v) ? v.toFixed(casas) : '—');

// ---------------------------------------------------------------------------

const resultados = [];
/** `critico: false` = informativo, não derruba o CI. */
function registrar(nome, ok, detalhe, critico = true) {
  resultados.push({ nome, ok, detalhe, critico });
}

/** Baixa tudo, tolerando falha por série. */
async function coletar() {
  const dados = {};
  const falhasDeRede = [];
  for (const [chave, s] of Object.entries(SERIES)) {
    try {
      dados[chave] = await buscar(s.codigo, s.pontos);
    } catch (e) {
      falhasDeRede.push(`${s.rotulo} (${s.codigo}): ${e.message}`);
      dados[chave] = null;
    }
  }
  return { dados, falhasDeRede };
}

/**
 * Toda a análise, separada do fetch — é o que permite testar o verificador
 * com dados sintéticos antes de confiar nele no CI.
 */
export function analisar(dados, falhasDeRede = []) {
  resultados.length = 0;

  // --- 432: Selic meta ------------------------------------------------------
  let selicHoje = null;
  if (dados.selicMeta) {
    selicHoje = ultimo(dados.selicMeta).valor;
    registrar(
      'Selic meta (432)',
      dentro(selicHoje, [0, 40]),
      `${num(selicHoje)}% a.a. em ${ultimo(dados.selicMeta).data}`,
    );
  } else registrar('Selic meta (432)', false, 'não respondeu (SGS fora do ar?)', false);

  // --- 4390: Selic acumulada no mês ----------------------------------------
  // É a série que sustenta o juro real de 10 anos do card econômico.
  let selicRealizada12 = null;
  if (dados.selicMensal) {
    const v = valores(dados.selicMensal);
    const faixaOk = v.every((x) => dentro(x, [0, 3]));
    registrar(
      'Selic mensal (4390) — unidade',
      faixaOk,
      faixaOk
        ? `${v.length} meses, todos entre 0% e 3% a.m. (último: ${num(ultimo(dados.selicMensal).valor)}%)`
        : `valores fora de 0–3% a.m. → NÃO é taxa mensal. Máx: ${num(Math.max(...v))}`,
    );

    selicRealizada12 = anualizar(v.slice(-12));
    if (selicHoje !== null) {
      const dist = Math.abs(selicRealizada12 - selicHoje);
      registrar(
        'Selic 4390 × 432 — cruzamento',
        dist <= 8,
        `realizada 12m = ${num(selicRealizada12)}% a.a. vs. meta de hoje ${num(selicHoje)}% a.a. (distância ${num(dist)} p.p.)`,
      );
    }
  } else registrar('Selic mensal (4390)', false, 'não respondeu (SGS fora do ar?)', false);

  // --- 433: IPCA ------------------------------------------------------------
  let ipca12 = null;
  if (dados.ipca) {
    const v = valores(dados.ipca);
    const faixaOk = v.every((x) => dentro(x, [-2, 5]));
    ipca12 = acumular(v.slice(-12));
    registrar(
      'IPCA (433)',
      faixaOk && dentro(ipca12, [-5, 30]),
      `acumulado 12m = ${num(ipca12)}% (último mês: ${num(ultimo(dados.ipca).valor)}%)`,
    );
  } else registrar('IPCA (433)', false, 'não respondeu (SGS fora do ar?)', false);

  // --- 188: INPC (o código que estava marcado "a confirmar") ---------------
  if (dados.inpc) {
    const v = valores(dados.inpc);
    const inpc12 = acumular(v);
    const faixaOk = v.every((x) => dentro(x, [-2, 5]));
    registrar('INPC (188) — unidade', faixaOk, `acumulado 12m = ${num(inpc12)}%`);

    if (ipca12 !== null) {
      const dist = Math.abs(inpc12 - ipca12);
      registrar(
        'INPC 188 × IPCA 433 — cruzamento',
        dist <= 4,
        `INPC ${num(inpc12)}% vs. IPCA ${num(ipca12)}% em 12m (distância ${num(dist)} p.p.)`,
      );
    }
  } else registrar('INPC (188)', false, 'não respondeu (SGS fora do ar?)', false);

  // --- 189: IGP-M (não usado ainda; fica só de olho) -----------------------
  if (dados.igpm) {
    const v = valores(dados.igpm);
    registrar(
      'IGP-M (189)',
      v.every((x) => dentro(x, [-8, 10])),
      `acumulado 12m = ${num(acumular(v))}% — série ainda não usada pelo app`,
      false,
    );
  }

  // --- o número que o card econômico vai mostrar ---------------------------
  let juroReal10a = null;
  if (dados.selicMensal && dados.ipca) {
    const n = Math.min(dados.selicMensal.length, dados.ipca.length);
    const selicAA = anualizar(valores(dados.selicMensal).slice(-n));
    const ipcaAA = anualizar(valores(dados.ipca).slice(-n));
    juroReal10a = ((1 + selicAA / 100) / (1 + ipcaAA / 100) - 1) * 100;
    registrar(
      `Juro real médio de ${Math.round(n / 12)} anos`,
      dentro(juroReal10a, [0, 12]),
      `${num(juroReal10a, 1)}% a.a. (Selic realizada ${num(selicAA, 1)}% × IPCA ${num(ipcaAA, 1)}%) — é este o número do card`,
    );
  }

  // --- relatório -----------------------------------------------------------
  const criticasFalhas = resultados.filter((r) => !r.ok && r.critico);
  const linhas = [
    '## Séries do BACEN (SGS)',
    '',
    '| | Verificação | Resultado |',
    '|---|---|---|',
    ...resultados.map((r) => `| ${r.ok ? '✅' : r.critico ? '❌' : '⚠️'} | ${r.nome} | ${r.detalhe} |`),
    '',
  ];

  if (falhasDeRede.length) {
    linhas.push('### Não responderam', '', ...falhasDeRede.map((f) => `- ${f}`), '');
  }
  // Um cruzamento que NÃO RODOU não é um cruzamento que passou. Sem isto, o
  // relatório dizia "tudo certo" tendo verificado só a faixa de duas séries.
  const CRUZAMENTOS = ['Selic 4390 × 432 — cruzamento', 'INPC 188 × IPCA 433 — cruzamento'];
  const naoRodaram = CRUZAMENTOS.filter((c) => !resultados.some((r) => r.nome === c));
  const nadaRespondeu = Object.values(dados).every((d) => !d);

  if (naoRodaram.length) {
    linhas.push('### Não foi possível verificar', '', ...naoRodaram.map((c) => `- ${c}`), '');
  }

  linhas.push(
    nadaRespondeu
      ? '**Não deu pra verificar.** Nenhuma série respondeu — provavelmente o SGS está fora do ar. Isso não diz nada sobre os códigos; o job volta a rodar na próxima segunda.'
      : criticasFalhas.length
        ? `**${criticasFalhas.length} verificação(ões) crítica(s) falharam.** Um código de série provavelmente mudou ou está errado em \`app/src/data/indicadores.ts\`.`
        : naoRodaram.length
          ? `**Verificação incompleta.** ${naoRodaram.length} cruzamento(s) não rodaram porque a série que eles comparam não veio. O que respondeu está coerente, mas isso NÃO confirma os códigos.`
          : '**Tudo certo.** Os códigos batem com o que o app espera.',
  );

  return {
    relatorio: linhas.join('\n'),
    resultados: [...resultados],
    falhou: criticasFalhas.length > 0 || (!nadaRespondeu && naoRodaram.length > 0),
    juroReal10a,
  };
}

async function main() {
  const { dados, falhasDeRede } = await coletar();
  const { relatorio, falhou } = analisar(dados, falhasDeRede);

  console.log(relatorio);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, relatorio + '\n');
  }
  process.exit(falhou ? 1 : 0);
}

// só executa quando chamado direto (`node scripts/verificar-series.mjs`)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error('Falhou antes de conseguir verificar:', e);
    process.exit(1);
  });
}
