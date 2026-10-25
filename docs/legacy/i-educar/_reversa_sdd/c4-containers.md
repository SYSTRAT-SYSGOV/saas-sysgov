# Modelo C4 — Nível 2: Diagrama de Containers (Container Diagram)

> **Documento Gerado pelo Agente Architect (`reversa-architect`) — Reversa Framework**  
> **Sistema:** SYSGOV — Gestão Educacional Municipal (`SYS-Educa`)  
> **Padrão:** C4 Model (Containers Level) com Mermaid  
> **Status de Confiança:** 🟢 CONFIRMADO

---

## 1. Visão Geral dos Containers

A arquitetura do **SYS-Educa** adota o modelo de **Monólito Modular de Alta Eficiência** em Laravel 13 / PHP 8.3+, com interface rica em SPA React / TypeScript (Design System `@sysgov/ui`), persistência relacional transacional em **MySQL 8.0/8.4+ LTS**, cache e mensageria em **Redis**, armazenamento de artefatos em **S3/MinIO** e observabilidade ponta a ponta com **OpenTelemetry**.

---

## 2. Diagrama de Containers (Mermaid)

```mermaid
C4Container
    title Diagrama de Containers — SYSGOV: SYS-Educa

    Person(usuario_web, "Usuários Administrativos & Docentes", "Navegadores Desktop / Tablets (SEMED, Escolas, Professores)")
    Person(usuario_cidadao, "Cidadãos & Responsáveis", "Smartphones / PWA Mobile (Portal da Família)")

    Container_Boundary(c_spa, "Camada de Apresentação (Frontend)") {
        Container(spa_admin, "SYS-Educa Admin SPA", "React 19, TypeScript, Vite, @sysgov/ui", "Interface rica para gestão de matrículas, turmas, notas, relatórios e diário eletrônico.")
        Container(pwa_cidadao, "Portal do Aluno PWA", "React 19, Tailwind CSS, Service Workers", "Portal móvel para consulta de notas, presença e comunicados.")
    }

    Container_Boundary(c_backend, "Camada de Aplicação & API Gateway") {
        Container(nginx_proxy, "API Gateway / Nginx Reverse Proxy", "Nginx, Let's Encrypt, TLS 1.3", "Roteamento por subdomínio tenant, terminação TLS, compressão Brotli e rate limiting.")
        Container(api_app, "SYS-Educa Core API", "Laravel 13, PHP 8.3+ FPM", "Monólito modular que implementa os 27 domínios, regras de avaliação, RBAC e validação do Censo.")
        Container(worker_horizon, "Background Worker Pool", "Laravel Horizon, PHP 8.3+ CLI", "Consome filas de recálculo de médias, geração de arquivos do Educacenso, disparos de mensagens e relatórios em PDF.")
        Container(scheduler, "Task Scheduler", "Linux Cron / Laravel Schedule", "Dispara rotinas de travamento diário de calendário e lembretes de prazos.")
    }

    Container_Boundary(c_storage, "Camada de Dados & Persistência") {
        ContainerDb(db_mysql, "Banco Relacional Multi-Tenant", "MySQL 8.0/8.4+ LTS (InnoDB)", "Armazena as 94 tabelas com particionamento lógico via tenant_id, transações ACID e índices otimizados.")
        ContainerDb(cache_redis, "Cache & Mensageria Redis", "Redis 7.2+ Cluster", "Gerencia sessões web, cache com tags de permissões RBAC e filas de mensageria assíncrona.")
        ContainerDb(storage_s3, "Object Storage S3 / MinIO", "MinIO / AWS S3 Compatible", "Armazena arquivos gerados do Educacenso (TXT/ZIP), PDFs de boletins/históricos e fotos dos alunos.")
    }

    Rel(usuario_web, nginx_proxy, "Acessa via HTTPS", "HTTPS / JSON")
    Rel(usuario_cidadao, nginx_proxy, "Acessa via HTTPS", "HTTPS / JSON")

    Rel(nginx_proxy, spa_admin, "Serve estáticos compilados", "HTTP")
    Rel(nginx_proxy, pwa_cidadao, "Serve estáticos compilados", "HTTP")
    Rel(nginx_proxy, api_app, "Encaminha chamadas de API", "FastCGI / HTTP")

    Rel(api_app, db_mysql, "Lê e grava dados de negócio (94 tabelas)", "PDO / MySQL Protocol (Port 3306)")
    Rel(api_app, cache_redis, "Cache de RBAC e despacho de jobs", "RESP Protocol (Port 6379)")
    Rel(api_app, storage_s3, "Faz upload de anexos e busca termos", "S3 API / HTTPS")

    Rel(worker_horizon, cache_redis, "Consome filas prioritárias (censo, mail, pdf)", "RESP Protocol")
    Rel(worker_horizon, db_mysql, "Atualiza status de lote e consolidados", "PDO / MySQL Protocol")
    Rel(worker_horizon, storage_s3, "Grava arquivos do Educacenso e PDFs", "S3 API / HTTPS")

    Rel(scheduler, cache_redis, "Agenda tarefas periódicas", "RESP Protocol")
```

---

## 3. Especificação Tecnológica dos Containers

| Container | Tecnologia | Justificativa Arquitetural |
| :--- | :--- | :--- |
| **API Gateway / Nginx** | Nginx Alpine | Roteamento dinâmico de `*.educa.sysgov.br` para identificação de tenant sem reinicialização. |
| **SYS-Educa Core API** | Laravel 13 + PHP 8.3 FPM | Alta produtividade, tipagem estrita, isolamento modular por Domain-Driven Design (DDD) e ecossistema robusto. |
| **Worker Horizon** | Laravel Horizon + Redis | Processamento concorrente resiliente para tarefas pesadas (Censo Escolar, relatórios jasper/snappy e envios de e-mail). |
| **MySQL 8.0/8.4+ LTS** | Percona Server / Oracle MySQL | Padrão corporativo da SYSSTRAT; suporte a CTEs recursivas para estruturas hierárquicas e colunas geradas. |
| **Redis Cache** | Redis 7.2 | Invalidação atômica de permissões e menus (`cache:tags`) e tempo de resposta <2ms para sessões. |
| **Object Storage** | MinIO / S3 | Imutabilidade de relatórios emitidos e documentos comprobatórios com URLs pré-assinadas temporárias. |
