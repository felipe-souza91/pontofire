import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  calcularPlanoFire,
  metaVigente,
  rendimentoMes,
  residualDoMes,
  taxaInvestimento,
  taxaPoupanca,
} from '@pontofire/engine';
import { useAuth } from '../auth/useAuth';
import { useSnapshots } from '../hooks/useSnapshots';
import { useUserDoc } from '../hooks/useUserDoc';
import { salvarSnapshot } from '../data/snapshots';
import { MoedaInput } from '../components/MoedaInput';
import { Campo } from '../components/Campo';
import { formatBRL, formatBRLcompact, formatMesAno, formatPct } from '../utils/format';

function mesCorrente(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type Campo = 'patrimonio' | 'receita' | 'despesa' | 'aporte';
const CAMPOS: Campo[] = ['patrimonio', 'receita', 'despesa', 'aporte'];
const ROTULO_CAMPO: Record<Campo, string> = {
  patrimonio: 'patrimônio',
  receita: 'receita',
  despesa: 'despesa',
  aporte: 'aporte',
};
const NENHUM_TOCADO = { patrimonio: false, receita: false, despesa: false, aporte: false };
const TODOS_TOCADOS = { patrimonio: true, receita: true, despesa: true, aporte: true };

export function Lancar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lista } = useSnapshots(user?.uid ?? null);
  const { doc } = useUserDoc(user?.uid ?? null);

  const [mes, setMes] = useState(mesCorrente());
  const [patrimonio, setPatrimonio] = useState(0);
  const [receita, setReceita] = useState(0);
  const [despesa, setDespesa] = useState(0);
  const [aporte, setAporte] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [atipico, setAtipico] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * Quais campos o usuário já respondeu.
   *
   * Os quatro são obrigatórios MESMO QUE ZERO, e zero é indistinguível de
   * "campo em branco" olhando só o valor. Sem isto dava pra salvar um mês de
   * zeros default por esquecimento — e a despesa zerada, que hoje passa batido,
   * vira fato no histórico.
   */
  const [tocados, setTocados] = useState<Record<Campo, boolean>>(NENHUM_TOCADO);
  const tocar = (c: Campo) => setTocados((t) => (t[c] ? t : { ...t, [c]: true }));

  // ao escolher um mês, carrega o que já foi lançado (ou zera, se for novo)
  useEffect(() => {
    const existente = lista.find((s) => s.mes === mes);
    if (existente) {
      setPatrimonio(existente.patrimonioTotal);
      setReceita(existente.receitaLiquida);
      setDespesa(existente.gastoTotal);
      setAporte(existente.aportesMes);
      setObservacao(existente.observacao ?? '');
      setAtipico(existente.atipico ?? false);
      // mês já lançado está todo respondido — inclusive os zeros
      setTocados(TODOS_TOCADOS);
    } else {
      setPatrimonio(0);
      setReceita(0);
      setDespesa(0);
      setAporte(0);
      setObservacao('');
      setAtipico(false);
      setTocados(NENHUM_TOCADO);
    }
  }, [mes, lista]);

  // patrimônio do mês anterior (maior mês < selecionado) → deriva o rendimento
  const anterior = useMemo(() => {
    const antes = lista.filter((s) => s.mes < mes);
    return antes.length ? antes[antes.length - 1] : undefined;
  }, [lista, mes]);

  const taxa = taxaPoupanca(receita, despesa);
  const taxaInvest = taxaInvestimento(aporte, receita);
  // agora com o aporte OBSERVADO: era aqui que o aporte inflado pela sobra
  // fazia o rendimento sair negativo em mês bom
  const rendimento = anterior ? rendimentoMes(patrimonio, anterior.patrimonioTotal, aporte) : null;
  const residual = residualDoMes(receita, despesa, aporte);

  /**
   * A data como está no momento em que este mês é lançado.
   *
   * Gravada junto com o snapshot pra virar histórico: é o que vai permitir
   * dizer "há um ano sua data era 2051" e desenhar a trajetória. Calculada aqui
   * e nunca mais recalculada.
   */
  const mesesAteFireAgora = useMemo(() => {
    if (!doc) return null;
    return calcularPlanoFire({
      patrimonioInvestivel: patrimonio,
      aporteMensal: doc.aporteMensal,
      custoVidaMensal: doc.custoVidaMensal,
      retornoRealAnual: doc.retornoRealEsperado,
      metaFire: metaVigente(doc),
      tss: doc.taxaSaqueSegura,
      hoje: new Date(),
    }).meses;
  }, [doc, patrimonio]);

  const faltando = CAMPOS.filter((c) => !tocados[c]);
  const valido = faltando.length === 0;

  async function salvar() {
    if (!user || !valido) return;
    setErro(null);
    setSalvando(true);
    try {
      await salvarSnapshot(user.uid, {
        mes,
        patrimonioTotal: patrimonio,
        receitaLiquida: receita,
        gastoTotal: despesa,
        aportesMes: aporte,
        aporteObservado: true,
        rendimentosMes: rendimento ?? 0,
        taxaPoupanca: taxa,
        taxaInvestimento: taxaInvest,
        mesesAteFire: mesesAteFireAgora,
        atipico,
        ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
      });
      navigate('/', { replace: true });
    } catch {
      setErro('Não consegui salvar. Tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <main className="pf-container" style={{ maxWidth: '32rem', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="pf-btn-link" onClick={() => navigate('/')} style={{ padding: 0 }}>← Voltar</button>
        <strong className="mono" style={{ flex: 1, textAlign: 'center' }}>Lançar mês</strong>
        <span style={{ width: '3rem' }} />
      </header>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <p className="pf-eyebrow" style={{ margin: 0 }}>Modo rápido · 4 números</p>
        <Link className="pf-btn-link" style={{ padding: 0 }} to="/importar">
          importar extrato ou fatura →
        </Link>
      </div>

      <Campo rotulo="Mês de referência" dica="Qual mês você está lançando.">
        <input className="pf-input" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
      </Campo>

      <Campo rotulo="Patrimônio total hoje" dica="Soma do que você tem investido hoje (marcação a mercado). Aceita centavos.">
        <MoedaInput
          value={patrimonio}
          onChange={setPatrimonio}
          tocado={tocados.patrimonio}
          onTocar={() => tocar('patrimonio')}
        />
        <span className="pf-hint">
          Some tudo que você tem investido — <strong>incluindo a reserva de emergência</strong>. Ela
          rende e é seu patrimônio. Mais pra frente a gente separa o que é reserva pra ajustar a meta.
        </span>
      </Campo>

      <Campo rotulo="Receita do mês (o que entrou)" dica="Sua renda líquida do mês: salário + rendas que caíram na conta.">
        <MoedaInput
          value={receita}
          onChange={setReceita}
          tocado={tocados.receita}
          onTocar={() => tocar('receita')}
        />
        <span className="pf-hint">Sua renda líquida no mês.</span>
      </Campo>

      <Campo rotulo="Despesa do mês (o que consumiu)" dica="Só o consumo pra viver — SEM contar o que você investiu.">
        <MoedaInput
          value={despesa}
          onChange={setDespesa}
          tocado={tocados.despesa}
          onTocar={() => tocar('despesa')}
        />
        <span className="pf-hint">Só o consumo — sem contar o que você investiu.</span>
      </Campo>

      <Campo
        rotulo="Aporte do mês (o que virou patrimônio)"
        dica="Quanto saiu da conta e entrou na carteira. Em mês de PPR ou 13º costuma ser bem maior — por isso ele é digitado, não deduzido."
      >
        <MoedaInput
          value={aporte}
          onChange={setAporte}
          tocado={tocados.aporte}
          onTocar={() => tocar('aporte')}
        />
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span className="pf-hint" style={{ flex: 1 }}>O que de fato entrou na carteira.</span>
          <button
            type="button"
            className="pf-btn-link"
            style={{ padding: 0 }}
            onClick={() => {
              setAporte(0);
              tocar('aporte');
            }}
          >
            não aportei nada
          </button>
        </div>
      </Campo>

      <Campo
        rotulo="Aconteceu algo fora do normal?"
        opcional
        dica="Uma nota pra você lembrar por que este mês foi diferente. Ela volta pra te explicar o número lá na frente."
      >
        <input
          className="pf-input"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="carro quebrou · entrou PPR · viagem"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          <input
            type="checkbox"
            className="pf-check"
            checked={atipico}
            onChange={(e) => setAtipico(e.target.checked)}
          />
          <span className="pf-hint" style={{ margin: 0 }}>
            Foi um mês atípico — não usar na minha média
          </span>
        </label>
      </Campo>

      {/* Preview do que o motor deriva */}
      <div className="pf-hero-card" style={{ marginTop: 'var(--space-4)' }}>
        <span className="pf-eyebrow">O motor deriva</span>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Linha rotulo="Taxa de poupança (não consumiu)" valor={formatPct(taxa)} />
          <Linha rotulo="Taxa de investimento (virou patrimônio)" valor={formatPct(taxaInvest)} tom="mint" />
          {rendimento !== null ? (
            <Linha rotulo={`Rendimento vs ${formatMesAno(new Date(anterior!.mes + '-01T00:00:00'))}`} valor={formatBRL(rendimento)} tom={rendimento < 0 ? 'ember' : 'mint'} />
          ) : (
            <Linha rotulo="Rendimento" valor="— (1º mês, sem base)" />
          )}
        </div>
      </div>

      {/*
        O residual não entra em cálculo nenhum — é informação. E não é acusação:
        pode ter ido pra reserva, pra amortizar dívida, ou ser erro de digitação.
      */}
      {Math.abs(residual) > 0.5 && valido && (
        <p className="pf-hint" style={{ marginTop: 'var(--space-3)' }}>
          {residual > 0 ? (
            <>
              Sobraram <strong>{formatBRL(residual)}</strong> que não viraram patrimônio. Se ficaram
              na conta, está certo assim — só é o dinheiro que economizar não bastou pra investir.
            </>
          ) : (
            <>
              Saíram <strong>{formatBRL(-residual)}</strong> a mais do que entraram. Ou faltou
              registrar uma receita, ou o aporte veio de saldo que já existia — as duas acontecem.
            </>
          )}
        </p>
      )}

      {erro && <p className="pf-error">{erro}</p>}

      <button className="pf-btn pf-btn-primary" style={{ marginTop: 'var(--space-6)' }} disabled={!valido || salvando} onClick={() => void salvar()}>
        {salvando ? 'Salvando…' : lista.some((s) => s.mes === mes) ? 'Atualizar mês' : 'Salvar mês'}
      </button>

      {faltando.length > 0 && (
        <p className="pf-hint" style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
          Falta responder: {faltando.map((c) => ROTULO_CAMPO[c]).join(', ')}. Zero vale como
          resposta — só não vale deixar em branco.
        </p>
      )}

      {lista.some((s) => s.mes === mes) && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
          <Link className="pf-btn-link" to={`/detalhar/${mes}`}>Detalhar este mês por categoria →</Link>
        </div>
      )}

      {lista.length > 0 && (
        <section style={{ marginTop: 'var(--space-8)' }}>
          <p className="pf-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Meses lançados</p>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {[...lista].reverse().map((s) => (
              <div
                key={s.mes}
                className="pf-stat"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderColor: s.mes === mes ? 'var(--ember)' : 'var(--line)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setMes(s.mes)}
                  className="pf-btn-link"
                  style={{ flex: 1, textAlign: 'left', padding: 0, color: 'var(--paper)', textTransform: 'capitalize', textDecoration: 'none' }}
                >
                  {formatMesAno(new Date(`${s.mes}-01T00:00:00`))}
                </button>
                <span className="mono" style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                  {formatBRLcompact(s.patrimonioTotal)} · {formatPct(s.taxaPoupanca)}
                </span>
                <Link className="pf-btn-link" style={{ padding: 0 }} to={`/detalhar/${s.mes}`}>detalhar</Link>
              </div>
            ))}
          </div>
          <p className="pf-hint" style={{ marginTop: 'var(--space-2)' }}>Toque num mês pra editar.</p>
        </section>
      )}
    </main>
  );
}

function Linha({ rotulo, valor, tom }: { rotulo: string; valor: string; tom?: 'mint' | 'ember' }) {
  const cor = tom === 'mint' ? 'var(--mint)' : tom === 'ember' ? 'var(--ember-2)' : 'var(--paper)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
      <span style={{ color: 'var(--muted)' }}>{rotulo}</span>
      <span className="mono" style={{ color: cor }}>{valor}</span>
    </div>
  );
}
