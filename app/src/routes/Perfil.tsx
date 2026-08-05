import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useUserDoc } from '../hooks/useUserDoc';
import { atualizarPerfil } from '../data/users';
import { PORQUES } from '../data/humanizacao';
import { MoedaInput } from '../components/MoedaInput';
import { Campo } from '../components/Campo';
import { ZonaDePerigo } from '../components/ZonaDePerigo';
import { Flame } from '../theme/Flame';

export function Perfil() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { doc } = useUserDoc(user?.uid ?? null);

  const [pronto, setPronto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // você
  const [apelido, setApelido] = useState('');
  const [porQues, setPorQues] = useState<string[]>([]);
  const [porQue, setPorQue] = useState('');
  const [nomeSonho, setNomeSonho] = useState('');
  const [idadeAlvo, setIdadeAlvo] = useState('');
  // números
  const [custo, setCusto] = useState(0);
  const [aporte, setAporte] = useState(0);
  const [patrimonio, setPatrimonio] = useState(0);
  const [meta, setMeta] = useState(0);
  const [retornoPct, setRetornoPct] = useState(5);
  // INSS
  const [dataNascimento, setDataNascimento] = useState('');
  const [inicioContribuicao, setInicioContribuicao] = useState('');
  const [salario, setSalario] = useState(0);
  const [sexoINSS, setSexoINSS] = useState<'F' | 'M' | undefined>(undefined);

  useEffect(() => {
    if (!doc || pronto) return;
    setApelido(doc.apelido ?? '');
    setPorQues(doc.porQues ?? []);
    setPorQue(doc.porQue ?? '');
    setNomeSonho(doc.nomeSonho ?? '');
    setIdadeAlvo(doc.idadeAlvo ? String(doc.idadeAlvo) : '');
    setCusto(doc.custoVidaMensal ?? 0);
    setAporte(doc.aporteMensal ?? 0);
    setPatrimonio(doc.patrimonioInicial ?? 0);
    setMeta(doc.metaFire ?? 0);
    setRetornoPct(Math.round((doc.retornoRealEsperado ?? 0.05) * 1000) / 10);
    setDataNascimento(doc.dataNascimento ?? '');
    setInicioContribuicao(doc.inicioContribuicao ?? '');
    setSalario(doc.salario ?? 0);
    setSexoINSS(doc.sexoINSS);
    setPronto(true);
  }, [doc, pronto]);

  function toggle(p: string) {
    setPorQues((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function salvar() {
    if (!user) return;
    setSalvando(true);
    try {
      await atualizarPerfil(user.uid, {
        apelido: apelido.trim() || undefined,
        porQues: porQues.length ? porQues : undefined,
        porQue: porQue.trim() || undefined,
        nomeSonho: nomeSonho.trim() || undefined,
        idadeAlvo: idadeAlvo ? parseInt(idadeAlvo, 10) : undefined,
        custoVidaMensal: custo,
        aporteMensal: aporte,
        patrimonioInicial: patrimonio,
        metaFire: meta,
        retornoRealEsperado: retornoPct / 100,
        dataNascimento: dataNascimento || undefined,
        inicioContribuicao: inicioContribuicao || undefined,
        salario: salario || undefined,
        sexoINSS,
      });
      navigate('/');
    } finally {
      setSalvando(false);
    }
  }

  if (!pronto) {
    return (
      <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <Flame size={56} className="flame-loading" title="Carregando" />
      </main>
    );
  }

  return (
    <main className="pf-container" style={{ maxWidth: '34rem', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
        <button className="pf-btn-link" onClick={() => navigate('/')} style={{ padding: 0 }}>← Voltar</button>
        <strong className="mono" style={{ flex: 1, textAlign: 'center' }}>Meu perfil</strong>
        <span style={{ width: '3rem' }} />
      </header>

      {/* Você */}
      <Secao titulo="Você">
        <Campo rotulo="Como te chamo?">
          <input className="pf-input" value={apelido} onChange={(e) => setApelido(e.target.value)} />
        </Campo>
        <Campo rotulo="Nome do seu sonho">
          <input className="pf-input" value={nomeSonho} onChange={(e) => setNomeSonho(e.target.value)} placeholder='ex: "minha ilha"' />
        </Campo>
        <Campo rotulo="Idade em que quer poder parar">
          <input
            className="pf-input pf-num"
            inputMode="numeric"
            value={idadeAlvo}
            onChange={(e) => setIdadeAlvo(e.target.value.replace(/\D/g, '').slice(0, 3))}
            style={{ maxWidth: '8rem' }}
          />
        </Campo>
        <Campo rotulo="O que a liberdade significa pra você?">
          <div className="pf-chips">
            {PORQUES.map((p) => (
              <button key={p} type="button" className={`pf-chip ${porQues.includes(p) ? 'on' : ''}`} onClick={() => toggle(p)}>
                {p}
              </button>
            ))}
          </div>
          <textarea className="pf-input" style={{ marginTop: 'var(--space-3)' }} rows={2} value={porQue} onChange={(e) => setPorQue(e.target.value)} placeholder="conta mais (opcional)" />
        </Campo>
      </Secao>

      {/* Números do motor */}
      <Secao titulo="Seus números">
        <Campo rotulo="Custo de vida mensal">
          <MoedaInput value={custo} onChange={setCusto} />
        </Campo>
        <Campo rotulo="Aporte mensal">
          <MoedaInput value={aporte} onChange={setAporte} />
        </Campo>
        <Campo rotulo="Patrimônio investido hoje">
          <MoedaInput value={patrimonio} onChange={setPatrimonio} />
        </Campo>
        <Campo rotulo="Meta (número FIRE)">
          <MoedaInput value={meta} onChange={setMeta} />
        </Campo>
        <Campo rotulo="Retorno real esperado (% a.a.)">
          <input
            className="pf-input pf-num"
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={retornoPct}
            onChange={(e) => setRetornoPct(Number(e.target.value))}
            style={{ maxWidth: '8rem' }}
          />
        </Campo>
      </Secao>

      {/* INSS */}
      <Secao titulo="INSS (opcional)">
        <p className="pf-hint" style={{ marginTop: 0 }}>
          Serve pra comparar sua liberdade com a aposentadoria do INSS.
        </p>
        <Campo rotulo="Data de nascimento" dica="Define sua idade e quando você atinge a idade mínima do INSS.">
          <input className="pf-input" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
        </Campo>
        <Campo rotulo="Início das contribuições" dica="Mês/ano da sua 1ª contribuição. Define o tempo de contribuição e se você cai nas regras de transição (antes de nov/2019).">
          <input className="pf-input" type="month" value={inicioContribuicao} onChange={(e) => setInicioContribuicao(e.target.value)} />
        </Campo>
        <Campo rotulo="Salário bruto atual" dica="Usado como estimativa da média das contribuições. Aceita centavos.">
          <MoedaInput value={salario} onChange={setSalario} />
        </Campo>
        <Campo rotulo="Regra do INSS" dica="A lei do INSS exige idade e tempo de contribuição diferentes: 62 anos/15 anos (feminino) e 65 anos/20 anos (masculino).">
          <div className="pf-chips">
            {([['F', 'Feminino'], ['M', 'Masculino']] as const).map(([v, label]) => (
              <button key={v} type="button" className={`pf-chip ${sexoINSS === v ? 'on' : ''}`} onClick={() => setSexoINSS(sexoINSS === v ? undefined : v)}>
                {label}
              </button>
            ))}
          </div>
        </Campo>
      </Secao>

      <button className="pf-btn pf-btn-primary" disabled={salvando} onClick={() => void salvar()}>
        {salvando ? 'Salvando…' : 'Salvar'}
      </button>

      {user && <ZonaDePerigo user={user} />}
    </main>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-8)' }}>
      <p className="pf-eyebrow" style={{ marginBottom: 'var(--space-4)' }}>{titulo}</p>
      {children}
    </section>
  );
}

