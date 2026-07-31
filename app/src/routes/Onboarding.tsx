import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { calcularPlanoFire, numeroFire, type PlanoFire } from '@pontofire/engine';
import { useAuth } from '../auth/useAuth';
import { concluirSemN2, salvarOnboardingN1, salvarOnboardingN2 } from '../data/users';
import type { OnboardingN2 } from '../data/types';
import { formatBRL, formatDuracao, formatMesAno } from '../utils/format';
import { Flame } from '../theme/Flame';

const TSS = 0.04;
const RETORNOS = [4, 5, 6];

type Fase = 'consentimento' | 'perguntas' | 'aha' | 'n2';

export function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fase, setFase] = useState<Fase>('consentimento');
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // N1
  const [custo, setCusto] = useState(0);
  const [aporte, setAporte] = useState(0);
  const [patrimonio, setPatrimonio] = useState(0);
  const [retornoPct, setRetornoPct] = useState(5);
  const [meta, setMeta] = useState(0);
  const [metaEditada, setMetaEditada] = useState(false);

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
      hoje: new Date(),
    });
  }, [custo, aporte, patrimonio, retornoPct, metaEfetiva]);

  async function concluirN1() {
    if (!user) return;
    setErro(null);
    setSalvando(true);
    try {
      await salvarOnboardingN1(user.uid, {
        custoVidaMensal: custo,
        aporteMensal: aporte,
        patrimonioInicial: patrimonio,
        metaFire: metaEfetiva,
        retornoRealEsperado: retornoPct / 100,
        taxaSaqueSegura: TSS,
      });
      setFase('aha');
    } catch {
      setErro('Não consegui salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  // ---- consentimento ----
  if (fase === 'consentimento') {
    return (
      <Tela>
        <Cabecalho titulo="Vamos achar sua data" />
        <p style={{ color: 'var(--muted)' }}>
          Em menos de um minuto você vê o mês exato em que pode ficar livre. Cinco perguntas
          rápidas — sem julgamento, só matemática honesta.
        </p>
        <p className="pf-hint">
          Ao continuar, você concorda que o Ponto FIRE guarde os dados que você informar para
          calcular e acompanhar sua meta (LGPD). Você pode exportar ou apagar tudo quando quiser.
        </p>
        <div style={{ marginTop: 'var(--space-6)' }}>
          <button className="pf-btn pf-btn-primary" onClick={() => setFase('perguntas')}>
            Começar
          </button>
        </div>
      </Tela>
    );
  }

  // ---- aha ----
  if (fase === 'aha' && plano) {
    return <Aha plano={plano} onPersonalizar={() => setFase('n2')} onDepois={irProInicio} />;
  }

  // ---- N2 ----
  if (fase === 'n2') {
    return <FormularioN2 salvando={salvando} erro={erro} onConcluir={salvarN2} onPular={irProInicio} />;
  }

  // ---- perguntas (N1) ----
  const passos: PassoConfig[] = [
    {
      titulo: 'Quanto você gasta por mês, hoje?',
      hint: 'Seu custo de vida médio. É o que define sua meta.',
      campo: <Moeda value={custo} onChange={setCusto} autoFocus />,
      valido: custo > 0,
    },
    {
      titulo: 'Quanto consegue investir por mês?',
      hint: 'Seu aporte médio. Pode ajustar depois.',
      campo: <Moeda value={aporte} onChange={setAporte} autoFocus />,
      valido: aporte >= 0,
    },
    {
      titulo: 'Quanto você já tem investido?',
      hint: 'Só o que rende e é sacável (investimentos). Casa e carro entram depois.',
      campo: <Moeda value={patrimonio} onChange={setPatrimonio} autoFocus />,
      valido: patrimonio >= 0,
    },
    {
      titulo: 'Que retorno real ao ano você espera?',
      hint: 'Real = já descontada a inflação. Sê conservador: 4–6% é razoável no longo prazo.',
      campo: (
        <div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            {RETORNOS.map((r) => (
              <button
                key={r}
                type="button"
                className={`pf-btn ${retornoPct === r ? 'pf-btn-primary' : 'pf-btn-ghost'}`}
                onClick={() => setRetornoPct(r)}
              >
                {r}%
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
        </div>
      ),
      valido: retornoPct > 0,
    },
    {
      titulo: 'Sua meta de patrimônio',
      hint: `Sugestão: 25× seu custo anual = ${formatBRL(metaSugerida)}. Pode ajustar.`,
      campo: (
        <Moeda
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
  ];

  const atual = passos[passo]!;
  const ultimo = passo === passos.length - 1;

  return (
    <Tela>
      <div className="pf-steps">
        {passos.map((_, i) => (
          <div key={i} className={`pf-step ${i <= passo ? 'on' : ''}`} />
        ))}
      </div>

      <h2 style={{ fontSize: '1.6rem' }}>{atual.titulo}</h2>
      <div style={{ margin: 'var(--space-4) 0' }}>{atual.campo}</div>
      <p className="pf-hint">{atual.hint}</p>

      {erro && <p className="pf-error">{erro}</p>}

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
        {passo > 0 && (
          <button
            className="pf-btn pf-btn-ghost"
            style={{ flex: '0 0 auto', width: 'auto', padding: '0.85rem 1.5rem' }}
            onClick={() => setPasso(passo - 1)}
          >
            Voltar
          </button>
        )}
        <button
          className="pf-btn pf-btn-primary"
          disabled={!atual.valido || salvando}
          onClick={() => (ultimo ? void concluirN1() : setPasso(passo + 1))}
        >
          {ultimo ? (salvando ? 'Calculando…' : 'Ver minha data') : 'Continuar'}
        </button>
      </div>
    </Tela>
  );

  async function salvarN2(n2: OnboardingN2) {
    if (!user) return;
    setErro(null);
    setSalvando(true);
    try {
      await salvarOnboardingN2(user.uid, n2);
      navigate('/', { replace: true });
    } catch {
      setErro('Não consegui salvar. Tente de novo.');
      setSalvando(false);
    }
  }

  async function irProInicio() {
    if (!user) return;
    try {
      await concluirSemN2(user.uid);
    } finally {
      navigate('/', { replace: true });
    }
  }
}

// ---------------------------------------------------------------------------

interface PassoConfig {
  titulo: string;
  hint: string;
  campo: ReactNode;
  valido: boolean;
}

function Tela({ children }: { children: ReactNode }) {
  return (
    <main className="pf-container" style={{ minHeight: '100dvh', display: 'grid', alignContent: 'center' }}>
      <div className="pf-card">{children}</div>
    </main>
  );
}

function Cabecalho({ titulo }: { titulo: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
      <Flame size={48} flicker />
      <h1 style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>{titulo}</h1>
    </div>
  );
}

function Moeda({
  value,
  onChange,
  autoFocus,
}: {
  value: number;
  onChange: (v: number) => void;
  autoFocus?: boolean;
}) {
  const display = value ? new Intl.NumberFormat('pt-BR').format(value) : '';
  return (
    <div style={{ position: 'relative' }}>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: '0.9rem',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        R$
      </span>
      <input
        className="pf-input pf-num"
        style={{ paddingLeft: '2.6rem', fontSize: '1.4rem' }}
        inputMode="numeric"
        autoFocus={autoFocus}
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          onChange(digits ? parseInt(digits, 10) : 0);
        }}
      />
    </div>
  );
}

function Aha({
  plano,
  onPersonalizar,
  onDepois,
}: {
  plano: PlanoFire;
  onPersonalizar: () => void;
  onDepois: () => void;
}) {
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
            </p>
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
              Com esse aporte e retorno, a meta não é alcançada. Aumentar o aporte muda tudo — dá pra
              simular depois, sem pressão.
            </p>
          </>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', margin: 'var(--space-6) 0', paddingTop: 'var(--space-4)' }}>
        <Linha rotulo="Número FIRE (meta)" valor={formatBRL(plano.numeroFire)} />
        <Linha rotulo="Progresso" valor={`${(plano.progresso * 100).toFixed(1).replace('.', ',')}%`} />
        <Linha rotulo="Renda ao atingir" valor={`${formatBRL(plano.saqueMensalSustentavel)} /mês`} />
      </div>

      <button className="pf-btn pf-btn-primary" onClick={onPersonalizar}>
        Personalizar meu perfil
      </button>
      <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
        <button className="pf-btn-link" onClick={onDepois}>
          Ir pro início
        </button>
      </div>
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

function FormularioN2({
  salvando,
  erro,
  onConcluir,
  onPular,
}: {
  salvando: boolean;
  erro: string | null;
  onConcluir: (n2: OnboardingN2) => void;
  onPular: () => void;
}) {
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [inicioContribuicao, setInicioContribuicao] = useState('');
  const [salario, setSalario] = useState('');
  const [porQue, setPorQue] = useState('');

  return (
    <Tela>
      <h2 style={{ fontSize: '1.5rem' }}>Sobre você</h2>
      <p className="pf-hint" style={{ marginTop: 0 }}>
        Tudo opcional — ajuda o assistente a falar com você e habilita o módulo INSS. Pode pular.
      </p>

      <Campo rotulo="Nome">
        <input className="pf-input" value={nome} onChange={(e) => setNome(e.target.value)} />
      </Campo>
      <Campo rotulo="Como quer ser chamado(a)?">
        <input className="pf-input" value={apelido} onChange={(e) => setApelido(e.target.value)} />
      </Campo>
      <Campo rotulo="Data de nascimento">
        <input
          className="pf-input"
          type="date"
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
        />
      </Campo>
      <Campo rotulo="Início das contribuições ao INSS">
        <input
          className="pf-input"
          type="month"
          value={inicioContribuicao}
          onChange={(e) => setInicioContribuicao(e.target.value)}
        />
      </Campo>
      <Campo rotulo="Salário bruto atual (INSS)">
        <input
          className="pf-input pf-num"
          inputMode="numeric"
          value={salario}
          onChange={(e) => setSalario(e.target.value.replace(/\D/g, ''))}
        />
      </Campo>
      <Campo rotulo="Por que você quer essa liberdade?">
        <textarea
          className="pf-input"
          rows={2}
          value={porQue}
          onChange={(e) => setPorQue(e.target.value)}
        />
      </Campo>

      {erro && <p className="pf-error">{erro}</p>}

      <button
        className="pf-btn pf-btn-primary"
        disabled={salvando}
        onClick={() =>
          onConcluir({
            nome: nome.trim() || undefined,
            apelido: apelido.trim() || undefined,
            dataNascimento: dataNascimento || undefined,
            inicioContribuicao: inicioContribuicao || undefined,
            salario: salario ? parseInt(salario, 10) : undefined,
            porQue: porQue.trim() || undefined,
          })
        }
      >
        {salvando ? 'Salvando…' : 'Concluir'}
      </button>
      <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
        <button className="pf-btn-link" onClick={onPular} disabled={salvando}>
          Pular por agora
        </button>
      </div>
    </Tela>
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
