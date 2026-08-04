import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  anualParaMensal,
  calcularJuros,
  compararCombustivel,
  compararParcelado,
} from '@pontofire/engine';
import { MoedaInput } from '../components/MoedaInput';
import { Campo } from '../components/Campo';
import { formatBRL, formatPct } from '../utils/format';

type Aba = 'juros' | 'combustivel' | 'parcelado';

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: 'juros', rotulo: 'Juros compostos', icone: '📈' },
  { id: 'combustivel', rotulo: 'Álcool ou gasolina', icone: '⛽' },
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
  const nomes = { alcool: 'Álcool', gasolina: 'Gasolina', empate: 'Tanto faz' } as const;

  return (
    <>
      <Campo rotulo="Preço do álcool (R$/litro)">
        <MoedaInput value={pa} onChange={setPa} />
      </Campo>
      <Campo rotulo="Preço da gasolina (R$/litro)">
        <MoedaInput value={pg} onChange={setPg} />
      </Campo>
      <Campo rotulo="Km/litro no álcool" opcional dica="Sabendo o consumo real do seu carro, o cálculo deixa de usar a regra dos 70% e fica exato.">
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
        <Resultado rotulo="Razão álcool ÷ gasolina" valor={r.razao.toFixed(3).replace('.', ',')} />
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
  const [avista, setAvista] = useState(1000);
  const [parcela, setParcela] = useState(100);
  const [n, setN] = useState(12);
  const [rendPct, setRendPct] = useState(0.8);
  const [cashbackPct, setCashbackPct] = useState(0);
  const [aVistaNoCartao, setAVistaNoCartao] = useState(false);

  const rend = rendPct / 100;
  const r = compararParcelado(avista, parcela, n, rend, {
    cashback: cashbackPct / 100,
    aVistaNoCartao,
  });

  return (
    <>
      <Campo rotulo="Preço à vista">
        <MoedaInput value={avista} onChange={setAvista} />
      </Campo>
      <Campo rotulo="Valor da parcela">
        <MoedaInput value={parcela} onChange={setParcela} />
      </Campo>
      <Campo rotulo="Número de parcelas">
        <input className="pf-input pf-num" type="number" step={1} value={n} onChange={(e) => setN(Number(e.target.value))} />
      </Campo>
      <Campo rotulo="Seu dinheiro rende (% ao mês)" dica="Quanto rende o dinheiro que ficaria no seu bolso se você parcelasse.">
        <input className="pf-input pf-num" type="number" step={0.1} value={rendPct} onChange={(e) => setRendPct(Number(e.target.value))} />
      </Campo>
      <Campo rotulo="Cashback do cartão (%)" opcional dica="O cashback volta junto de cada parcela e abate o custo real da compra.">
        <input className="pf-input pf-num" type="number" step={0.1} min={0} value={cashbackPct || ''} onChange={(e) => setCashbackPct(Number(e.target.value))} />
      </Campo>
      {cashbackPct > 0 && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
          <input type="checkbox" checked={aVistaNoCartao} onChange={(e) => setAVistaNoCartao(e.target.checked)} />
          <span>O preço à vista também é no cartão (não é PIX/dinheiro)</span>
        </label>
      )}

      <div className="pf-hero-card" style={{ marginTop: 'var(--space-4)' }}>
        <Destaque
          rotulo="Melhor opção"
          valor={r.melhor === 'parcelar' ? 'Parcelar' : 'Pagar à vista'}
          sub={`vantagem de ${formatBRL(r.diferenca)} em valor de hoje`}
        />
        <Resultado rotulo="Total parcelado" valor={formatBRL(r.totalParcelado)} />
        <Resultado rotulo="Acréscimo sobre o à vista" valor={r.acrescimo > 0 ? formatBRL(r.acrescimo) : 'sem acréscimo'} />
        <Resultado
          rotulo="Juros embutidos"
          valor={r.taxaEmbutida === null ? 'sem juros' : `${formatPct(r.taxaEmbutida, 2)} a.m.`}
          tom="ember"
        />
        {r.cashbackParcelado > 0 && (
          <Resultado rotulo="Cashback parcelando" valor={`+${formatBRL(r.cashbackParcelado)}`} tom="mint" />
        )}
        {r.cashbackAVista > 0 && (
          <Resultado rotulo="Cashback à vista" valor={`+${formatBRL(r.cashbackAVista)}`} tom="mint" />
        )}
        <Resultado rotulo="Custo à vista (líquido)" valor={formatBRL(r.custoAVista)} />
        <Resultado rotulo="Parcelas em valor de hoje" valor={formatBRL(r.valorPresente)} />
        {r.cashbackNeutro ? (
          <p className="pf-hint">
            Como o cashback incide nas duas opções, ele <strong>não muda a decisão</strong> — abate os
            dois lados igualmente. Ele só vira desempate quando o preço à vista é PIX/dinheiro.
          </p>
        ) : (
          <p className="pf-hint">
            Parcelar só ganha se o dinheiro que fica no seu bolso — mais o cashback — superar os juros
            embutidos.
          </p>
        )}
      </div>
    </>
  );
}
