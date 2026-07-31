import { useMemo, type ReactNode } from 'react';
import { calcularPlanoFire } from '@pontofire/engine';
import { useAuth } from '../auth/useAuth';
import { useUserDoc } from '../hooks/useUserDoc';
import { Flame } from '../theme/Flame';
import { formatBRL, formatDuracao, formatMesAno } from '../utils/format';

// Placeholder do Início (M3 constrói termômetro, contagem regressiva, cobertura
// passiva, evolução etc.). Por ora prova a persistência: mostra a data salva.
export function Dashboard() {
  const { user, sair } = useAuth();
  const { doc, carregando } = useUserDoc(user?.uid ?? null);

  const plano = useMemo(() => {
    if (!doc) return null;
    return calcularPlanoFire({
      patrimonioInvestivel: doc.patrimonioInicial,
      aporteMensal: doc.aporteMensal,
      custoVidaMensal: doc.custoVidaMensal,
      retornoRealAnual: doc.retornoRealEsperado,
      metaFire: doc.metaFire,
      tss: doc.taxaSaqueSegura,
      hoje: new Date(),
    });
  }, [doc]);

  if (carregando) return <Centro>Carregando…</Centro>;
  if (!doc || !plano) return <Centro>Sem dados ainda.</Centro>;

  const saudacao = doc.apelido || doc.nome || 'você';

  return (
    <main className="pf-container" style={{ paddingTop: 'var(--space-8)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
        <Flame size={32} />
        <strong style={{ flex: 1 }}>Ponto FIRE</strong>
        <button className="pf-btn-link" onClick={() => void sair()}>
          Sair
        </button>
      </header>

      <p style={{ color: 'var(--muted)' }}>Olá, {saudacao}.</p>

      <div className="pf-card" style={{ textAlign: 'center' }}>
        {plano.status === 'ok' && plano.dataLiberdade && plano.meses !== null ? (
          <>
            <p style={{ color: 'var(--muted)', marginBottom: 'var(--space-2)' }}>Sua liberdade chega em</p>
            <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', color: 'var(--mint)', margin: 0 }}>
              {formatMesAno(plano.dataLiberdade)}
            </h1>
            <p className="mono" style={{ color: 'var(--muted)' }}>daqui a {formatDuracao(plano.meses)}</p>
          </>
        ) : plano.status === 'atingido' ? (
          <h1 style={{ color: 'var(--mint)' }}>Você já chegou lá.</h1>
        ) : (
          <h1 style={{ fontSize: '1.6rem' }}>Ainda sem data — ajuste o aporte pra ver a projeção.</h1>
        )}
      </div>

      <div className="pf-card" style={{ marginTop: 'var(--space-4)' }}>
        <Linha rotulo="Número FIRE" valor={formatBRL(plano.numeroFire)} />
        <Linha rotulo="Progresso" valor={`${(plano.progresso * 100).toFixed(1).replace('.', ',')}%`} />
        <Linha rotulo="Renda ao atingir" valor={`${formatBRL(plano.saqueMensalSustentavel)} /mês`} />
      </div>

      <p className="pf-hint" style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
        Início completo chega no M3 (termômetro, contagem regressiva, evolução).
      </p>
    </main>
  );
}

function Centro({ children }: { children: ReactNode }) {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
      {children}
    </main>
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
