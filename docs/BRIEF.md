# Ponto FIRE — Brief de Desenvolvimento (MVP)

> Documento de handoff para iniciar o desenvolvimento. Consolida as decisões de produto,
> escopo, arquitetura e o motor de cálculo. Não é transcrição — é a fonte da verdade do que construir.

---

## 1. O que é

**Ponto FIRE** é uma plataforma (web responsivo / PWA) que acompanha o patrimônio e a saúde
financeira do usuário e calcula, mês a mês, **a data exata em que ele atinge a independência
financeira** — o momento em que a renda passiva cobre o custo de vida e trabalhar vira opcional.

O diferencial central, que separa o Ponto FIRE de StatusInvest/Investidor10/MyProfit (rastreadores
de ativo) e de Mobills/Organizze (controle de gastos): **é o único que responde "quando eu fico
livre?"** — traduzindo números frios em decisões e em impacto de vida real.

Domínio: **pontofire.com.br** · Projeto Firebase: **firefinances-4b65f**

---

## 2. Decisões estratégicas (FECHADAS — não reabrir sem motivo forte)

- **Público-alvo é o investidor** (quem já poupa e investe, o "degrau 3": otimizar patrimônio e
  antecipar a liberdade). Toda a comunicação/marketing mira ele.
- **Controle de contas puro é feature secundária/orgânica.** Quem não investe pode usar pra
  organizar receitas/gastos, mas é usuário secundário que descobre isso sozinho — zero destaque
  na comunicação. Não virar "mais um app de controle de gastos".
- **Progressive disclosure no lançamento** (regra de ouro do produto):
  - **Modo rápido (padrão):** 3 números por mês — receita líquida, gasto total, investimento total.
    ~30 segundos e o Ponto FIRE já é calculado.
  - **Modo detalhado (opcional):** lançar entrada a entrada, saída a saída, investimento a
    investimento. Desbloqueia insights mais específicos.
  - **O detalhe é recompensa, não obrigação.** Ex.: o insight "seus dividendos deste mês já pagam
    sua conta de água" só é possível no modo detalhado — e isso é vendido como vantagem, não exigência.
- **Sem integração bancária no MVP.** Aggregadores (Pluggy ~R$2,5k/mês, Belvo ~R$6k/mês) são caros
  demais pra fase de validação e é o "cemitério" do setor (ver GuiaBolso). Entrada via manual +
  import de arquivo (OFX/CSV). QR Code de NFC-e fica pra v2 (melhor que OCR de foto).
- **Validação antes de escalar.** A landing/waitlist é teste de demanda; o desenvolvimento pesado
  se justifica com a conversão do público certo (ver §11). O MVP pode ser construído em paralelo,
  mas o go/no-go de investimento pesado depende do número.

---

## 3. Stack técnica

- **Landing page:** HTML/CSS/JS puro (leve, indexável — SEO importa pro funil). **JÁ EXISTE e está no ar.**
- **App:** Web responsivo como **PWA** (um só código, sem fricção de loja, push notification
  funciona em Android e iOS 16.4+). Flutter é opção do dono (ele domina), mas atenção: Flutter Web
  renderiza mal pra SEO — por isso a landing é separada, em web tradicional.
- **Backend:** Firebase — Firestore, Authentication (Google), App Check (reCAPTCHA **Enterprise**),
  Hosting. Cloud Functions (plano Blaze) apenas se necessário.
- **Dados econômicos:** API pública e gratuita do Banco Central (SGS) — sem chave. Ver §9.

### Infra já configurada
- Projeto Firebase `firefinances-4b65f`, Hosting com domínio `pontofire.com.br` (SSL automático).
- App Check com reCAPTCHA Enterprise ativo.
- Firestore em modo de produção (regras restritas — ver §5).
- Arquivos já entregues: `landing (index.html)`, `painel.html` (admin da waitlist),
  `favicon.svg`, `preview.png` (Open Graph 1200×630).

---

## 4. Telas do MVP

1. **Onboarding** — 4 perguntas: custo de vida mensal, patrimônio atual (ou import), meta FIRE
   (auto-sugere 25×), retorno real esperado. Coleta também nome + data de nascimento + início de
   contribuição + salário (para o módulo INSS). Alimenta todo o motor.
2. **Início (dashboard)** — patrimônio + evolução, **termômetro FIRE** (% do caminho), **contagem
   regressiva** até a liberdade, card de insight do assistente, taxa de poupança, cobertura de renda passiva.
3. **Lançar** — modo rápido (3 totais) por padrão + modo detalhado opcional. Import OFX/CSV.
   Categorização (necessária pra insights: "delivery", "streaming", "assinaturas" etc.).
4. **Metas & Conquistas** — meta principal + submetas, conquistas, streak de meses no azul, 3 convites (viral).
5. **Projeção / Simulador** — cenários "e se" (cortar gasto / aumentar aporte / mudar retorno) →
   como muda a data. Núcleo do plano pago.

Módulo transversal: **INSS vs. sua liberdade** (o "choque de realidade") — ver §8.

---

## 5. Modelo de dados (Firestore)

Coleções (o **snapshot mensal é o coração** — mesma lógica do dashboard pessoal que acumula snapshots):

```
users/{uid}
  nome, dataNascimento, inicioContribuicao, salario,
  custoVidaMensal, retornoRealEsperado, metaFire, taxaSaqueSegura (default 0.04),
  plano, criadoEm

snapshots/{uid}/meses/{YYYY-MM}     // fonte da verdade mensal
  patrimonioTotal, aportesMes, rendimentosMes,
  receitaLiquida, gastoTotal, investimentoTotal, taxaPoupanca

transactions/{uid}/itens/{id}       // OPCIONAL (modo detalhado)
  data, valor, tipo(entrada|saida|aporte|rendimento), categoria, descricao, origem(manual|import)

goals/{uid}/itens/{id}       tipo(principal|sub), alvo, prazo, progresso
achievements/{uid}/itens/{id}   conquistaId, desbloqueadoEm
invites/{uid}                codigo, convidadosConvertidos
```

**Regra crítica de modelagem (progressive disclosure):** o **total mensal é a fonte da verdade**;
o lançamento detalhado é uma *decomposição opcional* dele. Se o usuário lança detalhado, o app soma
os itens e trata como o mesmo campo do total — sem duplicar, sem brigar. Os dois modos têm que conversar.

### Waitlist (já em produção)
```
waitlist/{sha256(email)}     email, ref(codigo), referredBy, created
referrals/{codigo}           count            // contagem server-side (ou no painel via referredBy)
```
Dedupe sem leitura: ID do doc = hash SHA-256 do e-mail; `setDoc` sem merge → 2ª vez vira update → negado pelas regras.

### Regras de segurança (waitlist — já publicadas)
```
allow create: valida formato do email + created is timestamp
allow read: apenas UID do admin (painel)
allow update, delete: false
```

---

## 6. Motor de cálculo (a parte que tem que brilhar)

Variáveis:
```
P = patrimônio atual        A = aporte mensal
C = custo de vida mensal     R = renda passiva mensal atual
i = retorno REAL mensal       M = número FIRE (meta)     TSS = taxa de saque segura (ex. 0,04)
```

Fórmulas núcleo:
```
Meta (número FIRE):      M = C × 12 × (1 / TSS)          // TSS 4% → ×25
Progresso:               prog = P / M
Cobertura passiva:       cob = R / C                      // o "1/5 do salário" — número viciante
Taxa de poupança:        s = (receita − despesa) / receita

Tempo até a liberdade:   n = ln[ (M·i + A) / (P·i + A) ] / ln(1 + i)   // meses
Idade na liberdade:      idadeAtual + n/12
Renda ao atingir a meta: M × TSS / 12                     // saque mensal sustentável
```

CoastFIRE (insight poderoso):
```
P_coast = M / (1 + i)^(meses até idade-alvo)
Se P ≥ P_coast → já pode parar de aportar e ainda chega na meta só com juros.
```

Cenários "e se" (recalcular n mudando um parâmetro):
```
Cortar gasto g/mês:  A' = A + g   → Δmeses = n − n'
Aumentar retorno:    i' > i       → Δmeses
Custo de liberdade de um gasto pontual x:  valor_perdido = x × (1 + i)^(meses restantes)
```

**Duas regras inegociáveis (honestidade > hype):**
1. `i` é sempre **retorno REAL** (descontar inflação via IPCA da API). Projetar com nominal mente sobre a data.
2. Todo "e se investir a diferença" compara contra **renda fixa pós-IR** como piso. Nunca prometer
   retorno de bolsa como garantia. TSS de 4% é referência americana; no Brasil o juro real é maior,
   dá pra discutir taxa maior, mas ser conservador e avisar do risco de sequência de retornos.
3. O motor deve revelar a verdade mesmo quando é anticlímax: cortar algo de R$50/mês adianta ~meio
   mês; a alavanca real é taxa de poupança e retorno, não microcortes. Isso gera confiança.

---

## 7. O assistente (voz humanizada — diferencial de retenção)

Traduz número em vida real, chama pelo nome, tom de coach — não de contador. Princípios:

- **Comemore alto, alerte baixo, e todo alerta vem colado a uma ação — nunca julgamento puro.**
  - Bom: "O delivery está acima da média — se voltar ao normal, são ~R$1.900/ano rendendo pra você."
  - Ruim: "Cuidado com o tanto de iFood." (faz a pessoa se sentir mal → desinstala)
- Enquadramento de **progresso**, não de culpa. Mesmo dado, framing oposto, retenção oposta.
- **Racione a voz:** ~1 boa notificação por semana. Notificação demais = mute.
- Insights escalam com o detalhamento: macro ("seus rendimentos cobrem 18% do seu mês") no modo
  rápido; específico ("seus dividendos já pagam sua conta de água") no modo detalhado.

Gamificação: streak de meses no azul (dor de perder streak retém), conquistas ("primeira vez que o
rendimento passou a conta de luz"), 3 convites com conquista se converterem. Amarrar o jogo ao
**comportamento certo** (subir taxa de poupança, bater marco), não a vaidade.

---

## 8. Módulo INSS vs. Liberdade (o choque de realidade)

Compara dois futuros lado a lado: aposentadoria pelo INSS vs. o Ponto FIRE. Gancho emocional que
justifica o app. **É estimativa, não promessa** — exibir "estimativa" claramente e mandar conferir
no simulador oficial do Meu INSS.

Regras 2026 (para o cálculo estimado):
- Teto INSS: **R$ 8.475,55** · Piso (salário mínimo): **R$ 1.621,00**.
- Valor: **60% da média** de todas as contribuições desde jul/1994 **+ 2% por ano** acima de 20 anos
  (homem) / 15 anos (mulher).
- Aposentadoria por idade (regra permanente, quem entrou após nov/2019): mulher 62 / homem 65;
  15 (m) / 20 (h) anos de contribuição.
- Regras de transição (quem já contribuía antes de nov/2019) em 2026: idade progressiva
  (~mulher 59a6m / homem 64a6m) ou por pontos (mulher 93 / homem 103). Detectar pelo início de contribuição.

O "golpe" emocional: por mais que a pessoa ganhe, o INSS paga no máximo ~o teto — não sustenta o padrão de quem ganha acima disso.

---

## 9. Camada de dados econômicos (gratuita)

API pública do Banco Central (SGS) — sem chave, sem custo:
```
https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/{N}?formato=json
```
Séries: Selic meta `432` · Selic efetiva `11` · CDI `12` · IPCA `433` · IGP-M `189` · TR `226`
· INPC (confirmar código no catálogo SGS, provavelmente `188`).

Uso: cron diário (Cloud Function ou client cacheado) grava o último valor. Habilita avisos
contextuais: "o INPC acumulou X% — seu aluguel pode reajustar ~R$Y na renovação"; "a Selic caiu pra
X% — sua renda fixa rende menos". **O app informa o indicador e o impacto mecânico; não dá
recomendação de investimento** (evitar risco regulatório CVM).

---

## 10. Monetização (free vs. pago)

Âncora grátis fisga; profundidade é paga.

| Grátis (o gancho) | Pago (a profundidade) |
|---|---|
| Patrimônio + evolução + termômetro FIRE | Simulador de cenários "e se" |
| Lançamento manual + import básico | Motor de insights contextuais do assistente |
| 1 meta + conquistas básicas | Metas múltiplas, histórico longo, trilhas Lean/Fat/Coast/Barista |

O "estou evoluindo?" é grátis. A inteligência que responde "e quando chego lá / o que muda se eu
cortar X" é o que a pessoa paga.

---

## 11. Landing / Waitlist (JÁ NO AR) e critério de validação

A landing é teste de demanda. Critério definido **antes** de olhar o resultado (não racionalizar depois):
- **Tráfego:** parceria/endosso de criador FIRE ou conteúdo próprio. **Nunca anúncio pago** nesta
  fase (é o invalidador da tese — sem orçamento pra CAC).
- **Conversão visita → e-mail:** < ~15% com público qualificado = a promessa não pegou, revisar
  mensagem antes de construir. > ~30% = sinal verde forte.
- **Volume mínimo:** algumas centenas de visitas qualificadas.
- Amigos/família que se inscrevem por afeto são **ruído** — separar da métrica.

Sinal parcial até agora: 2 investidores do nicho entenderam e a mensagem fez sentido; leigos
("não guardam dinheiro") não são público e o "não entendi" deles é esperado.

**Gargalo real do projeto = distribuição/canal**, não a página nem o app. Priorizar como levar a
página a investidores que o dono não conhece.

---

## 12. Design system

Cores (dark, "noite institucional índigo" + chama âmbar como único ponto quente; verde = dinheiro/liberdade):
```
--ink:#0C0F2E  --ink-2:#141838  --ink-3:#1C2150
--ember:#FF7A45  --ember-2:#FF9E6B  --ember-deep:#E85A2A
--mint:#3FD69B   --paper:#F5F4FB   --muted:#A2A7CC
--line:rgba(255,255,255,.09)  --line-2:rgba(255,255,255,.15)
```
Tipografia: **Fraunces** (display/emocional, serifa) · **Instrument Sans** (corpo) ·
**Space Mono** (números/labels — dá aspecto de "dado calculado", ecoa o motor).

Logo — chama padronizada (SVG, use em logo, favicon, ícone). Gradiente `#FFB27A → #FF7A45 → #E85A2A`:
```svg
<!-- corpo -->
<path d="M50 6 C 47 34, 73 42, 73 76 C 73 101, 61 120, 50 120 C 39 120, 27 103, 27 78 C 27 59, 44 53, 45 30 C 45.5 21, 48 12, 50 6 Z"/>
<!-- brilho interno (fill #FFD9B8) -->
<path d="M53 52 C 51 67, 62 71, 62 87 C 62 101, 55 111, 49 111 C 43 111, 38 102, 38 91 C 38 81, 47 77, 47 65 C 47 60, 51 55, 53 52 Z"/>
```
Na web, a chama tem brilho cintilante leve (flicker de vela) via CSS, respeitando `prefers-reduced-motion`.
Tom de copy: aspiracional e direto, **sem promessa de retorno** (produto financeiro → confiança converte).

---

## 13. Prioridade de construção sugerida

1. **Onboarding + motor de cálculo** (§6) — é o coração; sem ele nada faz sentido.
2. **Dashboard (Início)** com termômetro + contagem regressiva + cobertura passiva.
3. **Lançar** (modo rápido primeiro; detalhado depois) + reconciliação total↔detalhe.
4. **Módulo INSS** (§8) e camada de dados econômicos (§9).
5. **Assistente/insights** (§7) — o diferencial de retenção.
6. **Metas, conquistas, convites** (gamificação).
7. **Simulador "e se"** (plano pago).

---

## 14. O que NÃO fazer

- Não prometer retorno de bolsa como garantia; projeções sempre em retorno real e comparadas à renda fixa pós-IR.
- Não moralizar gasto ("iFood é ruim"); informar o trade-off, o usuário decide.
- Não usar enquadramento de culpa nos alertas (aumenta churn).
- Não integrar banco no MVP (custo + é o cemitério do setor).
- Não diluir o posicionamento pra agradar o não-investidor (mira estreita, funil largo).
- Não construir features em cima de dados que o usuário não forneceu (respeitar o modo rápido).
- Tratar e-mails/dados como dado pessoal sob LGPD.

---

## 15. Contexto do dono

Analista de sistemas (Oracle PL/SQL), técnico, detalhista e exigente, prefere feedback direto e
honesto. Ponto FIRE faz parte de um ecossistema maior (livro, canais, dashboard próprio de carteira).
É o próprio usuário-alvo (perfil FIRE). Espera que erros sejam apontados sem rodeios.
```
```
