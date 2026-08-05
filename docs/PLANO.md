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
| Entradas | `categoria` livre + `tipo` **fechado** (ativa/passiva/aporte/saída) — cobertura passiva depende. |
| Calculadoras | **Públicas na landing (SEO) + no app.** |
| Monetização | **Freemium**, gateway **Stripe + extensão Firebase**; beta 100% grátis (gate desligado). |
| INSS | **Estimativa simplificada honesta**; constantes 2026 em config atualizável; link Meu INSS. |
| Econômico | **Cloud Function diária** → doc `indicadores` (BACEN SGS); client lê cacheado. |
| Feedback | **Mão única** + agradecimento automático; surface no painel. |
| Onboarding | **2 níveis** (aha <60s → enriquecimento); humanização como gatilhos do motor. |

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
- `entryTypes/{uid}/itens/{id}`: tipos de entrada personalizados (rótulo + `tipo` subjacente).
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
  `entryTypes`, `assets`, `goals`, `achievements`, `invites`).
- `feedback`: create por usuário logado; read/update/delete negados (só admin via console/painel).
- `indicadores`: read liberado (logado); write negado (só Admin SDK da function).

## Status (atualizado)
✅ **M0** fundação · ✅ **M1** motor · ✅ **M2** auth + onboarding humanizado + perfil ·
✅ **M3** Início · ✅ **M4** lançar/detalhado/bens · ✅ **M6** INSS + econômico (client-side) ·
✅ **M7** insights in-app (**push só com Blaze**) · ✅ **M8** gamificação/viral/feedback ·
✅ **M9** calculadoras · ✅ **M11** polish/QA + LGPD. 118 testes verdes.
⏳ Faltam: **M5** importador · **M10** monetização (Blaze).

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
- **M5 — Importador:** OFX + 3-5 CSV; UI de **revisão em lote**; memória memo→categoria; dedupe
  fatura×extrato.
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

## Fase 2 / Backlog (fora do MVP)
Simulador "e se", goal-seek (motor reverso), Monte Carlo/faixa de confiança, "suas alavancas",
trilhas Lean/Fat/Coast/Barista, mais adaptadores de import, QR NFC-e, LLM p/ reescrita de insight e
categorização de comerciante desconhecido (com guardrails), "você há 1 ano", **plano de liquidação de
bem (downsize):** vender casa/bem e liberar equity → parte do valor vira investível na base do FIRE.

## Pendências de input do dono (não travam o design; necessárias na implementação)
- Preço do Pro (a testar). · `messagingSenderId` + VAPID key. · Confirmar código INPC no SGS.

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
