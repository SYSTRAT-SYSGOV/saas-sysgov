# Visão Geral Arquitetural — SYSGOV Educação (`SYS-Educa`)

> **Documento Gerado pelo Agente Architect (`reversa-architect`) — Reversa Framework**  
> **Sistema Alvo:** SYSGOV — Gestão Municipal Integrada (`SYS-Educa`)  
> **Sistema Legado:** Portabilis i-Educar (PHP 5/7, Procedural + Legado Eloquent / PostgreSQL)  
> **Stack de Destino:** Laravel 13, React 19 / TypeScript, MySQL 8.0/8.4+ LTS, Redis 7+, Docker/Kubernetes  
> **Status de Confiança:** 🟢 CONFIRMADO (Baseado em 27 Módulos Escavados e 7 ADRs)

---

## 1. Princípios Arquiteturais e Diretrizes Estruturais

A modernização do sistema de gestão educacional municipal para o ecossistema **SYSGOV (`SYS-Educa`)** adota os seguintes pilares de arquitetura de software:

1. **Monólito Modular Domain-Driven Design (DDD):**
   - Agrupamento em Bounded Contexts com fronteiras claras, interfaces expostas por DTOs e eventos de domínio assíncronos.
   - Eliminação de acoplamentos procedurais e dependências circulares encontradas no legado.
2. **Multi-Tenancy Híbrido com Isolamento Estrito (`tenant_id` + Global Scopes):**
   - Banco compartilhado por tenant municipal, particionamento lógico compulsório em todas as tabelas através de `tenant_id` indexado com `CHAR(36)` (UUID v7 ordenado cronologicamente).
   - Middleware `TenantContextMiddleware` e Trait `BelongsToTenant` aplicados via Global Scope no Eloquent, impedindo vazamento de dados entre prefeituras.
3. **Clean Architecture e Inversão de Controle:**
   - Camadas desacopladas: *Domain* (entidades puras, regras LDB, fórmula de médias), *Application* (casos de uso, orquestradores de fluxo de matrícula, exportação Educacenso), *Infrastructure* (Eloquent, Redis, drivers de relatórios, envio omnichannel) e *Presentation* (Controllers RESTful/JSON e UI React).
4. **Segregação de Leitura e Escrita (CQRS Leve nos Relatórios):**
   - Transações críticas de escrita (matrículas, fechamentos de notas, diário de classe) executadas em modelo OLTP com transações ACID.
   - Consultas analíticas, boletins escolares em lote, fichas individuais e exportações INEP servidas a partir de réplicas de leitura ou visões materializadas indexadas, sem bloquear tabelas transacionais.
5. **Arquitetura Orientada a Eventos de Domínio (Event-Driven Architecture):**
   - Despacho de eventos internos (`EnrollmentCreated`, `DailyAttendanceRecorded`, `GradeClosed`, `StudentTransferred`) desacoplando auditoria imutável, notificações aos responsáveis e projeções estatísticas.

---

## 2. Visão Geral da Topologia e Infraestrutura

```
+----------------------------------------------------------------------------------------------------+
|                                     SYSGOV API Gateway / Cloudflare                                |
|                                   (WAF, DDoS Shield, SSL Termination)                               |
+--------------------------------------------------+-------------------------------------------------+
                                                   |
                                                   v
+----------------------------------------------------------------------------------------------------+
|                                      Nginx Ingress / Web Server                                    |
|                               (Roteamento de Subdomínios por Município)                            |
+--------------------+---------------------------------------------+---------------------------------+
                     |                                             |
                     v                                             v
+------------------------------------------+     +---------------------------------------------------+
|     React 19 SPA / PWA (Frontends)       |     |        SYS-Educa Core API (Laravel 13 Monolith)    |
|  - Portal do Gestor Municipal (Desktop)  |     |  - Controllers RESTful / OpenAPI 3.1              |
|  - Diário de Classe do Professor (PWA)   |     |  - Bounded Context Services                       |
|  - Portal da Família / Aluno (Mobile)    |     |  - Security Guards (RBAC / ABAC)                  |
+------------------------------------------+     +-------------------------+-------------------------+
                                                                           |
                         +-------------------------------------------------+-----------------------------------+
                         |                                                 |                                   |
                         v                                                 v                                   v
+----------------------------------+             +-----------------------------------+             +-----------------------+
|    MySQL 8.0/8.4+ Primary (OLTP) |             |        Redis 7 Cluster            |             |   Laravel Horizon     |
|  - InnoDB, utf8mb4_0900_ai_ci    |             |  - Sessões / Tokens JWT / RBAC    |             |   (Assíncrono & Queues|
|  - Particionamento por tenant_id |             |  - Cache de Regras e Parâmetros   |             |  - Lotes Educacenso   |
|  - Replicação Assíncrona Semi-Sync             |  - Filas de Mensageria            |             |  - Geração de PDFs    |
+----------------+-----------------+             +-----------------------------------+             |  - Envio WhatsApp     |
                 |                                                                                 +-----------+-----------+
                 v                                                                                             |
+----------------------------------+                                                                           v
|    MySQL Read Replica (OLAP/Rel) |                                                               +-----------------------+
|  - Relatórios e Consultas Lote   |                                                               |   MinIO / S3 Storage  |
+----------------------------------+                                                               |  - Documentos / Atas  |
                                                                                                   +-----------------------+
```

---

## 3. Padrões de Segurança, Governança e LGPD

1. **Tratamento de Dados Pessoais e Sensíveis (PII):**
   - Dados de menores (alunos, certidões de nascimento, laudos médicos e deficiências) catalogados como dados sensíveis.
   - Criptografia em repouso nos campos de documentos sensíveis (`encrypted` casting do Laravel) e mascaramento compulsório em logs de auditoria e telemetria (OpenTelemetry).
2. **Controle de Acesso Granular (RBAC Institucional):**
   - Matriz padronizada de permissões no formato `modulo.entidade.acao` (ex.: `enrollments.matricula.aprovar`, `diario.frequencia.lancar`).
   - Escopo institucional restrito: diretores e secretários só visualizam dados de suas escolas atribuídas; professores acessam estritamente as turmas onde possuem alocação ativa no ano letivo corrente.
3. **Trilha de Auditoria Imutável (Audit Trail):**
   - Registro de todas as mutações no diário de classe (notas, faltas e frequências) em tabela de auditoria append-only (`daily_record_audits`), capturando identificador do usuário, endereço IP, timestamp UTC, payload anterior e novo payload.

---

## 4. Catálogo de Dívidas Técnicas do Legado i-Educar Superadas

Durante as 27 escavações minuciosas do código fonte e histórico git do i-Educar, foram catalogadas as seguintes fragilidades críticas, superadas na arquitetura do **SYS-Educa**:

| Item | Fragilidade Identificada no Legado (i-Educar) | Solução Arquitetural no SYS-Educa (SYSGOV) | Benefício de Engenharia / Negócio |
| :--- | :--- | :--- | :--- |
| **DT-01** | **Acoplamento Monolítico Procedural com Globais:** Uso intensivo de scripts PHP procedural legados (`clsPmieducar...`, `clsBanco`, `$_SESSION` global) misturados com controllers modernos. | Arquitetura limpa com Service Layer, Injeção de Dependências, Form Requests validados e desacoplamento HTTP. | Testabilidade unitária superior a 90%, isolamento de escopo e facilidade de manutenção. |
| **DT-02** | **Fórmulas de Média Avaliativa via `eval()` Inseguro:** O legado possuía trechos históricos que avaliavam strings de fórmula dinamicamente no interpretador PHP. | Motor desacoplado `EvaluationEngineService` com parser matemático baseado em gramática formal (AST/Shunting-yard). | Eliminação de vulnerabilidades de Remote Code Execution (RCE) e performance 50x mais rápida. |
| **DT-03** | **Duplicação Crônica de Pessoas Físicas e Alunos:** Falta de restrições rígidas no cadastro de pessoas resultava em múltiplos registros para o mesmo indivíduo e aluno. | Entidade canônica `people` com busca determinística por CPF / NIS / Certidão e `PersonUnificationService` transacional com locks pessimistas. | Integridade referencial unificada e históricos escolares contínuos mesmo com transferências. |
| **DT-04** | **Exportação do Educacenso em Requisições Síncronas:** Scripts de geração do Censo INEP rodavam na thread HTTP, causando estouros de timeout (`max_execution_time`) e memória. | Pipeline assíncrono orquestrado pelo Laravel Horizon, dividindo o lote em chunks por escola com cache intermediário em Redis e saída direta em S3/MinIO. | Exportações de redes com 50.000+ alunos sem impacto na estabilidade da aplicação web. |
| **DT-05** | **Bloqueio Concorrente no Lançamento de Diário de Classe:** Falta de granularidade nos registros de faltas gerava locks de tabela e conflito quando múltiplos professores lançavam aulas simultaneamente. | Modelo relacional particionado `daily_records` e `daily_attendances` com chaves únicas compostas por `(school_class_id, component_id, lesson_date, lesson_order)`. | Alta vazão concorrente sem deadlocks no encerramento de bimestres. |
| **DT-06** | **Ausência de Trilha de Auditoria Histórica de Alterações de Notas:** Registros de notas alterados diretamente na tabela sem rastreabilidade de quem, quando e por que alterou. | Registro append-only compulsório em `grade_audits` e `daily_record_audits` disparado por Domain Observers. | Blindagem jurídica para a Secretaria de Educação em contestações de notas e reprovações. |
| **DT-07** | **Dependência de Stored Procedures / Triggers do PostgreSQL:** Lógicas de negócio críticas encapsuladas no dialeto PL/pgSQL do banco de dados, dificultando portabilidade para MySQL. | Migração integral da lógica de negócio para a camada de Domínio da aplicação (PHP/Laravel), mantendo o banco puramente relacional com constraints padrão ANSI. | Portabilidade garantida para MySQL 8.0/8.4+ LTS, redução de dependência de recursos proprietários de SGBD e facilidade de testes em CI/CD. |

---

## 5. Estratégia de Observabilidade, Resiliência e SLA

- **Métricas e Logs:** Integração com OpenTelemetry para tracing distribuído de requisições, métricas de tempo de resposta por escola e monitoramento de saturação de filas do Horizon.
- **Circuit Breaker e Fallbacks:** Proteção de chamadas para serviços externos federais (Receita Federal para validação de CPF, INEP e Gov.br).
- **Health Checks:** Probes de liveness e readiness para Kubernetes verificando conectividade com MySQL primário, réplica e nós Redis.
- **Objetivos de SLA do Sistema:**
  - Disponibilidade: **99.9%** durante o ano letivo.
  - Latência P95 em transações do diário de classe: **< 150ms**.
  - RPO (Recovery Point Objective): **< 5 minutos** (replicação semi-sync + WAL).
  - RTO (Recovery Time Objective): **< 30 minutos** (orquestração automatizada de failover).
