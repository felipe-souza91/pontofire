# Roteiro de testes — Ponto FIRE

Bateria manual antes de abrir o beta. Os 230 testes automáticos cobrem **lógica pura**
(motor, importador, insights). Não cobrem nada do que está aqui: renderização, navegação,
Firebase, PWA e arquivos de banco reais.

**Marcados com ⚠️ são os que eu nunca consegui testar** — ou porque dependem de dado real,
ou porque o ambiente de desenvolvimento não alcança o serviço. São os de maior risco.

Sugestão: rode em **duas passadas** — uma no desktop, uma no celular. Anote o que quebrar
com print; o balão de feedback dentro do app já registra a rota e a versão.

---

## A. Onboarding (refeito recentemente — risco alto)

Comece com **conta nova** ou depois de um reset (§J).

- [ ] A tela de consentimento diz "10 perguntas" e o botão Começar avança
- [ ] **Barra de progresso** muda de laranja pra verde ao sair da pergunta 4 pra 5
- [ ] Contador "n/10" bate com a pergunta em que você está
- [ ] Passos 1–4 e 10 mostram "pular esta"; os de número (5–9) **não** mostram
- [ ] Pergunta 5 usa seu nome: *"Agora os números, Felipe…"*
- [ ] Deixar o **custo de vida em zero** trava o botão Continuar
- [ ] "Voltar" preserva o que você já digitou
- [ ] Na pergunta 9, a sugestão de meta = custo × 300 (25 anos); editar o valor faz a sua meta valer
- [ ] **A tela da data aparece** e NÃO some sozinha ⚠️ *(era o bug que o salvamento único criou)*
- [ ] A data mostra idade ("aos 59 anos") se você informou nascimento
- [ ] O nome do sonho aparece na tela da data

### Apresentação (roda uma vez)
- [ ] Os 5 slides avançam e voltam; os pontinhos acompanham
- [ ] O **Início real aparece desfocado atrás** do card
- [ ] "pular" fecha e não volta a aparecer ao recarregar
- [ ] No último slide, as 3 opções levam pra `/lancar`, `/importar` e pro Início
- [ ] Perfil → "ver a apresentação do sistema de novo" faz ela voltar

---

## B. Início

- [ ] A data bate com o que apareceu no fim do onboarding
- [ ] Termômetro: o % da barra bate com `patrimônio ÷ meta`
- [ ] **Com nenhum mês lançado**: card de evolução aparece compacto, com moldura tracejada — *não* como caixa vazia gigante
- [ ] **Com 1 mês lançado**: mesma coisa, texto muda pra "seu 1º mês está registrado"
- [ ] **Com 2+ meses**: o gráfico aparece, com rótulos no eixo Y e marcas no X
- [ ] Nº **ímpar** de cards de estatística → o último ocupa a linha inteira, sem buraco
- [ ] As duas colunas começam e terminam alinhadas (desktop)
- [ ] **Cenário econômico** ⚠️ — confira se aparece a linha *"Juro real médio dos últimos 10 anos"*. Ela deve mostrar **≈ 4,0% a.a.** (é o valor que o CI apurou). Se não aparecer, o app não conseguiu falar com o BACEN
- [ ] Cada número do card econômico tem seu período embaixo ("meta de hoje", "últimos 12 meses")
- [ ] **Card da semana** aparece e o rodapé diz "muda toda segunda"
- [ ] Link "como calculo isso →" no card da data, do INSS e do econômico

### Meta de idade / alavancas
Precisa de nascimento + idade alvo preenchidos.
- [ ] Se sua data chega **antes** da idade alvo → card verde comemorando
- [ ] Se chega **depois** → aparecem as 3 alavancas
- [ ] "Gastar menos" leva o selo **menor esforço** e o valor é menor que o de "aportar mais"
- [ ] A alavanca de retorno traz o aviso de risco
- [ ] A última linha oferece a saída sem culpa

---

## C. Lançar

- [ ] Salvar um mês com patrimônio, receita e despesa
- [ ] Aporte derivado = receita − despesa
- [ ] Taxa de poupança = (receita − despesa) ÷ receita
- [ ] Lançar um **2º mês** → o rendimento aparece (saldo − saldo anterior − aportes)
- [ ] A lista "Meses lançados" mostra os dois; clicar num deles carrega os valores
- [ ] Detalhar um mês: adicionar despesa, receita, renda passiva e aporte
- [ ] A reconciliação mostra "não categorizado" corretamente
- [ ] Renda passiva lançada aparece como **cobertura passiva** no Início
- [ ] Remover um item recalcula a reconciliação

---

## D. Importar ⚠️ **(nunca testei com arquivo real — maior risco da lista)**

Baixe do seu banco: **um OFX** e **um CSV**. Teste os dois.

- [ ] O quadro "O que eu entendi do arquivo" aparece antes de qualquer coisa ser salva
- [ ] Formato, codificação e formato de data estão corretos
- [ ] No CSV, a linha "Colunas" aponta pras colunas certas
- [ ] O período detectado bate com o extrato
- [ ] **Os valores batem com o extrato** — confira 3 ou 4 lançamentos na mão
- [ ] Entradas e saídas estão do lado certo
- [ ] Se o arquivo for de fatura com tudo positivo e você **não** declarar o tipo → aparece o card laranja pedindo ajuda, com os 3 botões em lote
- [ ] Declarar "Fatura de cartão" no passo 1 faz esse card sumir
- [ ] "Pagamento de fatura" no extrato vem **desmarcado** com a tag *transferência*
- [ ] Aplicação/resgate vem desmarcado e classificado como **aporte**
- [ ] Categorias reconhecidas fazem sentido (iFood → Delivery, posto → Transporte…)
- [ ] O que não reconheceu ficou **sem categoria**, não empurrado pra "Outros"
- [ ] Categorizar um item aplica aos iguais e mostra "aplicado também a N lançamentos"
- [ ] Editar data e valor no expandir (▾) funciona
- [ ] Salvar → **importar o MESMO arquivo de novo** → tudo vem desmarcado com a tag *já importado* ⚠️ *(é o teste de dedupe, o mais importante daqui)*
- [ ] Na 2ª importação de um arquivo diferente, o que você categorizou antes já vem classificado *(a memória)*
- [ ] Importar pra um mês **não lançado** → o aviso aparece dizendo que os itens ficam guardados

---

## E. Bens

- [ ] Adicionar um bem financeiro → entra na base do FIRE e a data muda
- [ ] Adicionar um imóvel **de uso** → entra no patrimônio líquido, **não** na base do FIRE
- [ ] Adicionar imóvel **de renda** com aluguel → o aluguel vira cobertura passiva
- [ ] Dívida associada abate do patrimônio líquido
- [ ] Marcar `incluirNoFire` num bem de uso dispara o aviso honesto
- [ ] Remover um bem recalcula tudo

---

## F. Calculadoras

- [ ] **Juros compostos**: confira um caso na mão
- [ ] **Etanol ou gasolina**: 70% da gasolina → "tanto faz"
- [ ] **À vista × parcelado**: com cashback e várias opções de parcela; o gráfico aparece e a barra do PIX cresce
- [ ] **Cabe no meu orçamento?** — parcela pequena → verde; parcela maior que a sobra → "não cabe" e diz quanto cortar
- [ ] O atraso na data cresce quando você aumenta a parcela ou o prazo
- [ ] Informar o preço à vista revela a taxa embutida
- [ ] **Amortizar financiamento**: Price tem parcela fixa; SAC começa alta e cai
- [ ] Amortização extra em "reduzir prazo" antecipa a quitação
- [ ] Em "reduzir parcela" o prazo fica igual e a parcela cai
- [ ] O card "amortizar ou investir" mostra a taxa do contrato **em juros reais** (menor que a nominal que você digitou)

---

## G. Metodologia

- [ ] Todos os links "como calculo isso →" caem na **seção certa**, já rolada
- [ ] Os blocos "com os seus números" mostram **os seus valores**, não exemplos
- [ ] O número FIRE calculado ali bate com o do painel
- [ ] O índice no topo navega
- [ ] Toda seção tem o bloco "o que isso não diz"

---

## H. Celular ⚠️ **(menu novo)**

- [ ] Abaixo de ~820px o cabeçalho vira **sanduíche**; os links somem
- [ ] As 3 barras viram X ao abrir
- [ ] O painel fecha: ao tocar num link, com **Esc** (teclado) e **tocando fora**
- [ ] O menu tem 6 itens + Sair, e o Importar está lá
- [ ] Nenhuma tela tem **rolagem horizontal** — passe por Início, Lançar, Importar, Ferramentas, Metodologia
- [ ] Tabela do importador utilizável no celular
- [ ] Os gráficos não ficam esticados nem espremidos
- [ ] Campos de dinheiro abrem o teclado numérico

---

## I. PWA e rede

- [ ] Instalar o app (Adicionar à tela de início) — Android e iOS
- [ ] Abrir instalado: sem barra do navegador, ícone e nome certos
- [ ] Ficar **offline** e abrir: a casca carrega (os dados não, é esperado)
- [ ] Voltar online e recarregar: tudo volta
- [ ] Depois de um deploy novo, a página se atualiza sozinha *(o service worker recarrega)*
- [ ] ⚠️ **Aba anônima**: sabemos que o App Check/reCAPTCHA não funciona. Confirme que a mensagem de erro é compreensível e não uma tela branca

---

## J. LGPD — **destrutivo, deixe por último**

Faça numa **conta de teste**, não na sua.

- [ ] Perfil → Exportar dados: baixa um JSON com perfil, meses, itens e bens
- [ ] Abrir o JSON e conferir que os dados estão lá
- [ ] **Zerar lançamentos**: some tudo, a conta permanece, o onboarding volta
- [ ] **Excluir conta**: pede senha (ou reautentica no Google), apaga e desloga
- [ ] Tentar logar de novo com a mesma conta → é tratado como conta nova

---

## K. Casos-limite do motor (rápidos, no Perfil)

Edite os números no Perfil e volte ao Início.

- [ ] **Aporte = 0** com patrimônio pequeno → "sem data ainda", **não** um erro nem NaN
- [ ] **Patrimônio maior que a meta** → "Livre 🔥" / "você já chegou lá"
- [ ] **Retorno real = 0%** → a data ainda é calculada (fórmula linear)
- [ ] **Custo de vida muito alto** (ex.: R$ 200 mil) → meta gigante, mensagem honesta
- [ ] **Idade alvo menor que a atual** → o card de meta de idade some, sem quebrar
- [ ] Valores com centavos (47,90) são aceitos em todos os campos de dinheiro

---

## Como me reportar

Pro que quebrar, o mais útil é: **em que tela**, **o que você fez**, **o que esperava** e
**o que aconteceu** — com print. Se aparecer erro vermelho no console do navegador (F12 →
Console), a mensagem inteira ajuda muito.
