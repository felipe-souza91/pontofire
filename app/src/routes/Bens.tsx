import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumoPatrimonio, type AssetTipo } from '@pontofire/engine';
import { useAuth } from '../auth/useAuth';
import { useAssets } from '../hooks/useAssets';
import { adicionarAsset, removerAsset, ROTULO_ASSET } from '../data/assets';
import { NOMES_BEM, normalizarCategoria } from '../data/categorias';
import { MoedaInput } from '../components/MoedaInput';
import { CategoriaInput } from '../components/CategoriaInput';
import { Campo } from '../components/Campo';
import { formatBRL } from '../utils/format';

// financeiro fica de fora: seu investido já vem do modo rápido (patrimônio lançado)
const TIPOS_BENS: AssetTipo[] = ['imovel-uso', 'imovel-renda', 'veiculo', 'outro'];

export function Bens() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lista } = useAssets(user?.uid ?? null);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<AssetTipo>('imovel-uso');
  const [valor, setValor] = useState(0);
  const [divida, setDivida] = useState(0);
  const [geraRenda, setGeraRenda] = useState(false);
  const [rendaMensal, setRendaMensal] = useState(0);
  const [incluirNoFire, setIncluirNoFire] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  // imóvel de renda já assume que gera renda
  useEffect(() => {
    setGeraRenda(tipo === 'imovel-renda');
    setIncluirNoFire(false);
  }, [tipo]);

  const resumo = useMemo(() => resumoPatrimonio(lista), [lista]);

  async function adicionar() {
    if (!user || !nome.trim() || valor <= 0) return;
    setOcupado(true);
    try {
      await adicionarAsset(user.uid, {
        nome: normalizarCategoria(nome),
        tipo,
        valor,
        dividaAssociada: divida || undefined,
        geraRenda: geraRenda || undefined,
        rendaMensal: geraRenda ? rendaMensal : undefined,
        incluirNoFire: incluirNoFire || undefined,
      });
      setNome('');
      setValor(0);
      setDivida(0);
      setRendaMensal(0);
      setIncluirNoFire(false);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="pf-container" style={{ maxWidth: '32rem', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="pf-btn-link" onClick={() => navigate('/')} style={{ padding: 0 }}>← Voltar</button>
        <strong className="mono" style={{ flex: 1, textAlign: 'center' }}>Meus bens</strong>
        <span style={{ width: '3rem' }} />
      </header>

      <p className="pf-hint" style={{ marginTop: 0 }}>
        Seu investido já vem do modo rápido. Aqui você cadastra casa, carro, imóveis e dívidas — pra ver
        seu patrimônio líquido total e a renda de aluguéis (que entra na cobertura passiva).
      </p>

      {/* Resumo */}
      {lista.length > 0 && (
        <div className="pf-hero-card" style={{ marginTop: 'var(--space-4)' }}>
          <span className="pf-eyebrow">Resumo dos bens</span>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Linha rotulo="Valor dos bens − dívidas" valor={formatBRL(resumo.patrimonioLiquidoTotal)} />
            {resumo.rendaPassivaBens > 0 && (
              <Linha rotulo="Renda de aluguéis (→ passiva)" valor={`${formatBRL(resumo.rendaPassivaBens)}/mês`} tom="mint" />
            )}
            {resumo.patrimonioInvestivel > 0 && (
              <Linha rotulo="Marcado como investível (FIRE)" valor={formatBRL(resumo.patrimonioInvestivel)} tom="ember" />
            )}
          </div>
        </div>
      )}

      {/* Adicionar bem */}
      <p className="pf-eyebrow" style={{ margin: 'var(--space-8) 0 var(--space-3)' }}>Adicionar bem</p>
      <div className="pf-chips" style={{ marginBottom: 'var(--space-4)' }}>
        {TIPOS_BENS.map((t) => (
          <button key={t} type="button" className={`pf-chip ${tipo === t ? 'on' : ''}`} onClick={() => setTipo(t)}>
            {ROTULO_ASSET[t]}
          </button>
        ))}
      </div>

      <Campo rotulo="Nome" dica="Um nome pra você identificar. Ex: Apartamento, Carro, Sítio.">
        <CategoriaInput value={nome} onChange={setNome} opcoes={NOMES_BEM[tipo]} placeholder="escolha ou digite" />
      </Campo>

      <Campo rotulo="Valor de mercado" dica="Quanto o bem vale hoje se você vendesse. Aceita centavos.">
        <MoedaInput value={valor} onChange={setValor} />
      </Campo>
      <Campo rotulo="Dívida associada" opcional dica="Saldo devedor do financiamento (ex: da casa/carro). Abate do patrimônio líquido.">
        <MoedaInput value={divida} onChange={setDivida} />
      </Campo>

      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        <input type="checkbox" checked={geraRenda} onChange={(e) => setGeraRenda(e.target.checked)} />
        <span>Gera renda (aluguel/arrendamento)</span>
      </label>
      {geraRenda && (
        <Campo rotulo="Renda mensal líquida" dica="Aluguel/arrendamento que sobra por mês (já descontadas taxas). Entra na cobertura passiva.">
          <MoedaInput value={rendaMensal} onChange={setRendaMensal} />
        </Campo>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', cursor: 'pointer' }}>
        <input type="checkbox" checked={incluirNoFire} onChange={(e) => setIncluirNoFire(e.target.checked)} />
        <span>Considerar este bem na base do FIRE</span>
      </label>
      {incluirNoFire && (
        <p className="pf-hint" style={{ marginTop: 0, color: 'var(--ember-2)' }}>
          ⚠️ Isso adianta sua data no papel — mas bem de uso não te dá saque mensal (você não vende a
          casa aos poucos), e imóvel de renda já conta via aluguel. A data fica otimista.
        </p>
      )}

      <button className="pf-btn pf-btn-primary" style={{ marginTop: 'var(--space-4)' }} disabled={ocupado || !nome.trim() || valor <= 0} onClick={() => void adicionar()}>
        {ocupado ? 'Adicionando…' : 'Adicionar bem'}
      </button>

      {/* Lista */}
      {lista.length > 0 && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <p className="pf-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Seus bens ({lista.length})</p>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {lista.map((b) => (
              <div key={b.id} className="pf-stat" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span>{b.nome}</span>
                    <span className="mono" style={{ fontSize: '0.66rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{ROTULO_ASSET[b.tipo]}</span>
                    {b.incluirNoFire && <span className="mono" style={{ fontSize: '0.66rem', color: 'var(--ember-2)' }}>· no FIRE</span>}
                  </div>
                  <div className="pf-hint" style={{ margin: 0 }}>
                    {formatBRL(b.valor)}
                    {b.dividaAssociada ? ` · dívida ${formatBRL(b.dividaAssociada)}` : ''}
                    {b.geraRenda && b.rendaMensal ? ` · ${formatBRL(b.rendaMensal)}/mês` : ''}
                  </div>
                </div>
                <button className="pf-btn-link" style={{ padding: 0, color: 'var(--muted)' }} aria-label="Remover" onClick={() => user && void removerAsset(user.uid, b.id)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
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
