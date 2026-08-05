import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  anualParaMensal,
  calcularJuros,
  compararCombustivel,
  compararCompra,
  simularCompra,
} from '@pontofire/engine';
import { MoedaInput } from '../components/MoedaInput';
import { Campo } from '../components/Campo';
import { GraficoCompra } from '../components/GraficoCompra';
import { formatBRL, formatPct } from '../utils/format';

type Aba = 'juros' | 'combustivel' | 'parcelado';

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: 'juros', rotulo: 'Juros compostos', icone: '📈' },
  { id: 'combustivel', rotulo: 'Etanol ou gasolina', icone: '⛽' },
  { id: 'parcelado', rotulo: 'À vista ou parcelado', icone: '💳' },
];

export function Ferramentas() {
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>('juros');

  return (
    <main className="pf-container" style={{ maxWidth: '34rem', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="pf-btn-link" onClick={() => navigate('/')} style={{ padding: 0 }}>← Voltar</button>
        <strong className="pf-logo" style={{ flex: 1, textAlign: 'center' }}>Ferramentas</strong>
        <span style={{ width: '3rem' }} />
      </header>

      <div className="pf-tabs">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`pf-tab ${aba === a.id ? 'on' : ''}`}
            onClick={() => setAba(a.id)}
            aria-pressed={aba === a.id}
          >
            <span className="ic" aria-hidden>{a.icone}</span>
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === 'juros' && <CalcJuros />}
      {aba === 'combustivel' && <CalcCombustivel />}
      {aba === 'parcelado' && <CalcParcelado />}
    </main>
  );
}

// ---------------------------------------------------------------------------

function Resultado({ rotulo, valor, tom }: { rotulo: string; valor: string; tom?: 'mint' | 'ember' }) {
  const cor = tom === 'mint' ? 'var(--mint)' : tom === 'ember' ? 'var(--ember-2)' : 'var(--paper)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
      <span style={{ color: 'var(--muted)' }}>{rotulo}</span>
      <span className="mono" style={{ color: cor }}>{valor}</span>
    </div>
  );
}

function Destaque({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
      <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{rotulo}</div>
      <div className="pf-hc-date" style={{ fontSize: 'clamp(24px, 6vw, 34px)' }}>{valor}</div>
      {sub && <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{sub}</div>}
    </div>
  );
}

function CalcJuros() {
  const [inicial, setInicial] = useState(1000);
  const [aporte, setAporte] = useState(500);
  const [taxaPct, setTaxaPct] = useState(10);
  const [anos, setAnos] = useState(10);

  const meses = Math.round(anos * 12);
  const r = calcularJuros({
    inicial,
    aporteMensal: aporte,
    taxaMensal: anualParaMensal(taxaPct / 100),
    meses,
  });
  const parteJuros = r.montante > 0 ? r.totalJuros / r.montante : 0;

  return (
    <>
      <Campo rotulo="Valor inicial" dica="Quanto você já tem hoje pra investir.">
        <MoedaInput value={inicial} onChange={setInicial} />
      </Campo>
      <Campo rotulo="Aporte mensal" dica="Quanto você adiciona todo mês.">
        <MoedaInput value={aporte} onChange={setAporte} />
      </Campo>
      <Campo rotulo="Taxa de juros (% ao ano)" dica="Convertida para mensal de forma composta — 12% a.a. não é 1% a.m.">
        <input className="pf-input pf-num" type="number" step={0.5} value={taxaPct} onChange={(e) => setTaxaPct(Number(e.target.value))} />
      </Campo>
      <Campo rotulo="Período (anos)">
        <input className="pf-input pf-num" type="number" step={1} value={anos} onChange={(e) => setAnos(Number(e.target.value))} />
      </Campo>

      <div className="pf-hero-card" style={{ marginTop: 'var(--space-4)' }}>
        <Destaque rotulo="Você teria" valor={formatBRL(r.montante)} />
        <Resultado rotulo="Total investido" valor={formatBRL(r.totalInvestido)} />
        <Resultado rotulo="Total em juros" valor={formatBRL(r.totalJuros)} tom="mint" />
        <Resultado rotulo="Se fosse juros simples" valor={formatBRL(r.montanteSimples)} />
        <Resultado rotulo="Diferença" valor={formatBRL(r.diferenca)} tom="ember" />
        <p className="pf-hint">
          {formatPct(parteJuros, 0)} do total viria de juros — dinheiro que você não precisou trabalhar
          pra ganhar.
        </p>
      </div>
    </>
  );
}

function CalcCombustivel() {
  const [pa, setPa] = useState(3.89);
  const [pg, setPg] = useState(5.79);
  const [ka, setKa] = useState(0);
  const [kg, setKg] = useState(0);

  const r = compararCombustivel(pa, pg, ka || undefined, kg || undefined);
  const nomes = { etanol: 'Etanol', gasolina: 'Gasolina', empate: 'Tanto faz' } as const;

  return (
    <>
      <Campo rotulo="Preço do etanol (R$/litro)">
        <MoedaInput value={pa} onChange={setPa} />
      </Campo>
      <Campo rotulo="Preço da gasolina (R$/litro)">
        <MoedaInput value={pg} onChange={setPg} />
      </Campo>
      <Campo rotulo="Km/litro no etanol" opcional dica="Sabendo o consumo real do seu carro, o cálculo deixa de usar a regra dos 70% e fica exato.">
        <input className="pf-input pf-num" type="number" step={0.5} value={ka || ''} onChange={(e) => setKa(Number(e.target.value))} />
      </Campo>
      <Campo rotulo="Km/litro na gasolina" opcional>
        <input className="pf-input pf-num" type="number" step={0.5} value={kg || ''} onChange={(e) => setKg(Number(e.target.value))} />
      </Campo>

      <div className="pf-hero-card" style={{ marginTop: 'var(--space-4)' }}>
        <Destaque
          rotulo="Compensa abastecer com"
          valor={nomes[r.vencedor]}
          sub={r.vencedor === 'empate' ? 'os dois custam o mesmo por km' : `economia de ${formatPct(r.economiaPct, 1)} por km`}
        />
        <Resultado rotulo="Razão etanol ÷ gasolina" valor={r.razao.toFixed(3).replace('.', ',')} />
        <Resultado rotulo="Limite do seu carro" valor={r.limite.toFixed(2).replace('.', ',')} />
        <p className="pf-hint">
          {ka > 0 && kg > 0
            ? 'Cálculo com o consumo real do seu carro.'
            : 'Usando a regra dos 70%. Informe o consumo do seu carro pra ficar exato.'}
        </p>
      </div>
    </>
  );
}

function CalcParcelado() {
  const [precoAVista, setPrecoAVista] = useState(1000);
  const [precoCartao, setPrecoCartao] = useState(1000);
  const [maxParcelas, setMaxParcelas] = useState(12);
  const [rendPct, setRendPct] = useState(0.8);
  const [cashbackPct, setCashbackPct] = useState(0);

  const r = compararCompra({
    precoAVista,
    precoCartao,
    maxParcelas,
    rendimentoMensal: rendPct / 100,
    cashback: cashbackPct / 100,
  });

  // simula o melhor cartão (ou o parcelamento cheio) contra o PIX
  const parcelasSim = r.melhor.parcelas > 0 ? r.melhor.parcelas : maxParcelas;
  const sim = simularCompra(
    { precoAVista, precoCartao, maxParcelas, rendimentoMensal: rendPct / 100, cashback: cashbackPct / 100 },
    parcelasSim,
  );

  // mostra o PIX, a melhor e as vizinhas — sem despejar 12 linhas iguais
  const destaques = r.opcoes.filter(
    (o, idx) => o.id === 'pix' || idx < 3 || o.parcelas === 1 || o.parcelas === maxParcelas,
  );

  return (
    <>
      <Campo rotulo="Preço no PIX / dinheiro" dica="O preço à vista, já com o desconto que a loja der.">
        <MoedaInput value={precoAVista} onChange={setPrecoAVista} />
      </Campo>
      <Campo rotulo="Preço total no cartão" dica="O preço cheio, que será dividido nas parcelas. Se não houver desconto no PIX, é o mesmo valor.">
        <MoedaInput value={precoCartao} onChange={setPrecoCartao} />
      </Campo>
      <Campo rotulo="Número máximo de parcelas" dica="Até quantas vezes a loja parcela. Comparamos todas as quantidades.">
        <input className="pf-input pf-num" type="number" min={1} max={48} step={1} value={maxParcelas} onChange={(e) => setMaxParcelas(Number(e.target.value))} />
      </Campo>
      <Campo rotulo="Seu dinheiro rende (% ao mês)" dica="Quanto rende o dinheiro que fica na sua conta enquanto você não paga.">
        <input className="pf-input pf-num" type="number" step={0.1} value={rendPct} onChange={(e) => setRendPct(Number(e.target.value))} />
      </Campo>
      <Campo rotulo="Cashback do cartão (%)" opcional dica="Volta junto de cada parcela e abate o custo real. Não vale no PIX.">
        <input className="pf-input pf-num" type="number" step={0.1} min={0} value={cashbackPct || ''} onChange={(e) => setCashbackPct(Number(e.target.value))} />
      </Campo>

      <div className="pf-hero-card" style={{ marginTop: 'var(--space-4)' }}>
        <Destaque
          rotulo="Melhor forma de pagar"
          valor={r.melhor.rotulo}
          sub={
            r.economiaMaxima > 0.005
              ? `economia de ${formatBRL(r.economiaMaxima)} sobre a pior opção`
              : 'todas as formas custam praticamente o mesmo'
          }
        />

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-3)' }}>
          <p className="pf-eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Custo em valor de hoje</p>
          {destaques.map((o) => (
            <div
              key={o.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) 0',
                color: o.id === r.melhor.id ? 'var(--mint)' : 'var(--paper)',
              }}
            >
              <span>
                {o.rotulo}
                {o.parcelas > 1 && (
                  <span className="pf-hint" style={{ margin: 0 }}> · {formatBRL(o.valorParcela)}/mês</span>
                )}
              </span>
              <span className="mono">
                {formatBRL(o.custoHoje)}
                {o.diferencaVsMelhor > 0.005 && (
                  <span style={{ color: 'var(--muted)', fontSize: '0.8em' }}> (+{formatBRL(o.diferencaVsMelhor)})</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {r.taxaEmbutida !== null && (
          <p className="pf-hint" style={{ marginTop: 'var(--space-3)', color: 'var(--ember-2)' }}>
            O cartão custa mais caro que o PIX — são {formatPct(r.taxaEmbutida, 2)} a.m. de juros
            embutidos no parcelamento.
          </p>
        )}

        <p className="pf-hint" style={{ marginTop: 'var(--space-3)' }}>
          Consideramos que a 1ª cobrança do cartão cai daqui a ~1 mês: até lá o dinheiro rende na sua
          conta. É por isso que o cartão à vista já leva vantagem sobre o PIX quando não há desconto.
        </p>
      </div>

      <div className="pf-hero-card" style={{ marginTop: 'var(--space-4)' }}>
        <span className="pf-eyebrow">A prova, mês a mês</span>
        <p className="pf-hc-sub" style={{ marginTop: 'var(--space-2)' }}>
          o mesmo produto, dois jeitos de pagar — e quanto sobra no bolso
        </p>
        <GraficoCompra
          sim={sim}
          parcelas={parcelasSim}
          valorParcela={precoCartao / parcelasSim}
          rotuloCartao={parcelasSim === 1 ? 'Cartão à vista' : `Cartão em ${parcelasSim}×`}
        />
      </div>
    </>
  );
}
