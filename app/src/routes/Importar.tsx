import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  analisar,
  type ContextoImport,
  type ItemImportado,
  type MemoriaCategoria,
  type ResultadoAnalise,
  type TipoDocumento,
} from '@pontofire/importer';
import { useAuth } from '../auth/useAuth';
import { useSnapshots } from '../hooks/useSnapshots';
import { useUserDoc } from '../hooks/useUserDoc';
import { buscarImpressoes, salvarTransacoesEmLote, ROTULO_TIPO, type TipoTransacao } from '../data/transactions';
import { carregarMemoria, ensinarRegras } from '../data/importRules';
import { buscarTransferencias, salvarTransferencias } from '../data/transfers';
import { CATEGORIAS, normalizarCategoria } from '../data/categorias';
import { INSTITUICOES, canonizarInstituicao } from '../data/instituicoes';
import { Campo } from '../components/Campo';
import { CategoriaInput } from '../components/CategoriaInput';
import { LinhaImport } from '../components/LinhaImport';
import { formatBRL, formatMesAno } from '../utils/format';

type Etapa = 'arquivo' | 'revisao' | 'pronto';
type Filtro = 'todos' | 'pendentes' | 'alertas' | 'fora';

const DOCUMENTOS: { valor: TipoDocumento; rotulo: string; dica: string }[] = [
  { valor: 'extrato', rotulo: 'Extrato bancário', dica: 'da conta corrente — entradas e saídas' },
  { valor: 'fatura', rotulo: 'Fatura de cartão', dica: 'as compras do cartão de crédito' },
  { valor: 'planilha', rotulo: 'Planilha minha', dica: 'um CSV que você mesmo montou' },
];

export function Importar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lista: snaps } = useSnapshots(user?.uid ?? null);
  const { doc } = useUserDoc(user?.uid ?? null);

  // Nome do usuário pro reconhecimento de transferência pra si mesmo. Vale o
  // mais completo que existir: o banco grava o nome inteiro, e apelido sozinho
  // ("Felipe") não é suficiente pra distinguir de um xará.
  const nomeUsuario = [doc?.nome, user?.displayName, doc?.apelido]
    .filter((n): n is string => Boolean(n && n.trim()))
    .sort((a, b) => b.length - a.length)[0];
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [etapa, setEtapa] = useState<Etapa>('arquivo');
  const [ctx, setCtx] = useState<ContextoImport>({});
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [analise, setAnalise] = useState<ResultadoAnalise | null>(null);
  const [itens, setItens] = useState<ItemImportado[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvos, setSalvos] = useState(0);
  const [guardadas, setGuardadas] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  // -------------------------------------------------------------- etapa 1
  async function receberArquivo(file: File) {
    if (!user) return;
    setErro(null);
    setOcupado(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const memoria = await carregarMemoria(user.uid).catch(() => [] as MemoriaCategoria[]);

      // 1ª passada: descobre quais meses o arquivo toca
      const comNome: ContextoImport = {
        ...ctx,
        instituicao: canonizarInstituicao(ctx.instituicao ?? '') || undefined,
        nomeUsuario,
      };
      const previa = analisar({ nome: file.name, bytes, contexto: comNome, memoria });
      const meses = [...new Set(previa.itens.map((i) => i.data.slice(0, 7)))];

      // 2ª passada: agora com o que já está salvo nesses meses, pro dedupe, e
      // com as transferências próprias de importações anteriores, pra conciliar
      const [jaSalvos, transferenciasSalvas] = meses.length
        ? await Promise.all([
            buscarImpressoes(user.uid, meses).catch(() => []),
            buscarTransferencias(user.uid, meses).catch(() => []),
          ])
        : [[], []];
      const r = analisar({
        nome: file.name,
        bytes,
        contexto: comNome,
        memoria,
        jaSalvos,
        transferenciasSalvas,
      });

      if (!r.itens.length) {
        setErro(
          'Não encontrei nenhum lançamento nesse arquivo. Confira se é um OFX ou um CSV com colunas de data e valor.',
        );
        return;
      }
      setNomeArquivo(file.name);
      setAnalise(r);
      setItens(r.itens);
      setEtapa('revisao');
    } catch {
      setErro('Não consegui ler esse arquivo. Se ele veio zipado ou em PDF, exporte em OFX ou CSV.');
    } finally {
      setOcupado(false);
      if (inputArquivo.current) inputArquivo.current.value = '';
    }
  }

  // -------------------------------------------------------------- edição
  function alterar(id: string, patch: Partial<ItemImportado>) {
    setItens((atual) => atual.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  /** Categorizar um item aplica aos iguais que ainda estão sem categoria. */
  function categorizar(id: string, categoria: string) {
    const alvo = itens.find((i) => i.id === id);
    if (!alvo) return;
    const cat = normalizarCategoria(categoria);
    let irmaos = 0;
    setItens((atual) =>
      atual.map((i) => {
        if (i.id === id) return { ...i, categoria: cat };
        if (cat && i.chave === alvo.chave && !i.categoria) {
          irmaos++;
          return { ...i, categoria: cat, tipo: alvo.tipo };
        }
        return i;
      }),
    );
    setAviso(irmaos ? `"${cat}" aplicado também a ${irmaos} lançamento(s) do mesmo lugar.` : null);
  }

  function todosPara(tipo: TipoTransacao) {
    setItens((atual) =>
      atual.map((i) => (i.alertas.includes('direcao-incerta') ? { ...i, tipo } : i)),
    );
    setAviso(`Todos os lançamentos em dúvida viraram "${ROTULO_TIPO[tipo]}".`);
  }

  function marcarTodos(incluir: boolean) {
    const alvo = new Set(visiveis.map((i) => i.id));
    setItens((atual) => atual.map((i) => (alvo.has(i.id) ? { ...i, incluir } : i)));
  }

  // -------------------------------------------------------------- derivados
  const visiveis = useMemo(() => {
    if (!itens.length) return [];
    const f = {
      todos: () => true,
      pendentes: (i: ItemImportado) => i.incluir && !i.categoria,
      alertas: (i: ItemImportado) => i.alertas.length > 0,
      fora: (i: ItemImportado) => i.alertas.includes('fora-do-periodo'),
    }[filtro];
    return itens.filter(f);
  }, [itens, filtro]);

  const aprovados = useMemo(() => itens.filter((i) => i.incluir), [itens]);

  /**
   * Transferências suas pra você mesmo que continuam fora dos lançamentos.
   * Não viram receita nem despesa, mas são gravadas em separado: é a memória
   * que permite o próximo extrato dizer "isso aqui fecha em zero". Se o usuário
   * marcou uma delas pra entrar de verdade, ela deixa de ser transferência.
   */
  const proprias = useMemo(
    () => itens.filter((i) => i.alertas.includes('transferencia-propria') && !i.incluir),
    [itens],
  );

  const resumo = useMemo(() => {
    const s = { ativa: 0, passiva: 0, aporte: 0, saida: 0 };
    for (const i of aprovados) s[i.tipo] += i.valor;
    const meses = [...new Set(aprovados.map((i) => i.data.slice(0, 7)))].sort();
    return { ...s, meses, semCategoria: aprovados.filter((i) => !i.categoria).length };
  }, [aprovados]);

  const mesesSemSnapshot = resumo.meses.filter((m) => !snaps.some((s) => s.mes === m));

  // -------------------------------------------------------------- salvar
  async function salvar() {
    if (!user || (!aprovados.length && !proprias.length)) return;
    setErro(null);
    setOcupado(true);
    try {
      // primeiro a memória de conciliação: mesmo que o usuário não aprove
      // nenhum lançamento, saber que houve transferência entre contas dele já
      // vale — é o que fecha a conta quando o outro extrato chegar.
      const instituicao = analise?.diagnostico.instituicao;
      await salvarTransferencias(
        user.uid,
        proprias.map((i) => ({
          impressao: i.impressao,
          data: i.data,
          valor: i.valor,
          sentido: (i.tipo === 'saida' ? 'saida' : 'entrada') as 'entrada' | 'saida',
          ...(instituicao ? { instituicao } : {}),
        })),
      ).catch(() => undefined);

      await salvarTransacoesEmLote(
        user.uid,
        aprovados.map((i) => ({
          mes: i.data.slice(0, 7),
          tipo: i.tipo,
          categoria: normalizarCategoria(i.categoria) || 'Outros',
          valor: i.valor,
          descricao: i.descricao,
          origem: 'import' as const,
          data: i.data,
          impressao: i.impressao,
          ...(i.fitid ? { fitid: i.fitid } : {}),
        })),
      );

      // só ensina o que o usuário aprovou de fato
      const regras: MemoriaCategoria[] = aprovados
        .filter((i) => i.categoria && i.chave)
        .map((i) => ({ chave: i.chave, categoria: normalizarCategoria(i.categoria), tipo: i.tipo }));
      await ensinarRegras(user.uid, regras).catch(() => undefined);

      setSalvos(aprovados.length);
      setGuardadas(proprias.length);
      setEtapa('pronto');
    } catch {
      setErro('Salvei parte e travei no meio. Tente de novo — o que já entrou não vai duplicar.');
    } finally {
      setOcupado(false);
    }
  }

  // ============================================================== render
  return (
    <main
      className="pf-container"
      style={{ maxWidth: etapa === 'revisao' ? '60rem' : '32rem', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button
          className="pf-btn-link"
          style={{ padding: 0 }}
          onClick={() => (etapa === 'revisao' ? setEtapa('arquivo') : navigate('/lancar'))}
        >
          ← Voltar
        </button>
        <strong className="mono" style={{ flex: 1, textAlign: 'center' }}>Importar</strong>
        <span style={{ width: '3rem' }} />
      </header>

      {erro && <p className="pf-error">{erro}</p>}

      {etapa === 'arquivo' && (
        <EtapaArquivo
          ctx={ctx}
          setCtx={setCtx}
          ocupado={ocupado}
          inputArquivo={inputArquivo}
          onArquivo={receberArquivo}
        />
      )}

      {etapa === 'revisao' && analise && (
        <>
          <Diagnostico nome={nomeArquivo} analise={analise} />

          {analise.diagnostico.direcaoIncerta && (
            <div className="pf-card-alerta">
              <strong>Preciso da sua ajuda numa coisa.</strong>
              <p style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>
                Esse arquivo tem todos os valores positivos e não diz o que é entrada e o que é saída.
                Marquei tudo como despesa. Se for o contrário, resolve tudo de uma vez aqui:
              </p>
              <div className="pf-chips">
                <button className="pf-chip" onClick={() => todosPara('saida')}>Tudo é despesa</button>
                <button className="pf-chip" onClick={() => todosPara('ativa')}>Tudo é receita</button>
                <button className="pf-chip" onClick={() => todosPara('aporte')}>Tudo é aporte</button>
              </div>
            </div>
          )}

          {analise.diagnostico.transferenciasProprias > 0 && (
            <div className="pf-card-alerta">
              <strong>Achei dinheiro seu indo pra você mesmo.</strong>
              <p style={{ margin: 'var(--space-2) 0 0' }}>
                {analise.diagnostico.transferenciasProprias} transferência(s) em que o nome do
                destinatário ou do remetente é o seu. Não são receita nem despesa, então vieram
                desmarcadas — mas elas indicam que <strong>você move dinheiro entre contas</strong>.
              </p>
              {analise.diagnostico.transferenciasConciliadas > 0 && (
                <p style={{ margin: 'var(--space-2) 0 0' }}>
                  <strong>{analise.diagnostico.transferenciasConciliadas} já fecharam em zero:</strong>{' '}
                  achei o outro lado num extrato que você importou antes. Saiu de uma conta sua,
                  entrou na outra — não some dinheiro nem aparece receita do nada.
                </p>
              )}
              {analise.diagnostico.transferenciasConciliadas <
                analise.diagnostico.transferenciasProprias && (
                <p style={{ margin: 'var(--space-2) 0 0' }}>
                  As que ficaram sem par eu guardo mesmo assim. Quando você importar o extrato da
                  outra instituição, elas se encontram sozinhas. Sem isso, seu mês fica com a
                  receita aqui e as despesas em lugar nenhum.
                </p>
              )}
            </div>
          )}

          {analise.avisos.length > 0 && (
            <ul className="pf-avisos">
              {analise.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}

          <Resumo resumo={resumo} total={aprovados.length} de={itens.length} />

          <div className="pf-import-barra">
            <div className="pf-chips">
              {(
                [
                  ['todos', `Todos (${itens.length})`],
                  ['pendentes', `Sem categoria (${itens.filter((i) => i.incluir && !i.categoria).length})`],
                  ['alertas', `Com alerta (${itens.filter((i) => i.alertas.length).length})`],
                  ['fora', `Outro mês (${itens.filter((i) => i.alertas.includes('fora-do-periodo')).length})`],
                ] as [Filtro, string][]
              )
                .filter(([f]) => f === 'todos' || itens.some((i) => (f === 'pendentes' ? i.incluir && !i.categoria : f === 'alertas' ? i.alertas.length : i.alertas.includes('fora-do-periodo'))))
                .map(([f, rotulo]) => (
                  <button key={f} className={`pf-chip ${filtro === f ? 'on' : ''}`} onClick={() => setFiltro(f)}>
                    {rotulo}
                  </button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="pf-btn-link" style={{ padding: 0 }} onClick={() => marcarTodos(true)}>marcar visíveis</button>
              <button className="pf-btn-link" style={{ padding: 0 }} onClick={() => marcarTodos(false)}>desmarcar</button>
            </div>
          </div>

          {aviso && <p className="pf-hint pf-import-toast">{aviso}</p>}

          <div className="pf-import-lista">
            {visiveis.map((it) => (
              <LinhaImport
                key={it.id}
                item={it}
                categorias={CATEGORIAS[it.tipo]}
                onAlterar={(patch) => alterar(it.id, patch)}
                onCategoria={(c) => categorizar(it.id, c)}
              />
            ))}
            {!visiveis.length && <p className="pf-hint">Nada neste filtro.</p>}
          </div>

          {mesesSemSnapshot.length > 0 && (
            <p className="pf-hint" style={{ marginTop: 'var(--space-4)' }}>
              ⓘ {mesesSemSnapshot.map(rotuloMes).join(', ')} ainda não {mesesSemSnapshot.length > 1 ? 'foram lançados' : 'foi lançado'} no
              modo rápido. Os itens ficam salvos e aparecem assim que você lançar os totais do mês —
              o total continua sendo a verdade, os itens só o decompõem.
            </p>
          )}

          <button
            className="pf-btn pf-btn-primary"
            style={{ marginTop: 'var(--space-6)' }}
            disabled={ocupado || (!aprovados.length && !proprias.length)}
            onClick={() => void salvar()}
          >
            {ocupado
              ? 'Salvando…'
              : aprovados.length
                ? `Salvar ${aprovados.length} lançamento(s)`
                : `Guardar ${proprias.length} transferência(s) pra conciliação`}
          </button>
          {resumo.semCategoria > 0 && (
            <p className="pf-hint" style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
              {resumo.semCategoria} sem categoria {resumo.semCategoria > 1 ? 'vão' : 'vai'} entrar como "Outros".
            </p>
          )}
        </>
      )}

      {etapa === 'pronto' && (
        <div className="pf-hero-card" style={{ textAlign: 'center' }}>
          <span className="pf-eyebrow">Importado</span>
          <h2 style={{ marginTop: 'var(--space-3)' }}>{salvos} lançamento(s) salvos.</h2>
          <p style={{ color: 'var(--muted)' }}>
            {resumo.meses.length === 1
              ? `Tudo em ${rotuloMes(resumo.meses[0]!)}.`
              : `Distribuídos entre ${resumo.meses.map(rotuloMes).join(', ')}.`}{' '}
            O que você categorizou virou regra — na próxima importação já vem pronto.
          </p>
          {guardadas > 0 && (
            <p className="pf-hint">
              Guardei também {guardadas} transferência(s) suas pra você mesmo. Elas não entram em
              receita nem em despesa — ficam esperando o extrato da outra ponta pra fechar em zero.
            </p>
          )}
          <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            {resumo.meses.map((m) => (
              <button key={m} className="pf-btn pf-btn-ghost" onClick={() => navigate(`/detalhar/${m}`)}>
                Ver {rotuloMes(m)}
              </button>
            ))}
            <button className="pf-btn pf-btn-ghost" onClick={() => { setEtapa('arquivo'); setAnalise(null); setItens([]); }}>
              Importar outro arquivo
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------

function EtapaArquivo({
  ctx,
  setCtx,
  ocupado,
  inputArquivo,
  onArquivo,
}: {
  ctx: ContextoImport;
  setCtx: (c: ContextoImport) => void;
  ocupado: boolean;
  inputArquivo: React.RefObject<HTMLInputElement>;
  onArquivo: (f: File) => void;
}) {
  return (
    <>
      <p className="pf-eyebrow" style={{ marginBottom: 'var(--space-4)' }}>
        Passo 1 · me conta o que é (tudo opcional)
      </p>
      <p className="pf-hint" style={{ marginTop: 0 }}>
        Nada aqui é obrigatório — mas cada resposta tira um palpite meu do caminho e deixa a leitura
        mais certeira. Você confere tudo antes de salvar.
      </p>

      <Campo rotulo="Que documento é esse?" opcional dica="Muda como eu leio o sinal dos valores: numa fatura, quase tudo é despesa.">
        <div className="pf-chips">
          {DOCUMENTOS.map((d) => (
            <button
              key={d.valor}
              type="button"
              className={`pf-chip ${ctx.tipoDocumento === d.valor ? 'on' : ''}`}
              aria-pressed={ctx.tipoDocumento === d.valor}
              onClick={() => setCtx({ ...ctx, tipoDocumento: ctx.tipoDocumento === d.valor ? undefined : d.valor })}
              title={d.dica}
            >
              {d.rotulo}
            </button>
          ))}
        </div>
      </Campo>

      <Campo
        rotulo="De qual instituição?"
        opcional
        dica="Não muda a leitura do arquivo — mas é o que me deixa dizer depois “o outro lado dessa transferência está no extrato do Bradesco”."
      >
        <CategoriaInput
          value={ctx.instituicao ?? ''}
          onChange={(v) => setCtx({ ...ctx, instituicao: canonizarInstituicao(v) || undefined })}
          opcoes={INSTITUICOES}
          placeholder="Nubank, Itaú, Mercado Pago…"
        />
      </Campo>

      <Campo rotulo="De que mês?" opcional dica="Se o arquivo trouxer lançamentos de outro mês, eu aviso — mas cada item vai pro mês da própria data.">
        <input
          className="pf-input"
          type="month"
          value={ctx.mesEsperado ?? ''}
          onChange={(e) => setCtx({ ...ctx, mesEsperado: e.target.value || undefined })}
        />
      </Campo>

      <Campo rotulo="Formato da data" opcional dica="Só preencha se as datas saírem trocadas. 03/04 pode ser 3 de abril ou 4 de março.">
        <div className="pf-chips">
          {([['dmy', 'DD/MM/AAAA'], ['mdy', 'MM/DD/AAAA'], ['ymd', 'AAAA-MM-DD']] as const).map(([v, r]) => (
            <button
              key={v}
              type="button"
              className={`pf-chip ${ctx.formatoData === v ? 'on' : ''}`}
              aria-pressed={ctx.formatoData === v}
              onClick={() => setCtx({ ...ctx, formatoData: ctx.formatoData === v ? undefined : v })}
            >
              {r}
            </button>
          ))}
        </div>
      </Campo>

      <p className="pf-eyebrow" style={{ margin: 'var(--space-8) 0 var(--space-3)' }}>Passo 2 · o arquivo</p>
      <input
        ref={inputArquivo}
        type="file"
        accept=".ofx,.OFX,.csv,.CSV,.txt,text/csv,text/plain"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArquivo(f);
        }}
      />
      <button className="pf-btn pf-btn-primary" disabled={ocupado} onClick={() => inputArquivo.current?.click()}>
        {ocupado ? 'Lendo…' : 'Escolher arquivo OFX ou CSV'}
      </button>
      <p className="pf-hint" style={{ marginTop: 'var(--space-3)' }}>
        O arquivo é lido <strong>no seu navegador</strong> — ele não sobe pra lugar nenhum. Só os
        lançamentos que você aprovar são salvos na sua conta.
      </p>
    </>
  );
}

function Diagnostico({ nome, analise }: { nome: string; analise: ResultadoAnalise }) {
  const d = analise.diagnostico;
  const linhas: [string, string][] = [
    ['Arquivo', `${nome} · ${d.formato.toUpperCase()} · ${d.codificacao}`],
    ['Lançamentos', `${d.linhasLidas} lidos${d.linhasIgnoradas ? ` · ${d.linhasIgnoradas} ignorados` : ''}`],
    ['Datas', d.formatoData],
  ];
  if (d.periodo) linhas.push(['Período', `${brDia(d.periodo.inicio)} a ${brDia(d.periodo.fim)}`]);
  if (d.instituicao) linhas.push(['Instituição', d.instituicao + (d.conta ? ` · conta ${d.conta}` : '')]);
  if (d.colunas) {
    linhas.push(['Colunas', Object.entries(d.colunas).map(([p, r]) => `${p} ← "${r}"`).join(' · ')]);
  }

  return (
    <section className="pf-hero-card" style={{ marginBottom: 'var(--space-4)' }}>
      <span className="pf-eyebrow">O que eu entendi do arquivo</span>
      <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 4 }}>
        {linhas.map(([r, v]) => (
          <div key={r} style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{r}</span>
            <span className="mono" style={{ fontSize: '0.8rem', textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Resumo({
  resumo,
  total,
  de,
}: {
  resumo: { ativa: number; passiva: number; aporte: number; saida: number; meses: string[] };
  total: number;
  de: number;
}) {
  const blocos: [string, number, string][] = [
    ['Receita', resumo.ativa, 'var(--paper)'],
    ['Renda passiva', resumo.passiva, 'var(--mint)'],
    ['Aporte', resumo.aporte, 'var(--ember-2)'],
    ['Despesa', resumo.saida, 'var(--muted)'],
  ];
  return (
    <section className="pf-hero-card" style={{ marginBottom: 'var(--space-4)' }}>
      <span className="pf-eyebrow">
        {total} de {de} marcados{resumo.meses.length ? ` · ${resumo.meses.map(rotuloMes).join(', ')}` : ''}
      </span>
      <div className="pf-import-resumo">
        {blocos.filter(([, v]) => v > 0).map(([r, v, cor]) => (
          <div key={r}>
            <div className="pf-hint" style={{ margin: 0 }}>{r}</div>
            <div className="mono" style={{ color: cor, fontWeight: 600 }}>{formatBRL(v)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const rotuloMes = (m: string) => formatMesAno(new Date(`${m}-01T00:00:00`));
const brDia = (iso: string) => iso.split('-').reverse().join('/');
