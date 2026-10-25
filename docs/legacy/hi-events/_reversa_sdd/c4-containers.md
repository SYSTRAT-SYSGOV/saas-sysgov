# C4 Model — Diagrama de Containers (Nível 2)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Fonte Técnica**: `docker/development/docker-compose.dev.yml`, `backend/routes/api.php`, `frontend/src/entry.server.tsx`

---

## 1. Visão Geral dos Containers

O sistema Hi.Events é desacoplado em serviços conteinerizados independentes, operando com arquitetura híbrida de renderização do lado do servidor (SSR) no frontend e uma API REST robusta estruturada com Domain-Driven Design no backend.

```mermaid
C4Container
    title Diagrama de Containers - Hi.Events (Nível 2)

    Person(user, "Usuários da Plataforma", "Compradores, participantes, organizadores e administradores.")

    Container_Boundary(c0, "Plataforma Hi.Events") {
        Container(nginx, "Reverse Proxy / SSL", "Nginx (Alpine)", "Ponto de entrada de tráfego, terminação SSL, roteamento e cache de assets estáticos.")
        
        Container(frontend_app, "Frontend Web App (SSR)", "React 18, TypeScript, Mantine UI, Vite SSR", "Interface responsiva de alta performance com renderização híbrida do lado do servidor e hidratação do cliente.")
        
        Container(backend_api, "Backend Core API", "PHP 8.2, Laravel (DDD)", "Processamento de regras de negócio, emissão de pedidos, segurança, permissões e endpoints REST.")
        
        Container(queue_worker, "Queue Worker / Schedulers", "Laravel Horizon / Artisan Worker", "Processamento assíncrono de jobs, disparo de e-mails transacionais e checagens anti-spam.")

        ContainerDb(pgsql, "Banco de Dados Principal", "PostgreSQL 15", "Armazenamento relacional com transações ACID de contas, eventos, pedidos, ingressos e assentos.")
        
        ContainerDb(redis, "Cache & Fila em Memória", "Redis (Alpine)", "Armazenamento temporário de sessões, cache de consultas de alta frequência e filas assíncronas de background.")
        
        ContainerDb(storage, "Object Storage", "MinIO / AWS S3", "Repositório de mídias de eventos, assets públicos e documentos privados.")
    }

    System_Ext(stripe, "Stripe Gateway", "Serviço externo de pagamentos e liquidação financeira.")
    System_Ext(mailpit, "Serviço de E-mail (Mailpit / SMTP)", "Servidor para entrega transacional de mensagens.")

    Rel(user, nginx, "Acessa via navegador / terminal", "HTTPS / 443, 8443")
    Rel(nginx, frontend_app, "Roteia requisições de páginas SSR e assets", "HTTP / 5678")
    Rel(nginx, backend_api, "Roteia requisições de API REST (/api/*)", "HTTP / 1234")
    
    Rel(frontend_app, backend_api, "Consome API no SSR e no cliente", "HTTPS / JSON via React Query")
    
    Rel(backend_api, pgsql, "Lê e grava dados relacionais", "TCP / 5432 (PostgreSQL PDO)")
    Rel(backend_api, redis, "Grava cache de entidades e enfileira jobs", "TCP / 6379 (RESP)")
    Rel(backend_api, storage, "Faz upload de imagens e faturas", "S3 Protocol / 9000")
    Rel(backend_api, stripe, "Cria sessões e Payment Intents", "HTTPS / REST")
    
    Rel(queue_worker, redis, "Consome tarefas pendentes da fila", "TCP / 6379")
    Rel(queue_worker, pgsql, "Atualiza status assíncronos de transações e e-mails", "TCP / 5432")
    Rel(queue_worker, mailpit, "Dispara mensagens transacionais", "SMTP / 1025")
    Rel(stripe, backend_api, "Envia webhooks de pagamento", "HTTPS / Webhook")
```

---

## 2. Detalhamento Tecnológico dos Containers 🟢

### 2.1 `frontend` (SSR Web Application)
- **Tecnologia**: React 18, TypeScript, Vite, Mantine UI, Lingui i18n.
- **Modos de Operação**:
  - `dev:ssr` (Porta 5678): Renderização do lado do servidor para SEO e otimização de tempo de carregamento de páginas públicas de eventos.
  - `dev:csr` (Porta 5678): Modo alternativo Client-Side Rendered com suporte a hot reload para desenvolvimento rápido.
- **Gestão de Estado**: React Query (`@tanstack/react-query`) para requisições de dados e cache assíncrono. Isolamento de contexto no SSR garantido por `AsyncLocalStorage` (`utilites/ssrRequestContext.ts`).

### 2.2 `backend` (Core API)
- **Tecnologia**: PHP 8.2+, Laravel 10/11 com Domain-Driven Design (DDD).
- **Estruturação**:
  - Camada de Transporte: `BaseAction` e helpers de resposta padronizados.
  - Camada de Aplicação: DTOs (`BaseDataObject`), Handlers e Domain Services.
  - Camada de Acesso a Dados: Repositórios encapsulando Eloquent (`runQuery()`).
- **Segurança**: Políticas RBAC via atributos `#[RequiresPermission]`, autenticação por tokens Sanctum e cookies HttpOnly seguros.

### 2.3 `queue_worker` (Background Processing)
- **Tecnologia**: Laravel Queue / Horizon sobre Redis.
- **Responsabilidades**:
  - Envio de e-mails transacionais via classes filhas de `BaseMail` (com garantia de `afterCommit()`).
  - Inspeção e despacho de verificações anti-spam (`EventSpamCheckDispatchService`).
  - Webhooks de sincronização de dados e expiração de reservas abandonadas.

### 2.4 `pgsql` (Relational Database)
- **Tecnologia**: PostgreSQL 15.
- **Isolamento**: Banco operacional principal (`hievents`) e banco dedicado e isolado de testes de integração (`hievents_test`).
- **Padrão de Migração**: Migrations anônimas com integridade referencial via chaves estrangeiras e deleção lógica (`softDeletes`).

### 2.5 `redis` (Cache & Queue Broker)
- **Tecnologia**: Redis Alpine.
- **Responsabilidades**: Broker de mensagens de alta performance para o driver de filas do Laravel e cache temporário de configurações globais e flags de licença corporativa.

### 2.6 `minio` / Object Storage
- **Tecnologia**: MinIO S3-compatible storage.
- **Buckets Criados**:
  - `hievents-public`: Acesso anônimo de leitura para fotos de capa, logotipos e avatares.
  - `hievents-private`: Acesso estritamente autenticado para relatórios, comprovantes fiscais e backups.
