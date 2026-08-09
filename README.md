# Ponto FIRE

Plataforma web/PWA que calcula, mês a mês, a **data exata da independência financeira**
("quando eu fico livre?") — voltada ao investidor.

- Produto: [`docs/BRIEF.md`](docs/BRIEF.md) (fonte da verdade)
- Plano de construção (MVP): [`docs/PLANO.md`](docs/PLANO.md)

## Estrutura (monorepo, um site de Hosting)

```
public/          landing + painel (vanilla, SEO) + build do app em public/app (gerado)
app/             React + Vite (SPA, PWA) atrás de /app/ — login e produto
packages/        libs TS puras: engine (motor §6), insights, importer  (M1+)
firebase.json    Hosting (rewrites SPA) + Firestore rules/indexes
firestore.rules  regras de segurança (waitlist + app por uid)
```

## Rodar o app

```bash
npm install                 # instala workspaces
cp app/.env.example app/.env.local   # preencher com a config web do Firebase
npm run dev                 # Vite dev server (app em /app/)
npm run build               # compila para public/app
npm run typecheck           # checagem de tipos
```

Config do Firebase (projeto `firefinances-4b65f`) fica em `app/.env.local` — ver
`app/.env.example`. Não são segredos, mas ficam fora do git para o dono preencher.

## Deploy

Hosting e regras são versionados aqui, mas **o deploy é decisão do dono**. A waitlist já está
em produção com regras publicadas fora deste repo — reconciliar `firestore.rules` e testar no
emulador antes de `firebase deploy`.
