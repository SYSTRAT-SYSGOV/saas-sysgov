# Design Técnico: Submódulo Comunicação Escolar e Mensageria (SYS-Educa)

## Context

Ver [proposal.md](proposal.md) para motivação e problemas resolvidos.
O SYS-Educa conta com os submódulos de Core Acadêmico, Secretaria, Pedagógico, Servidores, Educacenso e Transporte Escolar implementados e validados.
A comunicação escolar estabelece o canal de relacionamento institucional e pedagógico com os pais e responsáveis legais cadastrados no MDM `Pessoas`.

Restrições arquiteturais aplicadas:
- Multi-tenancy estrito via `tenant_id` (bigint) e trait `TenantAware`.
- Chaves primárias UUID `CHAR(36)` nas tabelas do módulo.
- Rastreamento de leitura e auditoria via `AuditLogger`.
- Integração de mensageria obrigatória via `App\Support\OutboxPublisher` (Outbox Pattern), sem chamadas síncronas a gateways externos no ciclo de vida HTTP.
- Redação estritamente em Português do Brasil (pt-BR - AGENTS.md § 7).

## Goals / Non-Goals

**Goals:**
- Publicar avisos, murais e circulares com segmentação flexível por rede, unidade escolar, curso ou turma.
- Registrar confirmação de leitura individualizada por comunicado.
- Cadastrar ocorrências pedagógicas, comportamentais e elogios com tramitação de providências.
- Notificar os responsáveis legais vinculados em `educa_student_guardians` de forma rastreável.
- Publicar eventos assíncronos no Outbox para envio via mensageria (WhatsApp, SMS, E-mail) e alertas de faltas.

**Non-Goals:**
- Chat bidirecional em tempo real estilo mensageiro instantâneo (comunicação oficial é formal e assíncrona).
- Gateway proprietário de SMS/WhatsApp embutido no monólito (o monólito consome provedores via outbox workers).

## Decisions

### Decisão 1: Modelo Relacional de Avisos, Públicos-Alvo e Ocorrências
- **Tabelas do submódulo**:
  1. `educa_announcements`: Título, conteúdo, urgência (`baixa`, `media`, `alta`, `urgente`), datas de publicação e expiração, e status (`rascunho`, `publicado`, `arquivado`).
  2. `educa_announcement_audiences`: Associação do comunicado com o público-alvo (`tipo_alvo`: `rede`, `escola`, `curso`, `turma`) e identificador da entidade (`target_id`).
  3. `educa_announcement_reads`: Registro de confirmação de leitura por pessoa/responsável ou usuário, com data e IP.
  4. `educa_student_incidents`: Ocorrência associada à matrícula e aluno, com tipologia (`disciplinar`, `pedagogica`, `saude`, `elogio`), gravidade (`baixa`, `media`, `alta`, `gravissima`), relato e status (`aberta`, `em_analise`, `concluida`, `cientificada`).
  5. `educa_incident_actions`: Providências e despachos tomados pela equipe escolar, com indicador de convocação presencial de responsáveis.

### Decisão 2: Padrão Outbox para Disparo Resiliente de Mensageria
- **Escolha**: Eventos de notificação (como convocação de pais ou aviso de faltas) utilizam `App\Support\OutboxPublisher::publish()` inserindo registros na tabela `outbox_events` dentro da transação do banco de dados.
- **Justificativa**: Garante consistência transacional atômica, protege as requisições HTTP contra lentidão ou falhas de redes externas de mensageria e permite re-tentativas com backoff exponencial.

### Decisão 3: Licenciamento e RBAC
- **Escolha**: Submódulo registrado como `educa-comunicacao` com middleware `module-access:educa-comunicacao` e permissões `educa.comunicacao.*`.
- **Justificativa**: Mantém uniformidade com a arquitetura de monólito modular do SYSGOV.

## Risks / Trade-offs

- **[Risco: Sobrecarga de notificações enviadas aos pais]** → *Mitigação*: Agrupamento de avisos e controle de urgência para evitar fadiga de notificações.
- **[Risco: Responsável sem telefone ou e-mail cadastrado no MDM Pessoas]** → *Mitigação*: O sistema registra pendência de contato e sinaliza a necessidade de atualização cadastral na secretaria.
- **[Risco: Aluno com múltiplos responsáveis cadastrados]** → *Mitigação*: O sistema direciona notificações aos responsáveis marcados com `is_responsavel_pedagogico = true` em `educa_student_guardians`.
