# Modelo C4 — Nível 3: Diagrama de Componentes (Component Diagram)

> **Documento Gerado pelo Agente Architect (`reversa-architect`) — Reversa Framework**  
> **Sistema:** SYSGOV — Gestão Educacional Municipal (`SYS-Educa`)  
> **Container Alvo:** `SYS-Educa Core API` (Laravel 13 Monólito Modular)  
> **Padrão:** C4 Model (Components Level) com Mermaid  
> **Status de Confiança:** 🟢 CONFIRMADO

---

## 1. Visão Geral dos Componentes

O container **SYS-Educa Core API** é estruturado seguindo os princípios de **Domain-Driven Design (DDD)** e arquitetura em camadas (Controllers/HTTP, Application Services, Domain Models/Engines e Repositories/Eloquent). O isolamento entre módulos é garantido por contratos de interface (DTOs e Events) sem dependências circulares.

---

## 2. Diagrama de Componentes (Mermaid)

```mermaid
C4Component
    title Diagrama de Componentes — SYS-Educa Core API (Laravel 13)

    Container_Boundary(api_boundary, "SYS-Educa Core API (Container)") {
        
        Component(mw_tenant, "TenantContextMiddleware", "HTTP Middleware", "Identifica a prefeitura ativa, valida assinatura e injeta active_tenant_id no container DI.")
        Component(guard_rbac, "RbacPolicyGuard", "Security Guard", "Verifica permissões granulares modulo.entidade.acao e escopo por escola.")

        Component(srv_enrollment, "EnrollmentService", "Application Service", "Controla o ciclo de vida da matrícula: requisição, validação de corte etário, enturmação e transferências.")
        Component(srv_evaluation, "EvaluationEngineService", "Domain Engine", "Executa parser seguro de fórmulas matemáticas de média, consulta tabelas de arredondamento e fecha etapas.")
        Component(srv_daily, "DailyRecordService", "Application Service", "Gerencia lançamento de aulas, frequências por aula/dia, faltas justificadas e trilha imutável de auditoria.")
        Component(srv_censo, "CensoPipelineService", "Application Service", "Aplica regras de validação INEP, orquestra geração assíncrona dos lotes TXT do Educacenso e importa IDs.")
        Component(srv_history, "SchoolHistoryService", "Application Service", "Consolida históricos escolares, cálculo de carga horária e emissão de atas finais com assinatura digital.")
        Component(srv_transport, "TransportLogisticsService", "Application Service", "Gerencia itinerários de transporte escolar rural/urbano, lotação e vínculo de alunos a veículos.")
        Component(srv_notify, "NotificationDispatcherService", "Event Bus / Service", "Despacha eventos de domínio para filas omnichannel (WhatsApp, Push, E-mail, Modal de Aceite).")
        Component(srv_unify, "PersonUnificationService", "Domain Service", "Mescla registros duplicados de pessoas físicas com integridade transacional de chaves estrangeiras.")

        ComponentDb(repo_eloquent, "Eloquent Repositories & Scopes", "Data Access Layer", "Modelos Eloquent com BelongsToTenant Global Scope e validações de invariância.")
    }

    Rel(mw_tenant, guard_rbac, "Estabelece contexto do tenant")
    Rel(guard_rbac, srv_enrollment, "Autoriza requisições de matrícula")
    Rel(guard_rbac, srv_daily, "Autoriza lançamentos de diário")
    Rel(guard_rbac, srv_evaluation, "Autoriza fechamentos de notas")
    Rel(guard_rbac, srv_censo, "Autoriza exportações do censo")

    Rel(srv_enrollment, srv_evaluation, "Consulta situação de aprovação para rematrícula")
    Rel(srv_daily, srv_evaluation, "Fornece totalizadores de falta para cálculo de frequência anual")
    Rel(srv_daily, srv_notify, "Emite evento de falta para notificação imediata aos pais")
    Rel(srv_evaluation, srv_history, "Persiste resultado consolidado no histórico escolar do aluno")
    Rel(srv_enrollment, srv_censo, "Fornece dados de matrícula inicial e corte de 31 de maio")

    Rel(srv_enrollment, repo_eloquent, "Lê/Grava via modelos de Matrícula")
    Rel(srv_evaluation, repo_eloquent, "Lê/Grava via modelos de Avaliação")
    Rel(srv_daily, repo_eloquent, "Lê/Grava via modelos de Diário")
    Rel(srv_censo, repo_eloquent, "Lê/Grava via modelos do Censo")
    Rel(srv_history, repo_eloquent, "Lê/Grava via modelos de Histórico")
    Rel(srv_transport, repo_eloquent, "Lê/Grava via modelos de Transporte")
    Rel(srv_unify, repo_eloquent, "Executa transação de unificação de dados")
```

---

## 3. Descrição das Responsabilidades dos Componentes Centrais

1. **`EvaluationEngineService`:**
   - Desacoplado de controllers web. Recebe como entrada as notas da etapa e as regras cadastradas no banco (`evaluation_rules`), avalia a expressão matemática da fórmula sem `eval` e busca a faixa na tabela de arredondamento (`rounding_rules`), retornando o status de aprovação de forma determinística e testável.
2. **`DailyRecordService`:**
   - Intercepta requisições de diário de classe. Checa a data da aula em relação ao calendário escolar e à tolerância retroativa. Se o período estiver fechado, rejeita lançamentos diretos e exige o fluxo de solicitação de retificação com auditoria.
3. **`CensoPipelineService`:**
   - Coordena a máquina de estados da exportação do Educacenso. Valida primeiro as inconsistências impeditivas e gera relatórios prévios. Ao aprovar, despacha o job assíncrono para a fila do Horizon com paginação estável.
4. **`PersonUnificationService`:**
   - Garante que a mesclagem de duas pessoas físicas (unificação de duplicatas) ocorra em isolamento transacional estrito, migrando todas as 15+ tabelas filhas e gerando log permanente com o antes e depois.
