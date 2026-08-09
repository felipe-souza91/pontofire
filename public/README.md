# `/public` — Hosting (landing + painel + app)

Este diretório é o que o **Firebase Hosting** serve (`firebase.json` → `hosting.public: "public"`).

## Layout

```
public/
  index.html      landing (SEO)          ← ENTREGUE AVULSO PELO DONO — falta versionar
  painel.html     admin da waitlist       ← ENTREGUE AVULSO PELO DONO — falta versionar
  favicon.svg     chama (§12)             ← ENTREGUE AVULSO PELO DONO — falta versionar
  preview.png     Open Graph 1200×630     ← ENTREGUE AVULSO PELO DONO — falta versionar
  404.html        opcional
  ferramentas/    calculadoras públicas (SEO) — M9
  app/            BUILD do React/Vite (gerado por `npm run build`) — NÃO versionar
```

## Ação pendente do dono

Os arquivos marcados acima **existem em produção** mas foram entregues fora do repo.
Copie-os para dentro de `public/` e faça commit para que a landing/painel fiquem
versionados. Só então o `firebase deploy --only hosting` reflete o repositório.

## Notas

- `public/app/` é **saída de build** (Vite compila para cá com `base: '/app/'`) e está no
  `.gitignore`. Não editar à mão.
- O rewrite `"/app/**" → /app/index.html` (SPA) já está no `firebase.json`; a landing e
  `/ferramentas` continuam servidas como estáticos na raiz (bom para SEO).
- Ao versionar a `index.html`/`painel.html`, alinhe as cores aos tokens do design system
  (`app/src/theme/tokens.css`) para manter unidade visual.
