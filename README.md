# Money for Nothing — Kurio

Marketplace de NFTs desenvolvido para o [Frontend Challenge da Jungle Gaming](https://github.com/junglegaming/frontend-challenge).

Stack: React, TypeScript strict, TanStack Router/Query, Axios, Tailwind CSS, shadcn/ui, MSW e Socket.IO.

## Executar

Requisitos: Node.js >=24.15 e <25, com npm.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:5173. O simulador vem habilitado; carteiras e pagamentos são fictícios.
Para configurar o ambiente, copie [.env.example](.env.example) para `.env.local`. Definir `VITE_ENABLE_MOCKS=false` exige API e servidor Socket.IO compatíveis.

Para conferir a build de produção:

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

## Demonstração

- Login: `collector@kurio.test` ou `nova@kurio.test`, senha `Kurio2026!`.
- Cupom: `KURIO10` concede 10% de desconto.
- `/simulation`: controla falhas, preço, estoque, sessão e pedidos; permite reiniciar os dados.
- O estado fica no IndexedDB por navegador/origem e é compartilhado entre abas.

## Verificar

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run test:visual
```

As referências visuais e a CI usam Windows/Chromium. Preserve a fidelidade aos frames aprovados de `Frontend Challenge.fig` e os assets originais.

`npm run assets:optimize` gera as variantes responsivas das artes e o relatório local em `.cache/artwork-optimization.json`.

## Referências

- [Arquitetura](ARCHITECTURE.md).
