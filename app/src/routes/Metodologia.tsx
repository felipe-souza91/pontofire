import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { numeroFire, patrimonioCoast, INSS_2026 } from '@pontofire/engine';
import { useAuth } from '../auth/useAuth';
import { usePainel, idadeDe } from '../hooks/usePainel';
import { useIndicadores } from '../hooks/useIndicadores';
import { formatBRL, formatBRLcompact, formatDuracao, formatPct } from '../utils/format';

/**
 * Metodologia — a conta aberta.
 *
 * O app inteiro promete "matemática honesta" e "estimativa, não promessa".
 * Esta página é o recibo dessa promessa: cada número do painel tem aqui a
 * fórmula que o gerou, OS NÚMEROS DO PRÓPRIO USUÁRIO substituídos nela, a
 * fonte quando existe, e — a parte que mais importa — o que aquela conta
 * **não** diz.
 *
 * Fica atrás do login (decisão do dono) e por isso pode fazer o que uma página
 * estática não faria: mostrar a prova com os valores reais de quem está lendo.
 */
export function Metodologia() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { doc, plano, P, R, netWorth, snapshots, bens, carregando } = usePainel(user?.uid ?? null);
  const ind = useIndicadores();

  // React Router não rola para a âncora sozinho
  useEffect(() => {
    if (!hash || carregando) return;
    const alvo = document.getElementById(hash.slice(1));
    if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash, carregando]);

  if (carregando || !doc || !plano) {
    return (
      <main className="pf-container" style={{ paddingTop: 'var(--space-8)' }}>
        <p style={{ color: 'var(--muted)' }}>Carregando…</p>
      </main>
    );
  }

  const tss = doc.taxaSaqueSegura;
  const C = doc.custoVidaMensal;
  const A = doc.aporteMensal;
  const M = doc.metaFire;
  const i = plano.iMensal;
  const rAnual = doc.retornoRealEsperado;
  const idadeAtual = idadeDe(doc.dataNascimento);
  const metaPelaRegra = numeroFire(C, tss);
  const metaEhCustomizada = Math.abs(M - metaPelaRegra) / Math.max(1, M) > 0.02;

  const secoes: [string, string][] = [
    ['numero-fire', 'Seu número FIRE'],
    ['data', 'A data da liberdade'],
    ['juro-real', 'Juro real (e por que tudo aqui é real)'],
    ['patrimonio', 'O que conta como patrimônio'],
    ['coast', 'CoastFIRE'],
    ['alavancas', 'As alavancas (motor reverso)'],
    ['cobertura', 'Cobertura passiva e taxa de poupança'],
    ['inss', 'A estimativa do INSS'],
    ['economico', 'Os indicadores do Banco Central'],
    ['importador', 'Como leio extratos e faturas'],
    ['verificacao', 'Como isso é verificado'],
    ['dados', 'Onde ficam os seus dados'],
  ];

  return (
    <main className="pf-container pf-metodo">
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button className="pf-btn-link" style={{ padding: 0 }} onClick={() => navigate(-1)}>← Voltar</button>
        <strong className="mono" style={{ flex: 1, textAlign: 'center' }}>Metodologia</strong>
        <span style={{ width: '3rem' }} />
      </header>

      <p className="pf-eyebrow">a conta aberta</p>
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', margin: 'var(--space-3) 0' }}>
        Você não precisa acreditar em mim.
      </h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
        Todo número do seu painel sai de uma fórmula que está aqui, com os{' '}
        <strong style={{ color: 'var(--paper)' }}>seus valores</strong> substituídos nela. Cada
        seção termina com o que aquela conta <strong style={{ color: 'var(--paper)' }}>não</strong>{' '}
        diz — porque é isso que costuma faltar em ferramenta de finanças, não a fórmula.
      </p>

      <nav className="pf-metodo-indice">
        {secoes.map(([id, titulo]) => (
          <a key={id} href={`#${id}`}>{titulo}</a>
        ))}
      </nav>

      {/* ------------------------------------------------------------------ */}
      <Secao id="numero-fire" titulo="Seu número FIRE" pergunta={`De onde vêm os ${formatBRLcompact(M)}?`}>
        <p>
          É a regra dos 4% (Trinity Study, 1998), aplicada ao contrário: se você pode sacar{' '}
          <Mono>TSS</Mono> do patrimônio por ano sem consumi-lo, então o patrimônio precisa ser o seu
          custo anual dividido por essa taxa.
        </p>
        <Formula>M = C × 12 ÷ TSS</Formula>
        <Prova
          linhas={[
            ['C — seu custo de vida mensal', formatBRL(C)],
            ['× 12 meses', formatBRL(C * 12)],
            [`÷ TSS (${formatPct(tss)} ao ano)`, formatBRLcompact(metaPelaRegra)],
          ]}
          resultado={['Número FIRE pela regra', formatBRLcompact(metaPelaRegra)]}
        />
        {metaEhCustomizada && (
          <p className="pf-metodo-nota">
            Você definiu uma meta própria de <strong>{formatBRLcompact(M)}</strong>, diferente da
            regra. O painel usa a <strong>sua</strong> — a regra fica só como referência.
          </p>
        )}
        <Limite>
          A regra dos 4% nasceu de uma carteira americana 50/50 em janelas de 30 anos. Ela não é lei
          da natureza: assume que você não vive 60 anos após parar, que a carteira acompanha a
          inflação e que você não saca mais nos anos ruins. TSS menor = mais margem.
        </Limite>
      </Secao>

      {/* ------------------------------------------------------------------ */}
      <Secao
        id="data"
        titulo="A data da liberdade"
        pergunta={plano.status === 'ok' ? `Por que ${formatDuracao(plano.meses!)}?` : 'Como a data é calculada?'}
      >
        <p>
          É o valor futuro de um patrimônio com aportes mensais, resolvido para o{' '}
          <Mono>n</Mono> (quantos meses). O aporte entra no <strong>fim</strong> do mês.
        </p>
        <Formula>VF = P(1+i)ⁿ + A · ((1+i)ⁿ − 1) ÷ i</Formula>
        <Formula>n = ln[(M·i + A) ÷ (P·i + A)] ÷ ln(1+i)</Formula>
        <Prova
          linhas={[
            ['P — patrimônio investível hoje', formatBRLcompact(P)],
            ['A — aporte mensal', formatBRL(A)],
            ['i — retorno real MENSAL', `${(i * 100).toFixed(4).replace('.', ',')}%`],
            ['M — sua meta', formatBRLcompact(M)],
          ]}
          resultado={
            plano.status === 'ok'
              ? ['n — meses até a meta', `${plano.meses!.toFixed(1).replace('.', ',')} (${formatDuracao(plano.meses!)})`]
              : plano.status === 'atingido'
                ? ['n', 'zero — você já passou da meta']
                : ['n', 'não existe: a meta não fecha neste ritmo']
          }
        />
        <p className="pf-metodo-nota">
          Casos que o motor trata sem devolver erro nem número falso:{' '}
          <strong>P ≥ M</strong> → já chegou; <strong>i ≈ 0</strong> → cai no linear{' '}
          <Mono>n = (M − P) ÷ A</Mono>; e quando o retorno real negativo come mais do que o aporte
          repõe, a resposta é <strong>"a meta não fecha"</strong>, não uma data inventada.
        </p>
        <Limite>
          A data assume aporte constante, retorno constante e custo de vida constante — três coisas
          que a vida não respeita. Ela não é previsão: é o retrato de "se tudo continuar como está
          hoje". É por isso que ela muda a cada mês que você lança.
        </Limite>
      </Secao>

      {/* ------------------------------------------------------------------ */}
      <Secao id="juro-real" titulo="Juro real (e por que tudo aqui é real)" pergunta="Por que a Selic não aparece na projeção?">
        <p>
          Toda conta do Ponto FIRE roda em <strong>poder de compra de hoje</strong>. Sua meta de{' '}
          {formatBRLcompact(M)} são {formatBRLcompact(M)} de hoje, não uma pilha de dinheiro
          corroída pela inflação de 20 anos. Para isso o retorno precisa ser real, e a conversão de
          nominal para real é <strong>composta</strong>, nunca uma subtração:
        </p>
        <Formula>real = (1 + nominal) ÷ (1 + inflação) − 1</Formula>
        <Formula>i mensal = (1 + real anual)^(1/12) − 1</Formula>
        <Prova
          linhas={[
            ['Seu retorno real anual', formatPct(rAnual)],
            ['Elevado a 1/12', `${(i * 100).toFixed(4).replace('.', ',')}% ao mês`],
            ['Conferência: (1+i)¹² − 1', formatPct(Math.pow(1 + i, 12) - 1)],
          ]}
          resultado={['i — o que a projeção usa', `${(i * 100).toFixed(4).replace('.', ',')}% a.m.`]}
        />
        <p className="pf-metodo-nota">
          Repare que <strong>não</strong> é <Mono>{formatPct(rAnual)} ÷ 12</Mono>. Dividir por 12
          ignora os juros sobre juros e infla a projeção — num prazo de 20 anos a diferença vira
          anos de vida.
        </p>
        <Limite>
          "Real" aqui significa descontado do IPCA, que é uma cesta média. A sua inflação pessoal
          pode ser outra: quem gasta muito com saúde e educação costuma sentir mais que o índice.
        </Limite>
      </Secao>

      {/* ------------------------------------------------------------------ */}
      <Secao id="patrimonio" titulo="O que conta como patrimônio" pergunta="Por que minha casa não entra na meta?">
        <p>
          Existem <strong>dois números</strong> e eles não se misturam. O que sustenta o FIRE é só o
          que <strong>rende e é sacável</strong> — porque a data depende de um capital que possa
          pagar seu mês. Sua casa própria vale dinheiro, mas não paga o mercado.
        </p>
        <Prova
          linhas={[
            ['Base do FIRE (P) — investido + bens que rendem', formatBRLcompact(P)],
            ['Patrimônio líquido total — tudo − dívidas', formatBRLcompact(netWorth)],
            ['Bens cadastrados', `${bens.length}`],
          ]}
          resultado={['O que a data usa', formatBRLcompact(P)]}
        />
        <p className="pf-metodo-nota">
          Imóvel de <strong>renda</strong> entra diferente: o aluguel líquido soma na sua renda
          passiva <Mono>R</Mono>, e o valor do imóvel <em>não</em> entra na base — senão o mesmo
          bem contaria duas vezes (pelo aluguel e pelo saque de 4% sobre o valor).
        </p>
        <p className="pf-metodo-nota">
          O rendimento mensal não é informado, é <strong>derivado</strong> por marcação a mercado:{' '}
          <Mono>rendimento = saldo de hoje − saldo anterior − aportes do mês</Mono>. É o que impede
          você de confundir "guardei dinheiro" com "meu dinheiro rendeu".
        </p>
        <Limite>
          Você pode marcar um bem de uso como parte da base, e o app deixa. Mas aí a sua data passa
          a assumir que você venderia a casa onde mora para se sustentar.
        </Limite>
      </Secao>

      {/* ------------------------------------------------------------------ */}
      {doc.idadeAlvo && idadeAtual !== undefined && doc.idadeAlvo > idadeAtual && (
        <Secao id="coast" titulo="CoastFIRE" pergunta="O que é 'poderia parar de aportar hoje'?">
          <p>
            É o patrimônio que, <strong>sem nenhum aporte novo</strong>, cresce sozinho até a meta
            no prazo que você quer. Passou desse ponto, o trabalho já está feito — só falta o tempo.
          </p>
          <Formula>Coast = M ÷ (1+i)ⁿ</Formula>
          <Prova
            linhas={[
              ['M — sua meta', formatBRLcompact(M)],
              [`n — meses até os ${doc.idadeAlvo} anos`, `${(doc.idadeAlvo - idadeAtual) * 12}`],
              ['Você tem hoje', formatBRLcompact(P)],
            ]}
            resultado={[
              'Precisaria ter hoje',
              formatBRLcompact(patrimonioCoast(M, i, (doc.idadeAlvo - idadeAtual) * 12)),
            ]}
          />
          <Limite>
            CoastFIRE assume que você continua cobrindo o próprio custo de vida com trabalho até a
            data. Não é aposentadoria — é só a parada dos aportes.
          </Limite>
        </Secao>
      )}

      {/* ------------------------------------------------------------------ */}
      <Secao id="alavancas" titulo="As alavancas (motor reverso)" pergunta="Como calculo 'quanto aportar a mais'?">
        <p>
          O motor normal responde <em>quando</em>. O reverso responde <em>o que mudar</em>: fixa o
          prazo que você quer e resolve cada variável isoladamente, com as outras congeladas em
          hoje.
        </p>
        <Formula>aporte: A = i · (M − P(1+i)ⁿ) ÷ ((1+i)ⁿ − 1)</Formula>
        <p className="pf-metodo-nota">
          <strong>Retorno</strong> e <strong>gasto</strong> não têm fórmula fechada — o motor acha
          por bisseção (60 iterações, precisão bem além do centavo), possível porque as duas funções
          são monótonas.
        </p>
        <p>
          A alavanca do gasto tem <strong>efeito duplo</strong>, e é por isso que cortar R$ 1 vale
          mais que aportar R$ 1: como a sua renda não mudou, o que deixa de ser gasto{' '}
          <strong>vira aporte</strong>; e como você passa a precisar sustentar menos, a{' '}
          <strong>meta cai junto</strong>, na mesma proporção.
        </p>
        <Limite>
          Duas premissas que você deve conhecer: (1) o corte de gasto assume{' '}
          <strong>renda constante</strong> — se você cortar e gastar em outra coisa, não vale;
          (2) a alavanca do retorno é a única que você não controla. Mais retorno vem com mais
          risco, e o mercado não assina contrato.
        </Limite>
      </Secao>

      {/* ------------------------------------------------------------------ */}
      <Secao id="cobertura" titulo="Cobertura passiva e taxa de poupança" pergunta="O que esses percentuais medem?">
        <Formula>cobertura = R ÷ C · taxa de poupança = (receita − despesa) ÷ receita</Formula>
        <Prova
          linhas={[
            ['R — sua renda passiva mensal', formatBRL(R)],
            ['C — seu custo de vida', formatBRL(C)],
          ]}
          resultado={['Cobertura passiva', C > 0 ? formatPct(R / C) : '—']}
        />
        <p className="pf-metodo-nota">
          Cobertura é o número mais honesto do painel: quanto da sua vida <em>já</em> é paga por
          renda em vez de trabalho. 100% é o FIRE de fato, independente do que a data diga.
        </p>
        <Limite>
          A taxa de poupança sai do mês lançado, não de uma média. Um mês com 13º ou com uma compra
          grande distorce — o que importa é a linha ao longo dos meses.
        </Limite>
      </Secao>

      {/* ------------------------------------------------------------------ */}
      <Secao id="inss" titulo="A estimativa do INSS" pergunta="Aquele valor é confiável?">
        <p>
          É <strong>estimativa simplificada</strong>, e a mais frágil do app — está sinalizado no
          próprio card. Usamos as constantes de 2026 (teto{' '}
          <Mono>{formatBRL(INSS_2026.teto)}</Mono>, piso <Mono>{formatBRL(INSS_2026.piso)}</Mono>) e
          a regra de transição por idade mínima.
        </p>
        <Limite>
          O cálculo oficial considera <strong>todas</strong> as suas contribuições desde jul/1994,
          corrigidas — nós usamos o seu salário atual como proxy da média, o que superestima quem
          ganhou menos no passado e subestima quem ganhou mais. Não consideramos tempo especial,
          rural, concomitância nem as regras de pedágio. O número oficial só existe no{' '}
          <a href="https://meu.inss.gov.br" target="_blank" rel="noreferrer">Meu INSS</a>. Use o
          nosso para ter ordem de grandeza, nunca para decidir.
        </Limite>
      </Secao>

      {/* ------------------------------------------------------------------ */}
      <Secao id="economico" titulo="Os indicadores do Banco Central" pergunta="De onde vêm Selic, IPCA e o juro real?">
        <p>
          Direto da API pública do BACEN (sistema SGS), com cache diário no seu navegador. Séries
          usadas: <Mono>432</Mono> Selic meta, <Mono>433</Mono> IPCA mensal, <Mono>4390</Mono> Selic
          acumulada no mês, <Mono>188</Mono> INPC.
        </p>
        {ind && (
          <Prova
            linhas={[
              ['Selic meta (foto de hoje)', ind.selicMeta !== null ? formatPct(ind.selicMeta / 100, 2) : '—'],
              ['IPCA acumulado em 12 meses', ind.ipca12m !== null ? formatPct(ind.ipca12m / 100, 2) : '—'],
              [
                'Juro real médio de 10 anos',
                typeof ind.juroRealHistorico === 'number' ? formatPct(ind.juroRealHistorico / 100, 1) : 'não disponível',
              ],
            ]}
            resultado={['Sua projeção, para comparar', formatPct(rAnual)]}
          />
        )}
        <p className="pf-metodo-nota">
          O card compara sua projeção com a <strong>média de 10 anos</strong>, nunca com a Selic de
          hoje. Comparar uma média de décadas com a foto de um instante empurraria você a subir a
          expectativa justamente em pico de ciclo — que é quando subir é mais perigoso.
        </p>
        <Limite>
          Um código de série errado não quebra nada: devolve os números de outra coisa. Por isso o
          app cruza as séries entre si (a Selic realizada em 12 meses tem que bater com a meta) e
          descarta o histórico se não bater. Um robô no repositório refaz essa checagem toda semana.
        </Limite>
      </Secao>

      {/* ------------------------------------------------------------------ */}
      <Secao id="importador" titulo="Como leio extratos e faturas" pergunta="Como o app decide o que é entrada e o que é saída?">
        <p>
          O arquivo é lido <strong>no seu navegador</strong> — ele não sobe para servidor nenhum. Só
          os lançamentos que você aprovar são salvos. Não há adaptador por banco: separador,
          codificação, cabeçalho e formato de data são descobertos por heurística, e o que o parser
          entendeu aparece na tela antes de qualquer coisa ser gravada.
        </p>
        <p>A direção do valor segue esta ordem, e quando ela não conclui, o app pergunta:</p>
        <ul className="pf-metodo-lista">
          <li>coluna crédito/débito, ou OFX → o sinal é lei</li>
          <li>sinais mistos num extrato → negativo é saída</li>
          <li>sinais mistos numa fatura → o sinal da <strong>maioria</strong> é compra (estorno é minoria)</li>
          <li>tudo negativo → saída, em qualquer convenção</li>
          <li><strong>tudo positivo sem contexto</strong> → o app assume que não sabe e pergunta</li>
        </ul>
        <p className="pf-metodo-nota">
          Contra duplicata, cada lançamento ganha uma impressão digital{' '}
          <Mono>data | valor | estabelecimento</Mono> (mais o FITID, quando o OFX traz). Reimportar o
          mesmo arquivo não duplica nada. E "pagamento de fatura" no extrato vem desmarcado, porque
          essas compras já entram pelo arquivo da fatura.
        </p>
        <Limite>
          O dicionário de categorias cobre o que é repetitivo no Brasil. O que ele não reconhece fica{' '}
          <strong>sem categoria</strong> e pergunta — em vez de empurrar tudo para "Outros" e o
          número virar ficção.
        </Limite>
      </Secao>

      {/* ------------------------------------------------------------------ */}
      <Secao id="verificacao" titulo="Como isso é verificado" pergunta="Quem garante que as contas estão certas?">
        <p>
          O motor é uma biblioteca pura, sem interface e sem banco, coberta por testes que rodam a
          cada publicação — <strong>build vermelho não vai pro ar</strong>. Não são testes de
          "roda sem erro": são <strong>invariantes</strong>, do tipo que quebra se a matemática
          estiver errada.
        </p>
        <ul className="pf-metodo-lista">
          <li>aplicar a resposta de qualquer alavanca devolve <strong>exatamente</strong> o prazo pedido</li>
          <li>o valor futuro no prazo calculado bate com a meta, ao centavo</li>
          <li>real ↔ nominal ida e volta reproduz o número original</li>
          <li>casos de borda (i ≈ 0, meta inalcançável, P ≥ M) devolvem resposta honesta, nunca NaN</li>
          <li>o comparador à vista × parcelado é invariante ao capital inicial escolhido</li>
          <li>o importador é testado com arquivos nos formatos que os bancos realmente exportam</li>
        </ul>
        <Limite>
          Teste prova que o código faz o que a fórmula diz. Não prova que a fórmula descreve o seu
          futuro — nenhuma descreve.
        </Limite>
      </Secao>

      {/* ------------------------------------------------------------------ */}
      <Secao id="dados" titulo="Onde ficam os seus dados" pergunta="Quem enxerga o que eu lanço?">
        <p>
          Tudo fica sob a sua conta, e as regras do banco de dados só permitem que{' '}
          <strong>você</strong> leia e escreva sob o seu próprio identificador — não é uma promessa
          de tela, é uma regra no servidor. Extratos importados são processados no navegador.
        </p>
        <p className="pf-metodo-nota">
          Pelo Perfil você pode <strong>exportar tudo</strong> em JSON, <strong>zerar</strong> os
          lançamentos mantendo a conta, ou <strong>excluir a conta</strong> inteira (LGPD).
        </p>
        {snapshots.length > 0 && (
          <Prova
            linhas={[
              ['Meses que você registrou', `${snapshots.length}`],
              ['Bens cadastrados', `${bens.length}`],
            ]}
            resultado={['Tudo isso é seu', 'exportável e apagável a qualquer momento']}
          />
        )}
      </Secao>

      <p className="pf-hint" style={{ marginTop: 'var(--space-8)', textAlign: 'center' }}>
        Achou um erro numa conta? Manda pelo balão de feedback — número errado aqui é o pior tipo de
        bug que este produto pode ter.
      </p>
    </main>
  );
}

// ---------------------------------------------------------------------------

function Secao({
  id,
  titulo,
  pergunta,
  children,
}: {
  id: string;
  titulo: string;
  pergunta: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="pf-metodo-secao">
      <h2>{titulo}</h2>
      <p className="pf-metodo-pergunta">{pergunta}</p>
      {children}
    </section>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return <div className="pf-formula mono">{children}</div>;
}

function Mono({ children }: { children: ReactNode }) {
  return <code className="pf-metodo-code mono">{children}</code>;
}

/** O bloco que diferencia esta página de um PDF: os números de quem está lendo. */
function Prova({ linhas, resultado }: { linhas: [string, string][]; resultado: [string, string] }) {
  return (
    <div className="pf-prova">
      <div className="pf-prova-titulo">com os seus números</div>
      {linhas.map(([rot, val]) => (
        <div key={rot} className="pf-prova-linha">
          <span>{rot}</span>
          <strong className="mono">{val}</strong>
        </div>
      ))}
      <div className="pf-prova-linha resultado">
        <span>{resultado[0]}</span>
        <strong className="mono">{resultado[1]}</strong>
      </div>
    </div>
  );
}

/** O que a conta NÃO diz — a seção que dá credibilidade às outras. */
function Limite({ children }: { children: ReactNode }) {
  return (
    <div className="pf-limite">
      <span className="pf-limite-rot">o que isso não diz</span>
      <p>{children}</p>
    </div>
  );
}
