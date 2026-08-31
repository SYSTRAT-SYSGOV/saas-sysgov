# ADR-0006 — Navegação e Menus 100% no Backend (Anti-Spoofing)

- **Status:** Aceito (implementado)
- **Data:** 31/08/2026
- **Decisores:** Arquitetura de Software SYSTRAT

## Contexto

Versões legadas permitiam que o frontend enviasse listas de módulos e permissões
desejadas no corpo da requisição de montagem da sidebar, criando vulnerabilidade
para injeção e adulteração de navegação (*UI Spoofing*) por usuários maliciosos.

## Decisão

Refatorar `ClientNavigationController::navigation()` para **ignorar integralmente
qualquer parâmetro de permissão ou módulo enviado pelo cliente HTTP**. A árvore de
navegação é construída exclusivamente pelo `ClientNavigationService` no backend a
partir das permissões reais validadas no banco e do escopo da unidade do usuário.

- O catálogo de menus é extraído dinamicamente de `client_menu_groups` e
  `client_menu_items`.
- Arrays estáticos de fallback foram eliminados.
- A sidebar e a autorização por URL usam o **mesmo critério** (sem divergência).

## Consequências

- ✅ Eliminação definitiva de vetores de spoofing na interface.
- ✅ Sincronização em tempo real entre itens do menu e rotas efetivamente acessíveis.
- ✅ Impossível forçar menu via payload.

## Alternativas consideradas

- **Validação de payload no frontend** — rejeitado pela facilidade de manipulação
  via DevTools ou requisições cURL manuais.