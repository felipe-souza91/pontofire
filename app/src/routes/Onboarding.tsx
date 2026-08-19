import { useMemo, useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { calcularPlanoFire, numeroFire, type PlanoFire } from '@pontofire/engine';
import { useAuth } from '../auth/useAuth';
import { salvarOnboarding } from '../data/users';
import { PORQUES } from '../data/humanizacao';
import { formatBRL, formatDuracao, formatMesAno } from '../utils/format';
import { MoedaInput } from '../components/MoedaInput';
import { Flame } from '../theme/Flame';
import { Icone } from '../theme/Icone';

const TSS = 0.04;
const RETORNOS = [4, 5, 6];
/** juro real histórico do Brasil (Selic − IPCA) ≈ 5% */
const RETORNO_RECOMENDADO = 5;

type Fase = 'consentimento' | 'perguntas' | 'aha';

/** As 10 perguntas em dois blocos — o nome do bloco aparece na barra. */
type Bloco = 'você' | 'números';

interface PassoConfig {
  bloco: Bloco;
  titulo: string;
  /** ReactNode e não string: a pergunta do custo precisa de destaque no meio da frase */
  sub: ReactNode;
  campo: ReactNode;
  /** false trava o "Continuar" */
  valido?: boolean;
  /** passo que pode ser deixado em branco (mostra "pular esta") */
  opcional?: boolean;
}

/**
 * Onboarding — fluxo contínuo de 10 perguntas.
 *
 * Ordem proposital: primeiro QUEM É (nome, nascimento, porquê, sonho, idade
 * alvo), depois OS NÚMEROS. Quem já contou o porquê chega nas perguntas de
 * dinheiro com contexto — e a data no fim tem nome e dono, não é só um número.
 */
export function Onboarding({ jaCompleto = false }: { jaCompleto?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Congela o valor da montagem. Sem isso, o `onboardingCompleto: true` que a
  // última pergunta grava derrubaria a tela da data no mesmo instante.
  const [entrouCompleto] = useState(jaCompleto);

  const [fase, setFase] = useState<Fase>('consentimento');
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // --- bloco "você"
  const [apelido, setApelido] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [porQues, setPorQues] = useState<string[]>([]);
  const [porQue, setPorQue] = useState('');
  const [nomeSonho, setNomeSonho] = useState('');
  const [idadeAlvo, setIdadeAlvo] = useState('');

  // --- bloco "números"
  const [custo, setCusto] = useState(0);
  const [aporte, setAporte] = useState(0);
  /**
   * Saída de emergência de quem não usa cartão: `custo = receita − aporte`.
   *
   * Fica escondida atrás de um link porque é o caminho pior — depende de a
   * pessoa não ter movido saldo no mês. Mas quando ela erra, erra pra CIMA (a
   * sobra em conta vira "gasto"), e meta grande demais é o lado seguro do erro.
   *
   * Não é campo novo: o aporte daqui é o mesmo da pergunta seguinte, então o
   * custo sai de UMA pergunta a mais, não de duas.
   */
  const [calcAberto, setCalcAberto] = useState(false);
  const [receita, setReceita] = useState(0);
  const [patrimonio, setPatrimonio] = useState(0);
  const [retornoPct, setRetornoPct] = useState(RETORNO_RECOMENDADO);
  const [meta, setMeta] = useState(0);
  const [metaEditada, setMetaEditada] = useState(false);
  const [inicioContribuicao, setInicioContribuicao] = useState('');
  const [salario, setSalario] = useState(0);
  const [sexoINSS, setSexoINSS] = useState<'F' | 'M' | undefined>(undefined);

  const custoCalculado = Math.max(0, receita - aporte);

  const metaSugerida = useMemo(() => Math.round(numeroFire(custo, TSS)), [custo]);
  const metaEfetiva = metaEditada && meta > 0 ? meta : metaSugerida;

  const plano: PlanoFire | null = useMemo(() => {
    if (custo <= 0) return null;
    return calcularPlanoFire({
      patrimonioInvestivel: patrimonio,
      aporteMensal: aporte,
      custoVidaMensal: custo,
      retornoRealAnual: retornoPct / 100,
      metaFire: metaEfetiva,
      idadeAtual: idadeDeISO(dataNascimento),
      hoje: new Date(),
    });
  }, [custo, aporte, patrimonio, retornoPct, metaEfetiva, dataNascimento]);

  const tratamento = apelido.trim().split(' ')[0] || 'você';

  const passos: PassoConfig[] = [
    {
      bloco: 'você',
      titulo: 'Como te chamo?',
      sub: 'Vou usar isso pra falar com você — nada formal.',
      campo: (
        <input
          className="pf-input"
          style={{ fontSize: '1.2rem' }}
          autoFocus
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
          placeholder="seu nome ou apelido"
        />
      ),
      opcional: true,
    },
    {
      bloco: 'você',
      titulo: 'Quando você nasceu?',
      sub: 'É o que transforma "faltam 23 anos" em "aos 59" — e me deixa comparar com o INSS depois.',
      campo: (
        <input
          className="pf-input"
          type="date"
          style={{ maxWidth: '14rem' }}
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
        />
      ),
      opcional: true,
    },
    {
      bloco: 'você',
      titulo: 'O que a liberdade significa pra você?',
      sub: 'Escolha o que ressoar. É disso que eu vou te lembrar nos meses em que a conta não anda.',
      campo: (
        <div>
          <div className="pf-chips">
            {PORQUES.map((p) => (
              <button
                key={p}
                type="button"
                className={`pf-chip ${porQues.includes(p) ? 'on' : ''}`}
                onClick={() => setPorQues((v) => (v.includes(p) ? v.filter((x) => x !== p) : [...v, p]))}
              >
                {p}
              </button>
            ))}
          </div>
          <textarea
            className="pf-input"
            style={{ marginTop: 'var(--space-4)' }}
            rows={2}
            value={porQue}
            onChange={(e) => setPorQue(e.target.value)}
            placeholder="quer contar com suas palavras? (opcional)"
          />
        </div>
      ),
      opcional: true,
    },
    {
      bloco: 'você',
      titulo: 'Dá um nome pra esse sonho.',
      sub: 'Vai aparecer no seu Início. E me diz até quando você quer poder decidir parar.',
      campo: (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <label className="pf-field" style={{ marginBottom: 0 }}>
            <span className="pf-label">O nome</span>
            <input
              className="pf-input"
              style={{ fontSize: '1.15rem' }}
              autoFocus
              value={nomeSonho}
              onChange={(e) => setNomeSonho(e.target.value)}
              placeholder='ex: "minha ilha", "liberdade aos 50"'
            />
          </label>
          <label className="pf-field" style={{ marginBottom: 0 }}>
            <span className="pf-label">Poder parar aos…</span>
            <div style={{ position: 'relative', maxWidth: '12rem' }}>
              <input
                className="pf-input pf-num"
                style={{ fontSize: '1.3rem' }}
                inputMode="numeric"
                value={idadeAlvo}
                onChange={(e) => setIdadeAlvo(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="55"
              />
              <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
                anos
              </span>
            </div>
          </label>
        </div>
      ),
      opcional: true,
    },
    {
      bloco: 'números',
      titulo: `Agora os números, ${tratamento}. Quanto você gasta por mês?`,
      /**
       * A receita do próprio dono do app, e ela vence qualquer instrução que eu
       * escreveria: fatura + o que não passa nela.
       *
       * Os dois números são de BUSCA (estão no app do banco), não de memória.
       * Toda instrução que pede pra somar gastos de cabeça produz o mesmo erro,
       * sempre pro mesmo lado: a lista pega o que se repete e esquece mercado,
       * padaria e farmácia — que é metade do gasto. A fatura já somou isso.
       */
      sub: (
        <>
          O jeito rápido: <b>sua última fatura de cartão + o que não passa nela</b> (boleto, débito
          automático, PIX, desconto em folha). A fatura já traz mercado, padaria e farmácia — que é
          justamente o que escapa quando a gente tenta listar de cabeça.{' '}
          <b>Não precisa acertar: na dúvida, chuta pra cima.</b> Do 3º mês lançado em diante o app
          passa a usar o seu gasto real.
        </>
      ),
      campo: (
        <div>
          <MoedaInput value={custo} onChange={setCusto} autoFocus />

          <details className="pf-onb-detalhe">
            <summary>o que costuma escapar</summary>
            <ul>
              <li>
                <b>Gastos anuais</b> — IPVA, seguro, IPTU, material escolar. Some o ano e divida por
                12: a fatura de um mês só não pega.
              </li>
              <li>
                <b>O que sai de outras contas</b> — débito automático, PIX recorrente, a conta que
                está no nome de outra pessoa mas sai do seu bolso.
              </li>
              <li>
                <b>É o gasto de hoje.</b> O que muda quando você parar de trabalhar (aluguel acaba,
                plano de saúde encarece) o app trata depois, com dado — não precisa adivinhar agora.
              </li>
            </ul>
          </details>

          {!calcAberto ? (
            <button className="pf-btn-link" onClick={() => setCalcAberto(true)}>
              não sei — calcular pelo que entra →
            </button>
          ) : (
            <div className="pf-onb-calc">
              <label>
                Quanto entra por mês, líquido?
                <MoedaInput value={receita} onChange={setReceita} autoFocus />
              </label>
              <label>
                Quanto disso você investe?
                <MoedaInput value={aporte} onChange={setAporte} />
              </label>

              {receita > 0 && (
                custoCalculado > 0 ? (
                  <>
                    <p className="pf-onb-calc-saida">
                      Então você gasta cerca de <b>{formatBRL(custoCalculado)}</b> por mês.
                    </p>
                    <button
                      className="pf-btn pf-btn-primary"
                      onClick={() => {
                        setCusto(custoCalculado);
                        setCalcAberto(false);
                      }}
                    >
                      Usar esse número
                    </button>
                  </>
                ) : (
                  <p className="pf-onb-calc-saida">
                    Assim o gasto daria zero ou menos. Confira os dois números — o que entra tem que
                    ser maior que o que você investe.
                  </p>
                )
              )}
              <p className="pf-hint" style={{ marginBottom: 0 }}>
                Guardo o que você investe pra próxima pergunta, não precisa digitar de novo.
              </p>
            </div>
          )}
        </div>
      ),
      valido: custo > 0,
    },
    {
      bloco: 'números',
      titulo: 'Quanto consegue investir por mês?',
      sub: 'Seu aporte médio. Pode ajustar quando quiser — é a alavanca que mais mexe na sua data.',
      campo: <MoedaInput value={aporte} onChange={setAporte} autoFocus />,
      valido: aporte >= 0,
    },
    {
      bloco: 'números',
      titulo: 'Quanto você já tem investido?',
      sub: 'Só o que rende e é sacável. Casa e carro entram depois, na aba Bens.',
      campo: <MoedaInput value={patrimonio} onChange={setPatrimonio} autoFocus />,
      valido: patrimonio >= 0,
    },
    {
      bloco: 'números',
      titulo: 'Que retorno real ao ano você espera?',
      sub: 'Real = já descontada a inflação. A Selic de hoje impressiona, mas ela sobe e desce; o que importa aqui é a MÉDIA das próximas décadas. Descontado o IPCA, o juro real brasileiro fica perto de 5% ao ano no longo prazo.',
      campo: (
        <div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            {RETORNOS.map((r) => (
              <button
                key={r}
                type="button"
                className={`pf-btn ${retornoPct === r ? 'pf-btn-primary' : 'pf-btn-ghost'}`}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                onClick={() => setRetornoPct(r)}
              >
                {r}%
                {r === RETORNO_RECOMENDADO && <Icone nome="estrela" size={13} />}
              </button>
            ))}
          </div>
          <input
            className="pf-input pf-num"
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={retornoPct}
            onChange={(e) => setRetornoPct(Number(e.target.value))}
          />
          <p className="pf-hint" style={{ marginTop: 'var(--space-2)' }}>
            <Icone nome="estrela" size={13} /> recomendado — juro real histórico do Brasil. No Início você vê esse número ao lado da
            média real dos últimos 10 anos, pra conferir se a sua premissa se sustenta.
          </p>
        </div>
      ),
      valido: retornoPct > 0,
    },
    {
      bloco: 'números',
      titulo: 'Sua meta de patrimônio',
      sub: `Sugestão: 25× seu custo anual = ${formatBRL(metaSugerida)}. É a regra dos 4% — pode ajustar.`,
      campo: (
        <MoedaInput
          value={metaEditada ? meta : metaSugerida}
          onChange={(v) => {
            setMeta(v);
            setMetaEditada(true);
          }}
          autoFocus
        />
      ),
      valido: metaEfetiva > 0,
    },
    {
      bloco: 'números',
      titulo: 'Por último: o INSS',
      sub: 'Só pra eu te mostrar, lá no Início, o que o INSS te daria — e em quantos anos você chega antes. Pode pular.',
      campo: (
        <div>
          <Campo rotulo="Início das contribuições ao INSS">
            <input className="pf-input" type="month" value={inicioContribuicao} onChange={(e) => setInicioContribuicao(e.target.value)} />
          </Campo>
          <Campo rotulo="Salário bruto atual">
            <MoedaInput value={salario} onChange={setSalario} />
          </Campo>
          <Campo rotulo="Regra do INSS">
            <div className="pf-chips">
              {([['F', 'Feminino'], ['M', 'Masculino']] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={`pf-chip ${sexoINSS === v ? 'on' : ''}`}
                  onClick={() => setSexoINSS(sexoINSS === v ? undefined : v)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="pf-hint">A lei exige idade e tempo diferentes: 62/15 anos (F) e 65/20 anos (M).</span>
          </Campo>
        </div>
      ),
      opcional: true,
    },
  ];

  // ---------------------------------------------------------------- telas
  if (entrouCompleto) return <Navigate to="/" replace />;

  if (fase === 'consentimento') {
    return (
      <Tela>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <Flame size={48} flicker />
          <h1 style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>Vamos achar sua data</h1>
        </div>
        <p style={{ color: 'var(--muted)' }}>
          São <strong>10 perguntas</strong>, uns dois minutos. Primeiro eu te conheço um pouco,
          depois a gente vê os números — e no fim aparece o mês exato em que você pode ficar livre.
          Sem julgamento, só matemática honesta.
        </p>
        <p className="pf-hint">
          Ao continuar, você concorda que o Ponto FIRE guarde os dados que você informar para
          calcular e acompanhar sua meta (LGPD). Você pode exportar ou apagar tudo quando quiser.
        </p>
        <div style={{ marginTop: 'var(--space-6)' }}>
          <button className="pf-btn pf-btn-primary" onClick={() => setFase('perguntas')}>Começar</button>
        </div>
      </Tela>
    );
  }

  if (fase === 'aha' && plano) {
    return <Aha plano={plano} nomeSonho={nomeSonho.trim()} onSeguir={() => navigate('/', { replace: true })} />;
  }

  const atual = passos[passo]!;
  const ultimo = passo === passos.length - 1;
  const podeSeguir = atual.valido ?? true;

  return (
    <Tela>
      <div className="pf-onb-topo">
        <span className="pf-eyebrow">
          {atual.bloco === 'você' ? 'sobre você' : 'seus números'}
        </span>
        <span className="mono pf-onb-contador">{passo + 1}/{passos.length}</span>
      </div>
      <div className="pf-steps">
        {passos.map((p, i) => (
          <div
            key={i}
            className={`pf-step ${i <= passo ? 'on' : ''} ${p.bloco === 'números' ? 'num' : ''}`}
          />
        ))}
      </div>

      <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>{atual.titulo}</h2>
      {/* div e não p: o sub agora pode trazer marcação */}
      <div className="pf-hint pf-onb-sub" style={{ marginTop: 0 }}>{atual.sub}</div>
      <div style={{ margin: 'var(--space-4) 0' }}>{atual.campo}</div>

      {erro && <p className="pf-error">{erro}</p>}

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
        {passo > 0 && (
          <button
            className="pf-btn pf-btn-ghost"
            style={{ flex: '0 0 auto', width: 'auto', padding: '0.85rem 1.5rem' }}
            onClick={() => setPasso(passo - 1)}
            disabled={salvando}
          >
            Voltar
          </button>
        )}
        <button
          className="pf-btn pf-btn-primary"
          disabled={!podeSeguir || salvando}
          onClick={() => (ultimo ? void concluir() : setPasso(passo + 1))}
        >
          {ultimo ? (salvando ? 'Calculando…' : 'Ver minha data') : 'Continuar'}
        </button>
      </div>

      {atual.opcional && !ultimo && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
          <button className="pf-btn-link" onClick={() => setPasso(passo + 1)} disabled={salvando}>
            pular esta
          </button>
        </div>
      )}
    </Tela>
  );

  async function concluir() {
    if (!user) return;
    setErro(null);
    setSalvando(true);
    try {
      await salvarOnboarding(user.uid, {
        custoVidaMensal: custo,
        aporteMensal: aporte,
        patrimonioInicial: patrimonio,
        metaFire: metaEfetiva,
        // quem editou a meta escolheu aquele número: ela não passa a
        // acompanhar o custo sem ele mandar
        metaTravada: metaEditada && meta > 0,
        retornoRealEsperado: retornoPct / 100,
        taxaSaqueSegura: TSS,
        // A linha de partida guarda as PREMISSAS junto com a data. Sem elas,
        // "sua data melhorou 4 anos" não distingue mérito de mudança de alvo.
        linhaDePartida: {
          em: new Date().toISOString().slice(0, 10),
          custoVidaMensal: custo,
          aporteMensal: aporte,
          patrimonioInicial: patrimonio,
          retornoRealEsperado: retornoPct / 100,
          metaFire: metaEfetiva,
          taxaSaqueSegura: TSS,
          mesesAteFire: plano?.meses ?? null,
          origem: 'onboarding',
        },
        apelido: apelido.trim() || undefined,
        dataNascimento: dataNascimento || undefined,
        porQues: porQues.length ? porQues : undefined,
        porQue: porQue.trim() || undefined,
        nomeSonho: nomeSonho.trim() || undefined,
        idadeAlvo: idadeAlvo ? parseInt(idadeAlvo, 10) : undefined,
        inicioContribuicao: inicioContribuicao || undefined,
        salario: salario || undefined,
        sexoINSS,
      });
      setFase('aha');
    } catch {
      setErro('Não consegui salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }
}

// ---------------------------------------------------------------------------

function idadeDeISO(iso: string): number | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade--;
  return idade;
}

function Tela({ children }: { children: ReactNode }) {
  return (
    <main className="pf-container" style={{ minHeight: '100dvh', display: 'grid', alignContent: 'center' }}>
      <div className="pf-card">{children}</div>
    </main>
  );
}

/** A recompensa: a data. Daqui o usuário segue direto pra apresentação. */
function Aha({ plano, nomeSonho, onSeguir }: { plano: PlanoFire; nomeSonho: string; onSeguir: () => void }) {
  return (
    <Tela>
      <div style={{ textAlign: 'center' }}>
        <Flame size={44} flicker />
        {plano.status === 'ok' && plano.dataLiberdade && plano.meses !== null ? (
          <>
            <p style={{ color: 'var(--muted)', marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
              Sua liberdade chega em
            </p>
            <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3.2rem)', color: 'var(--mint)', margin: 0 }}>
              {formatMesAno(plano.dataLiberdade)}
            </h1>
            <p className="mono" style={{ color: 'var(--muted)', marginTop: 'var(--space-2)' }}>
              daqui a {formatDuracao(plano.meses)}
              {plano.idadeNaLiberdade !== null && ` · aos ${Math.round(plano.idadeNaLiberdade)} anos`}
            </p>
            {nomeSonho && (
              <p style={{ color: 'var(--muted)', marginTop: 'var(--space-3)', marginBottom: 0 }}>
                rumo a <span style={{ color: 'var(--mint)', fontStyle: 'italic' }}>“{nomeSonho}”</span>
              </p>
            )}
          </>
        ) : plano.status === 'atingido' ? (
          <>
            <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', color: 'var(--mint)', marginTop: 'var(--space-4)' }}>
              Você já chegou lá.
            </h1>
            <p style={{ color: 'var(--muted)' }}>Seu patrimônio já cobre sua meta.</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 'clamp(1.6rem, 6vw, 2.4rem)', marginTop: 'var(--space-4)' }}>
              Ainda não dá pra cravar a data.
            </h1>
            <p style={{ color: 'var(--muted)' }}>
              Com esse aporte e retorno, a meta não fecha. Aumentar o aporte muda tudo — dá pra
              simular no Início, sem pressão.
            </p>
          </>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', margin: 'var(--space-6) 0', paddingTop: 'var(--space-4)' }}>
        <Linha rotulo="Número FIRE (meta)" valor={formatBRL(plano.numeroFire)} />
        <Linha rotulo="Progresso" valor={`${(plano.progresso * 100).toFixed(1).replace('.', ',')}%`} />
        <Linha rotulo="Renda ao atingir" valor={`${formatBRL(plano.saqueMensalSustentavel)} /mês`} />
      </div>

      <button className="pf-btn pf-btn-primary" onClick={onSeguir}>
        Me mostra o que dá pra fazer aqui →
      </button>
    </Tela>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0' }}>
      <span style={{ color: 'var(--muted)' }}>{rotulo}</span>
      <span className="mono">{valor}</span>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="pf-field">
      <span className="pf-label">{rotulo}</span>
      {children}
    </label>
  );
}
