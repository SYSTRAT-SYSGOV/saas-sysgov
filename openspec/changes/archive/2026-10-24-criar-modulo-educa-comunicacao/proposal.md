# Proposal: Submódulo Comunicação Escolar e Notificações (SYS-Educa)

## Why

A falta de um canal institucional ágil e rastreável entre as unidades escolares e os pais ou responsáveis resulta em baixa participação familiar, atraso na ciência de faltas reiteradas (evasão escolar precoce) e falhas no registro de ocorrências pedagógicas e disciplinares.
Este submódulo implementa a gestão unificada de comunicados escolares segmentados, registro de ocorrências com protocolo de ciência aos responsáveis legais (integrado ao MDM de Pessoas) e disparo transacional de mensagens e alertas de infrequência via mensageria resiliente (Outbox Pattern).

## What Changes

- Criação do catálogo e tabelas para comunicados e avisos oficiais escolares (`educa_announcements`, `educa_announcement_audiences`, `educa_announcement_reads`) com segmentação por rede, escola, curso ou turma.
- Registro e tramitação de ocorrências escolares disciplinares e pedagógicas (`educa_student_incidents`) com notificação aos responsáveis legais (`educa_student_guardians`).
- Despacho e confirmação de ciência digital pelos responsáveis, registrando data, hora e IP do leitor.
- Motor de alertas automáticos de infrequência escolar integrado aos registros do diário de classe (`educa_attendance_records`).
- Fila de mensageria assíncrona baseada no padrão Outbox (`App\Support\OutboxPublisher`) para canais WhatsApp (Webhook), SMS e E-mail, prevenindo bloqueios síncronos e garantindo idempotência e re-tentativas.
- Contrato OpenAPI 3.1.0 e cenários BDD em Gherkin cobrindo a jornada de envio, segmentação e notificação aos responsáveis.

## Capabilities

### New Capabilities

- `educa-comunicacao-avisos`: Gestão de murais, comunicados e circulares oficiais da escola e secretaria, com filtros de público-alvo, prazo de vigência e confirmação de leitura.
- `educa-comunicacao-ocorrencias`: Registro de ocorrências pedagógicas e disciplinares, elogios e observações de conduta com solicitação formal de ciência aos responsáveis legais.
- `educa-comunicacao-mensageria-outbox`: Disparo assíncrono de mensagens e alertas de faltas via canais externos utilizando o padrão Outbox transacional (`outbox_events`).

### Modified Capabilities

<!-- Nenhuma capacidade existente tem seus requisitos modificados -->

## Impact

- **Backend (`apps/api`)**:
  - Novas tabelas em migration dedicada com `tenant_id` e PKs em UUID `CHAR(36)`.
  - Novos models Eloquent com traits `TenantAware`, `HasUuids` e `SoftDeletes`.
  - Serviços de negócio: `AnnouncementService`, `IncidentService` e `NotificationDispatcherService`.
  - Integração com `App\Support\OutboxPublisher` para eventos de mensageria.
  - FormRequests, Policies RBAC com permissões `educa.comunicacao.*` e rotas REST sob `/api/educa/comunicacao`.
- **Frontend / Portal**:
  - Exposição de contratos OpenAPI para consumo futuro no Portal do Aluno/Família (`apps/web-client`).
- **Segurança e Auditoria**:
  - Isolamento estrito de dados por `tenant_id`, controle RBAC e registro de mutações no `AuditLogger`.
