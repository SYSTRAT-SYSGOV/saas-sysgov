# C4 Model — Diagrama de Componentes (Nível 3)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Fonte Técnica**: `backend/app/Http/Actions/`, `backend/app/Services/Domain/`, `backend/app/Repositories/`

---

## 1. Visão Geral dos Componentes do Backend (Core API)

O container `backend` do Hi.Events segue rigorosamente uma arquitetura orientada a domínio (Domain-Driven Design), com separação estrita de responsabilidades em camadas e fluxo unidirecional:
**Action (Transporte/HTTP) → Handler (Coordenação de Caso de Uso) → Domain Service (Lógica de Domínio) → Repository (Persistência / Eloquent)**.

```mermaid
C4Component
    title Diagrama de Componentes - Backend API (Nível 3)

    Container_Boundary(b1, "Backend Laravel Core (DDD)") {
        Component(actions, "HTTP Actions", "PHP / BaseAction", "Pontos de entrada REST. Validam inputs via DTOs e retornam respostas unificadas (resourceResponse, jsonResponse).")
        
        Component(auth_guard, "Guarda de Acesso & Permissões", "Sanctum & #[RequiresPermission]", "Intercepta requisições verificando permissões granulares e aplicando restrições de leitura/escrita.")

        Component(handlers, "Command & Query Handlers", "Application Handlers", "Orquestram o fluxo de execução entre múltiplos domínios para atender um caso de uso específico.")

        Component(order_service, "Order Domain Service", "Domain Service", "Controla o ciclo de vida de pedidos, reservas de ingressos, expiração de timers e emissão.")
        
        Component(payment_service, "Payment Domain Service", "Domain Service (Stripe)", "Comunica-se com gateways de pagamento, gerencia Payment Intents e valida webhooks de liquidação.")

        Component(seating_service, "Seat Claim Service", "Domain Service (EE Seating)", "Garante o bloqueio atômico de assentos e cálculo de status em tempo de execução (HELD, SOLD, BLOCKED).")

        Component(spam_checker, "Anti-Spam & Security Service", "Domain Service", "Valida textos públicos de eventos, higieniza HTML via HtmlPurifier e inspeciona novos cadastros.")

        Component(financial_redactor, "Financial Redactor", "Domain Service", "Oculta valores financeiros de respostas da API para usuários sem permissão VIEW_FINANCIALS.")

        Component(repos, "Repositories", "Doctrine/Eloquent Encapsulation", "Isola todas as queries de banco de dados. Executa queries via runQuery() com suporte a soft-deletes seguros.")
    }

    ContainerDb(pgsql, "PostgreSQL Database", "PostgreSQL 15", "Tabelas relacionais.")
    ContainerDb(redis, "Redis Cache / Queues", "Redis", "Fila de processamento e cache.")
    System_Ext(stripe, "Stripe API", "Gateway de pagamentos.")

    Rel(actions, auth_guard, "Valida autenticação e autorização", "PHP Internal")
    Rel(actions, handlers, "Encaminha DTO validado", "Method Call")
    Rel(handlers, order_service, "Executa regras de pedido", "Method Call")
    Rel(handlers, payment_service, "Inicia processo de pagamento", "Method Call")
    Rel(handlers, seating_service, "Reserva assentos", "Method Call")
    Rel(handlers, spam_checker, "Verifica conformidade de conteúdo", "Method Call")
    
    Rel(order_service, repos, "Persiste estado de pedidos", "Method Call")
    Rel(payment_service, stripe, "Cria intents / reembolsos", "HTTPS")
    Rel(payment_service, repos, "Persiste status de transação", "Method Call")
    Rel(seating_service, repos, "Aloca assento atômico", "Method Call")
    
    Rel(actions, financial_redactor, "Sanitiza recursos de saída", "Resource Filter")
    Rel(repos, pgsql, "Executa SQL via PDO", "SQL")
    Rel(order_service, redis, "Dispara eventos e jobs", "Redis Queue")
```

---

## 2. Descrição Detalhada dos Componentes Chave 🟢

### 2.1 Camada de Ações HTTP (`Http Actions`)
- **Herança**: Todas as ações estendem `BaseAction`.
- **Regra de Retorno**: Nunca retornam diretamente `response()->json()` ou instâncias diretas de `JsonResponse`. Em vez disso, utilizam métodos helper padronizados:
  - `resourceResponse()`: Formatação estruturada de entidades via Resources do Laravel.
  - `jsonResponse()`: Dados avulsos ou operações de sucesso simples.
  - `errorResponse()`: Respostas formatadas de erro padronizadas.
  - `deletedResponse()`: Confirmação de exclusão idempotente.
- **Divisão de Rotas**: Um endpoint por ação física (Single Action Controllers). Ações públicas utilizam o sufixo `*Public` e recursos que omitem campos confidenciais internos (como `location_id` ou identificadores sensíveis).

### 2.2 Camada de Segurança e Autorização (`Access & Permissions`)
- **Inspeção de Permissão**: Utilização de atributos PHP 8 `#[RequiresPermission(Permission::...)]` ou chamadas a `isActionAuthorized()` e `isOrganizerReadAuthorized()`.
- **Proteção contra Escrita Não-Autorizada**: Usuários com perfil `VIEWER` (somente leitura) recebem imediatamente `HTTP 403 (READ_ONLY_ROLE)` em requisições de mutação (POST, PUT, PATCH, DELETE), a menos que a rota seja explicitamente liberada por `#[AllowedForReadOnlyUsers]`.
- **Escopo Rígido de Entidades Filhas**: Todo lookup de chave estrangeira em rota ou payload (ex: `order_id`, `product_id`, `template_id`) é estritamente validado sob o escopo do identificador pai autorizado (`event_id` ou `organizer_id`), respondendo 404/422 em caso de divergência antes de qualquer efeito colateral.

### 2.3 Camada de Serviços de Domínio (`Domain Services`)
- **Regras Imutáveis**:
  - `OrderService`: Coordena criação e conclusão de pedidos. Garante que contadores de afiliados, uso de códigos promocionais e métricas agregadas de volume de produto (`products.sales_volume`) só sejam computados quando `isOrderCompleted()` for verdadeiro.
  - `StripePaymentService`: Gerencia Payment Intents e webhooks de confirmação. Registra taxas de plataforma e taxas de aplicação (`OrderApplicationFee`).
  - `SeatClaimService`: Gerencia reservas atômicas de assentos. Status de assentos (`HELD`, `SOLD`, `BLOCKED`) e de ocorrência (`SOLD_OUT`) são exclusivamente calculados em tempo de execução, sem persistência fixa em tabelas de sincronização.
  - `EventSpamCheckDispatchService`: Higieniza textos com `HtmlPurifierService` e bloqueia termos suspeitos via `PersonNameRule`.

### 2.4 Camada de Repositórios (`Repositories`)
- **Isolamento do ORM**: Eloquent é estritamente confinado dentro de Repositórios. Handlers e Services interagem com dados através de contratos de repositório e DTOs tipados.
- **Operações Críticas**:
  - Métodos customizados de consulta são encapsulados em `runQuery()`.
  - Atualizações em entidades com deleção lógica utilizam `incrementEach()` e `decrementEach()` para evitar falhas silenciosas ou exceções de runtime em linhas com soft-delete.
