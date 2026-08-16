# Plano — a data viva

> Status: **implementado** (Fases 0 a 4), mais o backlog do beta:
> calculadora "quando parar de amortizar", marcos de patrimônio em valor
> real e reserva de emergência.
> Segue valendo como registro das decisões e das perguntas em aberto.
> Origem: feedback dos primeiros usuários do beta (ago/2026).

## O problema

A data FIRE sai de `custoVidaMensal` e `aporteMensal` do perfil, digitados uma
vez no onboarding. Os meses lançados não a alimentam. Um usuário pode lançar um
ano inteiro de dados reais e a data nunca refletir nenhum deles.

Um usuário perguntou direto: *"o ponto FIRE é recalculado após o lançamento de
cada mês?"* A resposta honesta hoje é "só o patrimônio".

## A decisão

A data passa a responder ao que o usuário viveu. O medo de "data que dança"
se resolve não travando o número, mas **explicando o movimento**.

### Três datas, não uma

| | O que é | Muda? |
|---|---|---|
| **Partida** | calculada no onboarding, congelada com as premissas | nunca |
| **Ritmo real** | recalculada com o que foi lançado | todo mês |
| **Plano** | a data se o usuário cumprisse o que declarou | quando ele muda o plano |

O número grande da tela passa a ser o **ritmo real**, com a variação desde a
partida logo abaixo. O "−4 anos desde que você começou" é a prova de que o app
funciona.

### O mundo observa, você declara

| Variável | Fonte | Por quê |
|---|---|---|
| Patrimônio | observado | já é assim |
| Custo de vida | **observado** | ninguém *planeja* gastar; gasta |
| Aporte | **observado manda na data**, declarado vira meta | ver abaixo |
| Retorno real | declarado | 6 meses de mercado não dizem nada sobre 20 anos |

O aporte declarado deixa de mover a data e vira **compromisso**. A distância
entre "pretendo R$ 2.000" e "aportei R$ 1.600" é uma alavanca, não um erro.

**Recálculo é automático, nunca opcional.** Se depender de o usuário clicar
"adotar", ele só clica quando a notícia é boa — e o app vira bajulador.

---

## Modelo de dados

### `users/{uid}` — campos novos

```ts
/**
 * Congelada no fim do onboarding. Guarda as PREMISSAS junto com a data —
 * sem elas não dá pra distinguir "melhorou porque você aportou mais" de
 * "melhorou porque você baixou a meta".
 */
linhaDePartida?: {
  em: string;                 // YYYY-MM-DD
  custoVidaMensal: number;
  aporteMensal: number;
  patrimonioInicial: number;
  retornoRealEsperado: number;
  metaFire: number;
  taxaSaqueSegura: number;
  mesesAteFire: number | null;
  origem: 'onboarding' | 'reconstruida';
};

/**
 * A meta é DERIVADA do custo vigente por padrão (25× o custo anual).
 * `true` = o usuário travou num valor fixo e o app avisa quando divergir.
 */
metaTravada?: boolean;
```

**Por que a meta passa a ser derivada:** com o custo virando observado, uma meta
manual congela. O custo sobe, a meta não acompanha, e **a data melhora quando o
gasto piora** — o oposto da verdade, calculado com precisão. É o bug já
existente (`Perfil.tsx:48` carrega `doc.metaFire` num campo editável que nunca
se recalcula), que o modelo novo agravaria.

### `snapshots/{uid}/meses/{YYYY-MM}` — campos novos

```ts
observacao?: string;      // "carro quebrou", "entrou PPR"
atipico?: boolean;        // sai da mediana
aporteObservado?: boolean;// false/ausente = derivado (meses legados)
mesesAteFire?: number;    // a data calculada NAQUELE mês
taxaInvestimento?: number;// aporte / receita
```

`aportesMes` muda de significado: era `receita − despesa`, passa a ser digitado.
`aporteObservado` distingue os dois — sem isso não dá pra saber se o histórico
é fato ou inferência.

### O residual

`receita − despesa − aporte` **não é gravado e não entra em cálculo nenhum**.
É dinheiro sem destino: sobrou e não virou patrimônio. Aparece na tela, nomeado,
e o motor ignora.

Duas taxas, duas verdades:

| | Fórmula | Mede |
|---|---|---|
| Taxa de poupança | `(receita − despesa) / receita` | quanto você não consumiu |
| Taxa de investimento | `aporte / receita` | quanto virou patrimônio |

A diferença entre elas é o vazamento — o modo de falhar mais comum de quem
tenta juntar dinheiro: economiza de verdade, o dinheiro fica na conta corrente
e some no trimestre. Hoje o app é cego pra isso.

**§14:** a sobra nem sempre é vazamento (pode ter ido pra reserva, pra amortizar
dívida, ou ser erro de digitação). O app aponta e pergunta. Só vira insight
depois do padrão se repetir.

---

## Motor (`packages/engine`)

### `vigente.ts` — o que vale hoje

```ts
/** Mediana dos últimos N meses lançados, ignorando os atípicos. */
export function valorVigente(
  snapshots: readonly SnapshotBase[],
  campo: 'gastoTotal' | 'aportesMes',
  opcoes: { janela: number; minimo: number; declarado: number },
): { valor: number; fonte: 'observado' | 'declarado'; mesesUsados: number };
```

- **Mediana, não média:** um mês de reforma não pode reescrever a rotina.
- **Janela de 6:** em 3 anos a vida muda; custo de 2026 não descreve 2029.
- **Mínimo de 3:** abaixo disso usa o declarado e o app **diz** que está usando.
- Para `aportesMes`, meses com `aporteObservado !== true` não contam (são
  derivados, não observados). `gastoTotal` sempre foi entrada real e conta.

### `decomposicao.ts` — por que a data mudou

```ts
/** Atribui a variação em meses a cada variável. Soma exatamente ao total. */
export function decomporVariacao(
  antes: EstadoFire,
  depois: EstadoFire,
): { variavel: 'patrimonio'|'aporte'|'custo'|'retorno'; meses: number }[];
```

**Método: valor de Shapley.** Com 4 variáveis são 2⁴ = 16 avaliações de
`mesesAteFire` (barato) e o resultado é independente da ordem e **soma exato**.
A alternativa óbvia — substituir uma variável de cada vez — depende da ordem
escolhida e deixa resíduo.

⚠️ **Caso a tratar:** se alguma coalizão der `inalcancavel`, o valor é infinito e
o Shapley quebra. Precisa de um horizonte-teto ou de reportar
"não decomponível" honestamente. Não inventar número.

Sem decomposição, "sua data andou 2 meses" é ansiedade. Com ela, é diagnóstico.

---

## Telas

### `MoedaInput` — máscara odômetro

Reescrita. Campo mostra `0,00`; os dígitos entram pela direita:

```
1 → 0,01      12 → 0,12      125 → 1,25      1250 → 12,50
```

- `inputMode="numeric"` (não `decimal` — não se digita vírgula)
- backspace desfaz um dígito
- colar e selecionar-tudo tratados
- **sempre 2 casas** — corrige a inconsistência atual (`value % 1 ? 2 : 0`
  mostra "8.000" e "8.000,50" no mesmo campo)

Custo aceito: R$ 8.000,00 vira `800000`, seis toques. Vale pela consistência com
os apps bancários e por eliminar a ambiguidade de hoje (`8000` = oito mil ou
oitenta reais?).

Um componente, oito telas: Lançar, Detalhar, Bens, Onboarding, LinhaImport,
LinhaTransacao, CalcAmortização, CalcNovaDívida.

### Onboarding — nenhum campo novo

1. `concluir()` grava também a `linhaDePartida`.
2. A tela de resultado passa de "sua data" para **"é daqui que você parte"**.
   Sem isso, o primeiro recálculo parece defeito — é literalmente o feedback
   recebido ("o card fica desatualizado").
3. O campo do aporte: *"Quanto você **pretende** investir por mês?"*
4. O passo da meta some ou vira informativo (a meta passa a ser derivada).

### Lançar — 3 campos → 4 + contexto

| Campo | Hoje | Novo |
|---|---|---|
| Patrimônio total | ✅ | igual, **obrigatório** |
| Receita do mês | ✅ | igual, **obrigatório** |
| Despesa do mês | ✅ | igual, **obrigatório** |
| **Aporte do mês** | derivado | **digitado, obrigatório** |
| **Observação** | — | opcional |
| **Mês atípico** | — | marcador |

**Obrigatório mesmo que zero.** Hoje a validação é
`patrimonio > 0 && receita > 0` — despesa zero passa batido e vira fato.

⚠️ **Problema a resolver:** como distinguir "preenchi com zero" de "não
preenchi"? Proposta: campos nascem **vazios** com `0,00` de placeholder;
digitar `0` é resposta válida; salvar libera quando os quatro foram tocados.
Pro caso comum, um atalho *"não aportei"* que preenche zero num toque.

**Dica do campo patrimônio:**

> Some tudo que você tem investido — **incluindo a reserva de emergência**.
> Ela rende e é seu patrimônio. Mais pra frente a gente separa o que é reserva
> pra ajustar a meta.

A instrução explícita importa mais que qual das duas convenções é melhor: hoje
cada usuário responde de um jeito e o app não sabe qual. Dado ambíguo é pior que
dado simplificado.

*(Consequência assumida: a reserva é dinheiro carimbado, então a data vem um
pouco cedo. A correção certa é somar a reserva à meta — `M = C×12/TSS + reserva`
— não tirá-la do patrimônio. Fica pro item da reserva de emergência.)*

### Depois de salvar — a mudança maior

Hoje `salvar()` faz `navigate('/')` e nada se move. É o momento mais
anticlimático do app: o usuário reuniu os números e não ganha nada de volta.

```
Agosto lançado.

Sua data: setembro/2047        ← andou 2 meses pra frente

  +3 meses   seu gasto médio subiu R$ 420
  −1 mês     seu patrimônio rendeu acima do esperado

Desde a partida: 3 anos e 5 meses mais cedo.
```

**Regra de tom (§14):** data que atrasa chega sempre com três coisas juntas —
o que mexeu, quanto, e o que desfaz. Nunca "você gastou demais".

### Dashboard

- Número grande: data pelo ritmo real + variação desde a partida
- Gráfico da **data ao longo do tempo** (destravado por `mesesAteFire` no
  snapshot) — mostra trajetória, não posição
- Com menos de 3 meses: *"faltam 2 meses pra sua data começar a responder aos
  seus lançamentos"* — cria expectativa em vez de confusão
- Se o usuário marcar quase tudo como atípico: *"você marcou 5 dos últimos 6
  meses como atípicos — talvez o atípico seja o normal"*

---

## Migração dos usuários atuais

Os amigos que já testam **não têm linha de partida gravada**.

1. **Reconstruir uma vez**, de `patrimonioInicial` + perfil atual, com
   `origem: 'reconstruida'`. Só está certa se eles não mexeram no perfil desde
   o onboarding — a tela deve dizer que é aproximada. Quanto mais se espera,
   mais gente perde a partida real.
2. **Snapshots existentes:** `aporteObservado = false`. O aporte histórico deles
   é `receita − despesa`, e fingir que foi observado seria mentira. Consequência:
   até lançarem 3 meses no formato novo, o aporte vigente é o declarado.
3. **`metaTravada`:** quem já editou a meta à mão deveria começar travado, pra
   não ver o número mudar sozinho. Não temos como saber quem editou — proposta:
   travar quem tem `metaFire ≠ 25 × custoVidaMensal × 12` e avisar.

---

## Sequência de entrega

**Fase 0 — os bugs soltos** (independentes, algumas horas)
- "Marcos" no `BoasVindas.tsx:81` — reescrever a frase; varrer o app atrás de
  outros nomes próprios em início de frase
- Chips do import: `.pf-chip:hover` e `.pf-chip.on` usam a mesma cor de borda,
  então hover parece seleção (hipótese — confirmar com o usuário antes)
- `MoedaInput` odômetro

**Fase 1 — guardar** (sem mudança de comportamento, seguro)
- `linhaDePartida` no onboarding + migração
- `mesesAteFire` gravado a cada snapshot
- meta derivada + `metaTravada` (corrige o bug da meta desacoplada)

**Fase 2 — lançar** (muda a tela de Lançar)
- 4º campo, obrigatoriedade, observação, atípico
- residual e as duas taxas

**Fase 3 — recalcular** (o núcleo)
- `vigente.ts` + a data passando a sair do observado
- avisos da transição (menos de 3 meses, atípicos demais)

**Fase 4 — explicar**
- `decomposicao.ts`
- card depois de salvar, novo herói do dashboard, gráfico da data

Fases 1 e 2 podem ir ao ar sem a 3 — os dados começam a se acumular antes de
serem usados, o que encurta a espera dos 3 meses.

---

## Verificação

**Motor (invariantes, não "roda sem erro"):**
- a decomposição **soma exatamente** a variação total
- mediana ignora atípicos e é insensível a um outlier extremo
- menos de `minimo` meses → `fonte: 'declarado'`
- meta derivada acompanha o custo; travada não acompanha e é sinalizada
- máscara odômetro: sequência de dígitos → valor, incluindo backspace, colar e
  zeros à esquerda

**Manual (entra no `ROTEIRO-DE-TESTES.md`):**
- lançar 3 meses e ver a data sair do declarado pro observado
- marcar um mês como atípico e confirmar que a data volta
- usuário legado: partida reconstruída aparece marcada como aproximada

---

## Perguntas em aberto

1. **A partida expira?** Depois de 5 anos, comparar com o onboarding vira
   nostalgia? Proposta: manter pra sempre como linha de fundo no gráfico, mas a
   comparação em destaque passa a ser 12 meses móveis.
2. **Janela de 6 meses é a certa?** Escolha por julgamento, não por evidência.
   Vale revisitar com dados reais de uso.
3. **Retorno real declarado nunca se confronta com o observado?** Com 5+ anos de
   histórico dá pra dizer "você esperava 5% e realizou 3,8%". Fora deste escopo,
   mas o dado ficará disponível.
