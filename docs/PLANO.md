# Ponto FIRE — Plano de Construção (MVP)

## Context
Ponto FIRE é uma plataforma web/PWA que calcula, mês a mês, a **data exata da independência
financeira** ("quando eu fico livre?") — voltada ao investidor. Diferencia-se de rastreadores de
ativo e apps de gasto por responder essa pergunta. O repositório está vazio (só `README.md`);
a **landing e o painel da waitlist já existem e estão no ar** no Firebase Hosting
(`firefinances-4b65f`, `pontofire.com.br`), mas ainda **não estão versionados neste repo** — o dono
os enviou avulsos. Este plano constrói o **app do MVP do zero** e organiza o repo, seguindo o brief
(`pontofirebrief.md`) como fonte da verdade de produto, mais as decisões abaixo, tomadas na conversa.

Decisão de rollout: **MVP completo antes de abrir o beta** (escolha do dono). Logo, a ordem abaixo é
por **dependência técnica**, não por fatias de lançamento. Mitigação da validação tardia: dogfooding
contínuo (o dono é o usuário-alvo).

## Decisões travadas
| Área | Decisão |
|---|---|
| Stack app | Web responsivo **PWA, React + Vite** (`vite-plugin-pwa`). Landing/painel seguem vanilla. Sem Flutter. |
| Push | **FCM dia-1**, modelo **híbrido** (digest semanal + eventos). iOS exige PWA instalado (16.4+). |
| Motor | Lib **TypeScript pura no client**, testável/offline. |
| Retorno | Usuário informa **real** direto; mostrar nominal implícito (IPCA). |
| Reconciliação | **Híbrido (c):** total é a verdade; itens abatem; sobra `não categorizado`. |
| Patrimônio | Nº único no onboarding; mensal por **marcação a mercado** (rendimento derivado). |
| Bens & FIRE | **Dois números:** *patrimônio líquido total* (todos os bens − dívidas, motivacional) × *patrimônio que sustenta o FIRE* (só o que **rende e é sacável** → alimenta `P`). Registra-se **todo bem** (casa, carro, sítio, imóvel de renda) com valor + dívida associada. **Imóvel/sítio de renda:** aluguel líquido entra como **renda passiva `R`** (adianta o FIRE de verdade). **Bem de uso** (casa própria, carro): entra no net worth, **fora da base do FIRE por padrão**. Toggle `incluirNoFire` livre, mas com **aviso honesto** do assistente ao marcar bem de uso (§6/§14). |
| Auth | **Google + e-mail/senha** (Apple dispensado). App Check reCAPTCHA Enterprise reusado. |
| Inteligência | **Motor de REGRAS** determinístico (não LLM). LLM no máx. reescreve fato aprovado (fase 2). |
| Importador | **OFX + 3-5 adaptadores CSV**; revisão em lote; memória memo→categoria; dedupe fatura×extrato. |
| Entradas | `categoria` livre + `tipo` **fechado** (ativa/passiva/aporte/saída) — cobertura passiva depende. *(`entryTypes` foi removido: com `categoria` já em texto livre, "tipos de entrada personalizados" virou redundante. Nunca teve implementação — era andaime nas regras e na limpeza LGPD.)* |
| Calculadoras | **Públicas na landing (SEO) + no app.** |
| Monetização | **Freemium**, gateway **Stripe + extensão Firebase**; beta 100% grátis (gate desligado). |
| INSS | **Estimativa simplificada honesta**; constantes 2026 em config atualizável; link Meu INSS. |
| Econômico | **Cloud Function diária** → doc `indicadores` (BACEN SGS); client lê cacheado (hoje roda no client com cache diário). **Foto × média:** todo número do card diz de que período fala, e a projeção do usuário (média de décadas) é comparada com o **juro real médio de 10 anos**, nunca com a Selic de hoje — senão o card empurraria a subir a expectativa justamente em pico de ciclo. |
| Feedback | **Mão única** + agradecimento automático; surface no painel. |
| Onboarding | **Fluxo contínuo de 10 perguntas** — primeiro quem é (nome, nascimento, porquê, sonho, idade alvo), depois os números; a data no fim. Grava numa escrita só. *(Antes eram 2 níveis com um botão "Personalizar" no meio; o corte matava o embalo.)* |
| Metodologia | Rota **atrás do login** (`/metodologia`) — decisão do dono: o método não vai pro público. Como está logada, ela faz o que uma página estática não faria: substitui **os números do próprio usuário** em cada fórmula. Toda seção termina em **"o que isso não diz"** — as limitações são o que dá credibilidade ao resto. Três portas: link `como calculo isso →` no rodapé dos cards (ancorado na seção certa), link no Perfil, e a URL. **Não** no balão de feedback: ele é mão-única, outro trabalho. |
| Pós-onboarding | **Apresentação** de 5 slides por cima do Início real, terminando em "como quer começar?" → lançar na mão / importar / só olhar. `tourVisto` no doc; dá pra rever pelo Perfil. |

## Precisão do motor (regras de implementação)
- `i` real mensal `= (1+real_anual)^(1/12) − 1`; real de nominal `= (1+nom)/(1+ipca) − 1` (composto).
- Fórmulas núcleo §6: `M=C×12/TSS`, `prog=P/M`, `cob=R/C`, `s=(rec−desp)/rec`,
  `n=ln[(M·i+A)/(P·i+A)]/ln(1+i)`, CoastFIRE, custo de oportunidade.
- Fallback `i≈0`: `n=(M−P)/A`. Meta inalcançável → mensagem honesta (não NaN). `P≥M` → "já está lá".
- Aporte fim de mês (parametrizável). `rendimentoMes = P_hoje − P_anterior − aportesMes`.
- **Base do FIRE = patrimônio investível** (bens com `geraRenda`/sacáveis + os marcados `incluirNoFire`),
  **não** o net worth total. Aluguel/arrendamento líquido soma em `R` (não aplicar TSS ao valor do
  imóvel de renda — seria dupla contagem com o aluguel). `patrimonioLiquido = Σ(bens) − Σ(dívidas)`.

## Arquitetura & layout do repo (monorepo, um Hosting site)
```
/public/                 landing + painel (vanilla, SEO) — versionar os arquivos entregues
  index.html  painel.html  404.html  favicon.svg  preview.png
  ferramentas/           calculadoras públicas estáticas (SEO): juros, combustível, à vista×parcelado
/app/                    React + Vite (SPA, atrás de login) → build p/ /public/app
  src/  (routes, components, hooks, theme)
/packages/
  engine/                lib TS pura do motor (§6) + testes
  insights/              catálogo de regras (módulo compartilhado client ↔ functions)
  importer/              parser OFX + adaptadores CSV + dedupe + categorização
/functions/              Cloud Functions (Blaze): cron indicadores, push semanal, Stripe webhook
firebase.json  firestore.rules  firestore.indexes.json  .firebaserc
```
- **Hosting rewrites:** landing/ferramentas na raiz (estáticos, SEO); `"/app/**" → /app/index.html`
  (SPA). Vite `base:'/app/'`. Design system §12 (tokens CSS + chama SVG/`glow`) vira tema
  compartilhado.
- Calculadoras: versão pública vanilla (SEO) + versão React no app; fórmulas simples podem duplicar
  ou compartilhar um mini-módulo JS.

## Modelo de dados (Firestore) — §5 + adições
- `users/{uid}`: campos §5 + humanização (`apelido`, `porQue`, flags de consentimento) + `plano`.
- `snapshots/{uid}/meses/{YYYY-MM}`: fonte da verdade mensal (§5).
- `transactions/{uid}/itens/{id}`: modo detalhado; `tipo` fechado, `categoria` livre, `origem`.
- `assets/{uid}/itens/{id}`: bens do usuário — `nome`, `tipo` (`financeiro`/`imovel-uso`/`imovel-renda`/
  `veiculo`/`outro`), `valor`, `geraRenda`+`rendaMensal`, `dividaAssociada`, `incluirNoFire`. Motor lê só
  o que qualifica como investível; renda dos que alugam entra em `R`.
- `goals/…`, `achievements/…`, `invites/…` (§5).
- `feedback/{id}`: tipo, texto, contexto (rota/versão/plano), created — escrita user logado, leitura admin.
- `indicadores/{atual}`: últimos valores BACEN (escrita só pela function; leitura pública/logada).
- `waitlist`, `referrals`: já existem.

## Regras de segurança (a escrever)
- **Fix waitlist:** `allow read: if request.auth.uid == 'nzGPtwHhnzeHRBm6UT4EWFYsB5N2';`
- **App:** cada usuário só lê/escreve sob o próprio `uid` (`users`, `snapshots`, `transactions`,
  `assets`, `goals`, `achievements`, `invites`).
- `feedback`: create por usuário logado; read/update/delete negados (só admin via console/painel).
- `indicadores`: read liberado (logado); write negado (só Admin SDK da function).

## Status (atualizado)
✅ **M0** fundação · ✅ **M1** motor · ✅ **M2** auth + onboarding humanizado + perfil ·
✅ **M3** Início · ✅ **M4** lançar/detalhado/bens · ✅ **M6** INSS + econômico (client-side) ·
✅ **M7** insights in-app (**push só com Blaze**) · ✅ **M8** gamificação/viral/feedback ·
✅ **M9** calculadoras · ✅ **M11** polish/QA + LGPD · ✅ **M5** importador OFX/CSV.
166 testes verdes. ⏳ Falta só: **M10** monetização (depende do Blaze).

**Card da semana** (parte do M7): card único no Início que alterna toda segunda entre três famílias
— `retrato` (número do usuário ao lado de um dado público do Brasil), `dica` (tática com o número
dele dentro) e `humano` (o "por quê" que ele escreveu). Escolha determinística por
`semana + hash(uid)`: sem estado no Firestore e reaproveitável pela function do push semanal.
Os dados do país ficam em `packages/insights/src/brasil.ts`, **um por um com fonte, ano e link** —
**revisar anualmente**.

## Sequência de build (por dependência)
- **M0 — Fundação:** versionar landing/painel/config; scaffold React+Vite+PWA; tema compartilhado;
  init Firebase (Auth, Firestore, App Check); Hosting rewrites; fix regras waitlist + regras do app.
- **M1 — Motor + tipos:** `packages/engine` com todas as fórmulas §6 e edge cases + **testes
  unitários** (número a número). Tipos do modelo de dados. Helpers de retorno real/nominal.
- **M2 — Auth + Onboarding 2 níveis:** Google + e-mail/senha; N1 (aha <60s → motor → 1ª data) →
  N2 (nome/apelido, aniversário, dados INSS, "por quê"); consentimento LGPD; perfil.
  *Nota:* N1 coleta **5** campos, não 4 — o brief §4 lista custo/patrimônio/meta/retorno, mas sem
  **aporte mensal** o motor não fecha uma data (só cresceria o P parado). Aporte entra como pergunta
  rápida; consentimento LGPD é pré-requisito do N1 (guarda-se dado financeiro).
- **M3 — Dashboard (Início):** termômetro, contagem regressiva, cobertura passiva, taxa de poupança,
  evolução (snapshots), card de insight; atualização mensal marcação a mercado. Mostra os **dois
  números**: patrimônio líquido total × patrimônio que sustenta o FIRE.
- **M4 — Lançar + Bens:** modo rápido (3 totais) + detalhado + reconciliação híbrida; tipos de entrada
  personalizados (`categoria` livre + `tipo` fechado). **Registro de bens** (`assets`): casa/carro/sítio/
  imóvel de renda com valor + dívida; toggle `incluirNoFire` com aviso honesto ao marcar bem de uso;
  renda de aluguel/arrendamento vira `R` no motor.
- **M5 — Importador:** ✅ `packages/importer` (puro, 48 testes com fixtures anonimizadas).
  - **Sem adaptador por banco.** Em vez de uma lista que envelhece a cada mudança de layout, o
    parser descobre separador, codificação (UTF-8 → Windows-1252), cabeçalho (pulando lixo de
    rodapé/topo), papel de cada coluna e formato de data por heurística. O que ele entendeu vai
    pro diagnóstico na tela, e o usuário confere antes de salvar.
  - **Direção (entrada × saída)** — a decisão mais delicada, em `decidirPolitica`: coluna
    crédito/débito ou OFX ⇒ sinal é lei; sinais mistos num extrato ⇒ negativo é saída; sinais
    mistos numa fatura ⇒ o sinal da MAIORIA é compra (estorno é sempre minoria); tudo negativo ⇒
    saída; **tudo positivo sem contexto ⇒ o parser assume que NÃO sabe** e a revisão pergunta.
  - **Dedupe em 3 frentes:** FITID (OFX) e impressão digital `data|valor|estabelecimento` contra o
    que já está salvo — reimportar o mesmo arquivo é no-op; duplicata dentro do arquivo só avisa
    (compra repetida existe); **fatura×extrato** por detecção de "pagamento de fatura", que vem
    desmarcado pra não contar em dobro. Aplicação/resgate idem, mas classificados como `aporte`.
  - **Memória memo→categoria** em `importRules/{uid}/itens/{chave}`: o que o usuário aprovou vira
    regra e ganha do dicionário na próxima importação. Categorizar um item aplica aos iguais do
    mesmo arquivo que ainda estão sem categoria.
  - Campos novos e opcionais em `transactions`: `data` (YYYY-MM-DD), `impressao`, `fitid`.
  - **Não cria snapshot.** Import não inventa patrimônio: se o mês ainda não foi lançado no modo
    rápido, os itens ficam salvos e a tela avisa. O total continua sendo a verdade (§ híbrido).
  - O arquivo é lido **no navegador**; nada sobe pro servidor além do que for aprovado.
- **M6 — Econômico + INSS:** cron function → `indicadores`; módulo INSS (estimativa + config de
  constantes); alertas mecânicos.
- **M7 — Insights + push:** catálogo compartilhado (cards in-app) + function semanal + eventos;
  setup FCM (**precisa `messagingSenderId` + VAPID**); permissão pós-1º-valor + install iOS.
- **M8 — Gamificação + viral + feedback:** metas, conquistas, streak, 3 convites, **cards de marco
  compartilháveis**; feedback mão única + surface no painel.
- **M9 — Calculadoras:** públicas vanilla em `/ferramentas` (juros simples/compostos, combustível,
  à vista×parcelado) + versões no app.
- **M10 — Monetização (gate desligado):** extensão Stripe; entitlement `plano`; gating de features
  (beta = tudo liberado).
- **M11 — Polish/QA:** PWA offline, export de dados (LGPD), **excluir conta + todos os dados (LGPD)**,
  **resetar dados** (limpa lançamentos e reinicia onboarding), acessibilidade/`prefers-reduced-motion`,
  responsivo, deploy.
  - *Excluir conta (LGPD — requisito legal antes do beta público):* apagar tudo sob o `uid`
    (`users`, `snapshots/*/meses`, `transactions/*/itens`, `assets/*/itens`, `goals`, `achievements`,
    `invites`, `feedback` do usuário) **+** a conta no Auth. Subcoleções exigem **delete recursivo**
    (iterar no client, ou Cloud Function com Admin SDK `recursiveDelete`); `deleteUser` exige **login
    recente** (reautenticar) ou uma Function admin. Confirmar com dupla confirmação (digitar EXCLUIR).
  - *Resetar dados:* apaga `snapshots`/`transactions`/`assets` (mantém a conta) e zera
    `onboardingCompleto`/`onboardingNivel` → cai de volta no onboarding. Mais leve que excluir.

**Motor reverso / alavancas** (`packages/engine/src/alavancas.ts`, 25 testes) — estava no backlog de
fase 2 e foi puxado pra frente. Quando a data cai DEPOIS da `idadeAlvo`, o card "Sua meta de idade"
para de só constatar o atraso e responde **o que fecharia a diferença**, uma alavanca de cada vez
(as outras congeladas em hoje):
- **aporte**: forma fechada, invertendo o valor futuro — `A = i·(M − P(1+i)ⁿ)/((1+i)ⁿ − 1)`;
- **gasto**: bisseção, com **efeito duplo** — o corte vira aporte (a renda não mudou) *e* derruba a
  meta proporcionalmente. Por isso cortar sempre exige menos R$ do que aportar;
- **retorno**: bisseção no juro real anual (o VF é monótono em `i`), teto de busca 30%;
- **patrimônio hoje**: forma fechada, mantendo o aporte atual.

Status `drastica` (entre possível e impossível) para quando a resposta existe mas virou outra vida:
corte > 30% do padrão, retorno > 12% real a.a. (dobro do histórico BR), ou aporte > custo de vida.
Como a meta encolhe junto com o custo, **quase sempre existe** um corte que fecha — inclusive
absurdo; quem julga a viabilidade é `alavancasParaAlvo`, não `custoNecessario`.
**Invariante testado:** aplicar a resposta de qualquer alavanca em `mesesAteFire` devolve
exatamente o prazo pedido.

**Dívida × liberdade** (`packages/engine/src/financiamento.ts`, 33 testes) — duas ferramentas irmãs:
- **"Cabe no meu orçamento?"**: a parcela sai primeiro do APORTE (é o que sobra). Enquanto a dívida
  durar o aporte cai; quitada, volta. Esse degrau exige simulação mês a mês (fórmula fechada não
  aceita aporte variável) e produz o número que a ferramenta existe pra mostrar: **quanto a dívida
  adia a data**. Veredicto `cabe` / `aperta` / `nao-cabe`, comprometimento da renda e, se o usuário
  informar o preço à vista, a taxa embutida (reusa `taxaEmbutida`).
- **Amortização**: Price (`PMT = PV·i/(1−(1+i)⁻ⁿ)`) e SAC, com amortização extra em modo *prazo*
  (quita antes) ou *parcela* (alivia o mês).
- **Amortizar × investir** — a comparação que decide. **Armadilha registrada:** a taxa do contrato é
  NOMINAL e o retorno do usuário é REAL; comparar direto sempre conclui "amortize" (12% nominal com
  IPCA 4,5% é ~7% real). A simulação roda em termos nominais dos dois lados e deflaciona o resultado
  pra dinheiro de hoje. Os dois caminhos terminam no mesmo mês, o que os torna comparáveis.

## Próximos (combinados com o dono, ainda não construídos)
- **Gate do beta:** só entra quem se cadastrou na landing. O `waitlist/{sha256(email)}` já existe;
  a checagem por e-mail no login precisa de leitura própria do doc (regra nova) ou de um custom
  claim via function — **decidir qual quando o Blaze entrar**.

## Fase 2 / Backlog (fora do MVP)
Simulador "e se", goal-seek (motor reverso), Monte Carlo/faixa de confiança, "suas alavancas",
trilhas Lean/Fat/Coast/Barista, mais adaptadores de import, QR NFC-e, LLM p/ reescrita de insight e
categorização de comerciante desconhecido (com guardrails), "você há 1 ano", **plano de liquidação de
bem (downsize):** vender casa/bem e liberar equity → parte do valor vira investível na base do FIRE.

## Pendências de input do dono (não travam o design; necessárias na implementação)
- Preço do Pro (a testar). · `messagingSenderId` + VAPID key.

### Séries do BACEN — resolvido por CI, não por memória
Os códigos do SGS (432, 433, 188, 189, 4390) não podem ser confirmados do ambiente de
desenvolvimento (o proxy nega `api.bcb.gov.br` com 403). E um código errado é o pior tipo de bug
aqui: não quebra nada, só devolve **os números de outra coisa** dentro de um card com cara de
verdade. Então a verificação virou infraestrutura:

- **`.github/workflows/verificar-series.yml`** — roda no runner do GitHub (que alcança o BACEN),
  toda segunda, a cada push que toca `indicadores.ts`, e por botão em Actions. O relatório sai no
  **resumo do job**, legível no navegador.
- **`scripts/verificar-series.mjs`** — não pergunta "esta série é o INPC?" (o SGS não responde
  isso). Verifica por **comportamento e cruzamento**: a Selic 4390 composta em 12 meses tem que
  cair perto da meta 432; o INPC 188 em 12 meses tem que andar colado ao IPCA 433. Séries erradas
  não sobrevivem a esses dois testes. Rede fora ≠ falha: se nada responde, o job passa avisando.
- **No app**, o mesmo cruzamento roda em tempo real (`juroRealDoPeriodo`): se a Selic realizada
  destoar da meta em mais de 8 p.p., o histórico é descartado e o card cai no texto sem
  comparação. Protege o usuário entre uma rodada do CI e outra.

## Depende do plano Blaze (pendente — projeto ainda no Spark)
Cloud Functions exigem Blaze. **Não esquecer desta evolução.** O que fica esperando:
- **M6 — cron diário BACEN → `indicadores`** (hoje resolvido *client-side cacheado*, alternativa
  prevista no §9; migrar para a function quando houver Blaze: tira a chamada do client, centraliza
  cache e habilita histórico).
- **M7 — push (FCM)**: digest semanal e eventos precisam de function agendada.
- **M10 — webhook do Stripe** (extensão Firebase também exige Blaze).
- **M11 — exclusão de conta (LGPD)**: `recursiveDelete` no Admin SDK seria o caminho limpo; sem
  Blaze, dá pra fazer no client (mais lento e sem garantia atômica).

## Limitações conhecidas (monitorar no beta)
- **App Check em aba anônima / cookies de 3º bloqueados:** o reCAPTCHA Enterprise falha (403
  `appCheck/initial-throttle`) → com Firestore *enforced*, app e painel não carregam. Funciona
  normal em aba comum. Fatia pequena de usuários, mas real — avaliar tela amigável ou revisão do
  modo do App Check se incomodar.

## Verificação
- **Motor:** testes unitários cobrindo edge cases (i≈0, inalcançável, P≥M, real↔nominal).
- **Importador:** fixtures OFX/CSV anonimizados; caso fatura×extrato não duplica.
- **Regras:** testes do emulador Firestore (usuário só acessa o próprio `uid`; waitlist só admin).
- **E2E:** `vite dev` → onboarding N1 → data calculada → dashboard; lançar rápido → reconciliação;
  import → revisão → snapshot. Deploy em canal de preview do Hosting antes de produção.

## Git
Desenvolver na branch `claude/project-briefing-i8u1bu`; commits descritivos; push com `-u origin`.
