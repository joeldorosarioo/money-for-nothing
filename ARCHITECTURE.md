# Arquitetura

## Organização

```text
src/app/       composição, roteamento, providers e tokens
src/features/  funcionalidades com lógica, UI e testes próprios
src/shared/    contratos comuns, validação, dinheiro e primitivas de UI
src/mocks/     servidor simulado, persistência e protocolo
e2e/           jornadas entre features e regressão visual
```

A composição em `src/app` injeta adaptadores nas portas de `application`.
`types`, `rules` e `application` permanecem independentes de frameworks e adaptadores;
`shared` não importa features. As fronteiras são verificadas pelo ESLint.

No catálogo, no carrinho, no perfil, nas carteiras, na cotação, nos pedidos e na simulação, a composição injeta as APIs HTTP concretas nas telas;
seus tipos são inferidos das implementações. Os tipos de domínio permanecem independentes
dos adaptadores.

O serviço de compra recebe as funções de envio e consulta, a persistência e a classificação de falhas
pela composição, mantendo idempotência e recuperação sem depender dos adaptadores. O transporte é
agendado após o registro da chamada em andamento para permitir recuperação mesmo após falhas síncronas.

Em `live-updates`, a assinatura concreta em `api` concentra conexão, validação e ciclo de vida
do Socket.IO e usa o filtro puro de eventos em `rules`. A composição fornece a espera pela
ativação do simulador. A consulta de tipo de Socket evita que um import estático carregue
o transporte antes de o MSW interceptar WebSocket.

## Integração e inicialização

- REST usa Axios e MSW; contratos externos são validados com Zod nos adaptadores.
- Tempo real usa Socket.IO/Engine.IO com `@mswjs/socket.io-binding` sobre WebSocket interceptado.
- A UI pode renderizar durante o download do simulador, mas requests HTTP e conexões
  aguardam sua ativação. Engine.IO só é importado após o patch de WebSocket do MSW.

Antes de cada request ou conexão, `mocks/browser` reconfirma a ativação do worker para
suportar reinícios do worker. Isso depende do protocolo `MOCK_ACTIVATE`/`MOCKING_ENABLED`
do MSW 2.15, fixado no lockfile: revisar a integração ao atualizar a dependência e manter
`public/mockServiceWorker.js` como arquivo gerado.

## Consistência dos dados

- **Dinheiro:** o transporte envia ETH como string decimal; cálculos usam `bigint` em wei.
- **Sessão:** `SessionService` é a autoridade da identidade. Queries privadas e callbacks
  são isolados por usuário e geração; um 401 só expira o token que originou o request.
- **Carrinho e favoritos:** o merge do carrinho visitante é persistido e idempotente.
  Mutações do carrinho usam `expectedVersion`; respostas antigas não sobrescrevem versões
  novas. Favoritos reconciliam comandos otimistas independentes por NFT.
- **Cotação:** o servidor calcula itens, preços, desconto, taxa e validade de 60 segundos.
  Mudanças de carrinho, catálogo ou reconexão invalidam a cotação; o usuário solicita outra.
  Antes de reservar estoque, o servidor revalida a cotação e a conexão da carteira.
- **Compra:** `PurchaseService` persiste proprietário, chave de idempotência e payload antes
  do envio. Falhas ambíguas preservam a tentativa para recuperação após erro ou reload.
  O servidor consulta idempotência antes de revalidar a cotação; alterar o payload gera conflito.
- **Pedido:** reserva e criação são atômicas. Rejeição libera estoque; confirmação consome
  as quantidades compradas uma única vez. O recibo usa o snapshot imutável do pedido.

## Persistência e reconciliação

`withState` executa mutações síncronas em transações IndexedDB `readwrite`, sem `await`
dentro do mutador. Eventos só são publicados após a confirmação da escrita.

Eventos são invalidações versionadas; snapshots REST continuam sendo a autoridade dos dados.
O servidor filtra recursos privados por proprietário. O cliente exige handshake e descarta
outros proprietários, epochs antigos, IDs duplicados e versões regressivas por recurso/entidade.
Reconexões solicitam novos snapshots; polling complementa pedidos pendentes e `BroadcastChannel`
sincroniza mudanças e revogações entre abas.

## Interface e limites

Tokens e variantes de UI ficam em `src/app/styles.css` e `src/shared/ui`. Os testes ficam junto do código;
as jornadas e referências visuais aprovadas ficam em `e2e`.

O servidor é uma simulação local por origem, persistida no navegador. Não oferece segurança
de backend nem executa blockchain, assinatura criptográfica de carteira ou transferência de fundos.
