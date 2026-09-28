# Design

## Context

Veja `proposal.md` para motivação completa. Resumo: o módulo `Cemiterio` (backend) e `apps/web-client/src/modules/cemiterios` (frontend) já possuem aba de Sucessão Hereditária funcional mas rasa. Precisamos evoluir para máquina de estados completa, herdeiros com validação, documentos por via, vínculo com concessão, auditoria e notificações — tudo parametrizável por tenant.

Stack: Laravel 13 (PHP 8.4), `nwidart/laravel-modules`, React 19 + TS + Tailwind v4, `@sysgov/ui` (obrigatório), `@sysgov/sdk`, MySQL 8.4, Redis 7. Multi-tenant via `TenantAware`, `Money` (centavos), Outbox, `AuditLogger`, RBAC via Policies.

## Goals / Non-Goals

**Goals:**
- Implementar máquina de estados do processo sucessório com 7 estados e transições auditadas
- Criar 4 novas tabelas com `tenant_id`, índices compostos, `TenantAware`, `SoftDeletes`
- Expor API REST completa (CRUD + transições + herdeiros + documentos + histórico + dashboards)
- Evoluir `SucessaoView.tsx` para wizard por via, validações, upload, timeline, badges
- Garantir parametrização total por tenant (ordem prioridade, prazos, docs por via, representação)
- Manter compliance: `Money`, Outbox, `AuditLogger`, LGPD (hash, acesso restrito), RBAC granular

**Non-Goals:**
- Portal público do concessionário (mudança própria)
- Integração Gov.br (mudança própria)
- Integração cartórios/registro civil (depende de premissas externas)
- Migração de dados legados de sucessões existentes (fora do escopo v1)

## Decisions

### 1. Arquitetura do Módulo Backend

**Decisão:** Estender o módulo `Cemiterio` existente via `make:module` para adicionar as funcionalidades, não criar módulo separado.

**Racional:** A sucessão é intrinsecamente ligada a concessões, jazigos, parques — todos no mesmo domínio. Separar criaria acoplamento distribuído desnecessário. O `make:module` já gera scaffold com migrations, models, controllers, policies, tests, providers, routes, module.json.

**Alternativas consideradas:**
- Módulo `Sucessao` separado → rejeitado: acoplamento forte com `Concessao`, `Jazigo`, `Park` exigiria cross-module refs constantes
- Tudo em `Concessao` → rejeitado: responsabilidade distinta, máquina de estados própria, auditoria separada

### 2. Modelo de Dados — 4 Novas Tabelas

| Tabela | Propósito | Chaves Principais |
|--------|-----------|-------------------|
| `sucessoes` | Processo sucessório (evolução da existente) | `id`, `tenant_id`, `concession_id`, `park_id`, `plot_id`, `via`, `estado`, `requerente_id`, `titular_falecido_id`, `data_falecimento`, `processo_referencia`, `parecer`, `lock_version` |
| `sucessao_herdeiros` | Herdeiros do processo | `id`, `tenant_id`, `sucessao_id`, `nome`, `parentesco`, `documento`, `ordem`, `direito_representacao`, `titular_indicado` |
| `sucessao_documentos` | Documentos anexados | `id`, `tenant_id`, `sucessao_id`, `tipo`, `arquivo` (path storage), `hash` (SHA-256) |
| `sucessao_historico` | Append-only de transições/eventos | `id`, `tenant_id`, `sucessao_id`, `de_estado`, `para_estado`, `motivo`, `usuario_id` |

**Índices compostos (todos iniciam com `tenant_id`):**
- `sucessoes`: `(tenant_id, concession_id)`, `(tenant_id, estado)`, `(tenant_id, park_id, estado)`
- `sucessao_herdeiros`: `(tenant_id, sucessao_id, ordem)`, `(tenant_id, sucessao_id, titular_indicado)`
- `sucessao_documentos`: `(tenant_id, sucessao_id, tipo)`
- `sucessao_historico`: `(tenant_id, sucessao_id, created_at)`

**Enums (PHP backed enums + DB check constraints):**
- `ViaSucessao`: `inventario_judicial`, `inventario_extrajudicial`, `alvara_judicial`, `arrolamento`
- `EstadoSucessao`: `solicitada`, `em_analise`, `aguardando_documentos`, `validada`, `sucedida`, `indeferida`, `arquivada`
- `TipoDocumentoSucessao`: `certidao_obito`, `inventario`, `formal_partilha`, `escritura`, `alvara`, `procuracao`, `outro`
- `Parentesco`: `companheiro`, `filho`, `pai`, `mae`, `irmao`, `neto`, `avo`, `tio`, `sobrinho`, `outro`, `representante`

### 3. Máquina de Estados — Implementação

**Abordagem:** State pattern via `SucessaoStateMachine` service (não library externa). Transições validadas em `SucessaoService::transicionar()`.

```php
// Transições permitidas (de → [para])
Solicitada → [Em_analise]
Em_analise → [Aguardando_documentos, Validada, Indeferida]
Aguardando_documentos → [Em_analise]
Validada → [Sucedida, Indeferida]
Indeferida → [Arquivada]
Aguardando_documentos → [Arquivada] (após prazo)
Sucedida → [] (terminal)
Arquivada → [] (terminal)
```

**Concorrência:** `lock_version` (integer, incrementado a cada transição). `transicionar()` recebe `lock_version` esperado; falha se divergir → `409 Conflict`.

**Histórico:** Toda transição cria registro em `SucessaoHistorico` (append-only, sem update/delete). `motivo` armazena JSON com `{ parecer, documentos_pendentes, observacoes }`.

### 4. Validação de Cadeia Sucessória e Ordem de Prioridade

**Configuração Tenant (`sucessao_config` JSON em `tenant_configurations` ou tabela dedicada):**
```json
{
  "ordem_prioridade": ["companheiro", "filho", "pai", "mae", "irmao", "neto", "avo"],
  "prazo_regularizacao_dias": 120,
  "documentos_por_via": {
    "inventario_judicial": ["certidao_obito", "inventario", "formal_partilha", "alvara_levantamento"],
    "inventario_extrajudicial": ["certidao_obito", "escritura"],
    "alvara_judicial": ["certidao_obito", "alvara"],
    "arrolamento": ["certidao_obito", "termo_arrolamento", "alvara"]
  },
  "direito_representacao_habilitado": true,
  "base_legal": "[LEI/DECRETO MUNICIPAL DE SUCESSÃO DE JAZIGOS — CONFIRMAR]"
}
```

**Validação (`CadeiaSucessoriaService`):**
1. Agrupar herdeiros por `parentesco`
2. Ordenar grupos pela `ordem_prioridade` do tenant
3. Dentro de cada grupo, ordenar por `ordem` informada
4. Validar `titular_indicado` único
5. Se `direito_representacao_habilitado`, permitir `parentesco = representante` com `herdeiro_representado_id` (FK para `sucessao_herdeiros`)

### 5. Documentos — Upload, Hash, LGPD

**Storage:** `Storage::disk('s3')->put("tenant/{tenant_id}/sucessao/{sucessao_id}/{tipo}/{uuid}.pdf", $file)` — Object Storage (S3-compatível).

**Hash:** `hash_file('sha256', $path)` calculado no upload, salvo em `sucessao_documentos.hash`. Verificação periódica via job.

**Acesso:** Endpoint `GET /sucessoes/{id}/documentos/{documentoId}/download` protegido por `SucessaoPolicy@viewDocument` (requer `cemiterios.sucessao.view` + mesma tenant). Log em `audit_logs` a cada download.

**LGPD:** Retenção parametrizável (`retencao_dias` no config). Job de purga marca `deleted_at` (soft delete) e registra em `audit_logs`.

### 6. Vínculo com Concessão e Regularização

**Fluxo `Validada → Sucedida`:**
1. `SucessaoService::concluir()` valida: estado = `Validada`, `titular_indicado` existe, documentos obrigatórios presentes
2. Inicia transaction:
   - Atualiza `sucessao.estado = Sucedida`
   - Atualiza `concessao.estado = Sucedida` + `concessao.titular_id = titular_indicado.pessoa_id`
   - Cria registros de `ConcessaoTitular` (histórico de titularidade) para novo titular e herdeiros como usuários autorizados
   - Registra em `audit_logs` (module=cemiterios, action=concessao.sucedida, before/after)
   - Publica `SucessaoConcluidaEvent` via `OutboxPublisher` (para notificações, portal, etc.)
3. Commit ou rollback total.

**Regularização de Uso:** Nova tabela `concessao_regularizacao` (ou reuso de `concessao_historico` existente) registra: `tipo` (sucessao|inclusao|transferencia), `sucessao_id`, `titular_anterior_id`, `titular_novo_id`, `herdeiros_incluidos[]`.

### 7. API Contracts

Base: `api.ts` existente em `apps/web-client/src/modules/cemiterios/api.ts`. Novos endpoints:

| Método | Rota | Descrição | Permissão |
|--------|------|-----------|-----------|
| GET | `/sucessoes` | Listagem paginada com filtros | `cemiterios.sucessao.view` |
| GET | `/sucessoes/{id}` | Detalhe completo | `cemiterios.sucessao.view` |
| POST | `/sucessoes` | Abrir processo | `cemiterios.sucessao.manage` |
| PUT | `/sucessoes/{id}` | Atualizar dados cadastrais | `cemiterios.sucessao.manage` |
| POST | `/sucessoes/{id}/transicao` | Transição de estado | `cemiterios.sucessao.transition` |
| POST | `/sucessoes/{id}/herdeiros` | Upsert herdeiros | `cemiterios.sucessao.manage` |
| POST | `/sucessoes/{id}/documentos` | Upload multipart | `cemiterios.sucessao.manage` |
| GET | `/sucessoes/{id}/historico` | Histórico append-only | `cemiterios.sucessao.view` |
| GET | `/sucessoes/pendentes` | Dashboard pendentes | `cemiterios.sucessao.view` |
| GET | `/sucessoes/regularizacao` | Dashboard regularização | `cemiterios.sucessao.view` |

**DTOs (Request/Response):**
- `SucessaoDTO`: id, concession_id, park_id, plot_id, via, estado, requerente_id, titular_falecido_id, data_falecimento, processo_referencia, parecer, lock_version, created_at
- `SucessaoHerdeiroDTO`: id, nome, parentesco, documento, ordem, direito_representacao, titular_indicado
- `SucessaoDocumentoDTO`: id, tipo, arquivo_url, hash, created_at
- `SucessaoHistoricoDTO`: id, de_estado, para_estado, motivo, usuario_id, created_at
- `TransicaoRequest`: { para: EstadoSucessao, motivo: string, lock_version: int }
- `HerdeirosRequest`: { herdeiros: SucessaoHerdeiroDTO[] }

### 8. Frontend — `SucessaoView.tsx` Evoluída

**Estrutura (lazy-loaded em `apps/web-client/src/modules/cemiterios/views/SucessaoView.tsx`):**

1. **Header**: Título, breadcrumb, KPI cards (pendentes, em análise, aguardando docs, vencidos) — `@sysgov/ui` `KpiCard`
2. **Tabs/Stepper** por fase do processo:
   - **Aba 1: Novo Processo** — Wizard por via de sucessão (`Stepper` @sysgov/ui)
     - Step 1: Seleção da via (cards com ícones, descrição dos docs exigidos)
     - Step 2: Dados do requerente + concessão + titular falecido + data falecimento
     - Step 3: Confirmação → POST `/sucessoes`
   - **Aba 2: Lista de Processos** — `DataTable` @sysgov/ui com filtros (estado, via, parque, concessionária, data)
     - Ações: Ver detalhes, Transicionar, Herdeiros, Documentos
   - **Aba 3: Detalhe do Processo** (modal `size="2xl"` @sysgov/ui `Modal`)
     - Sub-aba **Dados**: Info do processo, concessionária, titular falecido, base legal
     - Sub-aba **Herdeiros**: `DataTable` inline + botão "Adicionar Herdeiro" (modal) com validação de ordem/prioridade
     - Sub-aba **Documentos**: Lista com ícones por tipo, botão upload (`FileUpload` @sysgov/ui), preview PDF, download, hash
     - Sub-aba **Histórico**: `Timeline` @sysgov/ui com transições, pareceres, uploads
     - Sub-aba **Ações**: Botões de transição permitidos (habilitados/desabilitados por estado atual + RBAC)
3. **Dashboard Inferior** (sempre visível): Cards de resumo + links para `/sucessoes/pendentes` e `/sucessoes/regularizacao`

**Componentes @sysgov/ui obrigatórios:** `Modal`, `Button`, `Badge`, `KpiCard`, `DataTable`, `Stepper`, `FileUpload`, `Timeline`, `Select`, `Input`, `Textarea`, `DatePicker`, `Alert`, `Tabs`, `Card`, `Accordion`.

**Estado global:** `CemiteriosContext` existente estendido com `sucessaoState` (processo ativo, filtros, cache). Novos hooks: `useSucessao`, `useSucessaoTransicoes`, `useSucessaoHerdeiros`, `useSucessaoDocumentos`.

**SDK (`@sysgov/sdk`):** Novos tipos em `packages/sdk/src/cemiterios/sucessao.ts`:
```ts
export enum ViaSucessao { ... }
export enum EstadoSucessao { ... }
export enum TipoDocumentoSucessao { ... }
export enum Parentesco { ... }
export interface Sucessao { ... }
export interface SucessaoHerdeiro { ... }
export interface SucessaoDocumento { ... }
export interface SucessaoHistorico { ... }
export interface TransicaoRequest { ... }
export interface HerdeirosRequest { ... }
```

### 9. Configuração Tenant — `sucessao_config`

**Armazenamento:** Coluna `config` (JSON) na tabela `tenant_configurations` (já existente) ou nova tabela `cemiterio_sucessao_configs` se preferir isolamento.

**Chaves obrigatórias:**
- `ordem_prioridade: Parentesco[]` (array ordenado)
- `prazo_regularizacao_dias: int` (padrão 120)
- `documentos_por_via: Record<ViaSucessao, TipoDocumentoSucessao[]>`
- `direito_representacao_habilitado: boolean`
- `base_legal: string` (placeholder `[LEI/DECRETO MUNICIPAL DE SUCESSÃO DE JAZIGOS — CONFIRMAR]`)
- `retencao_documentos_dias: int` (padrão 3650 = 10 anos)
- `notificacao_antecedencia_dias: int[]` (ex.: [30, 7, 1] para alertas)

**Carregamento:** `config('cemiterio.sucessao')` via `CemiterioServiceProvider` que mergeia config default + tenant override.

### 10. Notificações e Jobs

**Events (Outbox):**
- `SucessaoTransicionadaEvent` (payload: sucessao_id, de_estado, para_estado, usuario_id)
- `SucessaoConcluidaEvent` (payload: sucessao_id, concessao_id, novo_titular_id)
- `PrazoRegularizacaoProximoEvent` (payload: sucessao_id, dias_restantes)
- `PrazoRegularizacaoVencidoEvent` (payload: sucessao_id)

**Jobs (Queue: `sucessao`):**
- `NotificarPrazoRegularizacaoJob` — dispara e-mail + notificação in-app para gestores (`cemiterios.gestao.manage`)
- `ProcessarSucessaoConcluidaJob` — integrações futuras (portal, cartórios)
- `VerificarIntegridadeDocumentosJob` — diário, recalcula hashes

**Scheduler:** `Schedule::command('sucessao:verificar-prazos')->dailyAt('08:00')` — varre `sucessoes` onde `data_falecimento + prazo_regularizacao_dias - antecedencia IN (30,7,1)` e estado IN (`Solicitada`, `Em_analise`, `Aguardando_documentos`, `Validada`).

### 11. RBAC — Policies e Permissões

| Permissão | Descrição | Onde Usada |
|-----------|-----------|------------|
| `cemiterios.sucessao.view` | Visualizar processos, herdeiros, documentos, histórico | Controllers GET, `SucessaoPolicy@view` |
| `cemiterios.sucessao.manage` | Criar, editar dados cadastrais, herdeiros, upload docs | Controllers POST/PUT, `SucessaoPolicy@manage` |
| `cemiterios.sucessao.transition` | Executar transições de estado | `SucessaoTransicaoController`, `SucessaoPolicy@transition` |
| `cemiterios.sucessao.delete` | Soft delete processo (apenas estados terminais) | `SucessaoPolicy@delete` |

**Policy:** `SucessaoPolicy` com métodos `view`, `manage`, `transition`, `delete`, `viewDocument`, `downloadDocument`. Todos checam `tenant_id` via `TenantAware`.

### 12. Testes — Estratégia

**Backend (Pest/PHPUnit):**
- `SucessaoStateMachineTest`: todas as transições válidas/inexistentes, concorrência (`lock_version`)
- `CadeiaSucessoriaServiceTest`: ordem prioridade padrão vs config tenant, representação, titular único
- `SucessaoServiceTest`: abrir processo por via, concluir (vínculo concessão), indeferir, arquivar
- `DocumentoSucessaoServiceTest`: upload, hash, download, LGPD purge
- `SucessaoPolicyTest`: cada permissão por role/tenant
- `SucessaoControllerTest`: endpoints com auth, validação, paginação
- `TenantIsolationTest` (gerado por `make:module`): isolamento de dados entre tenants

**Frontend (Vitest + React Testing Library):**
- `SucessaoView.test.tsx`: renderização, navegação tabs, wizard steps
- `SucessaoWizard.test.tsx`: validação por via, submissão
- `HerdeirosTable.test.tsx`: adição, validação ordem/prioridade, titular único
- `DocumentosUpload.test.tsx`: upload, hash display, download
- `TimelineHistorico.test.tsx`: renderização eventos ordenados

**E2E (Playwright — opcional v1):**
- Fluxo completo: abrir → anexar docs → transicionar → herdeiros → concluir → concessão sucedida

### 13. Migração de Dados Existentes

**Estratégia:** Script de migração idempotente (`php artisan cemiterio:migrate-sucessao-legacy`):
1. Lê `sucessoes` antigas (campos: `herdeiros` JSON, `titular_indicado`)
2. Para cada: cria registros em `sucessao_herdeiros` (parsing do JSON), `sucessao_documentos` (se houver arquivos legados)
3. Define `estado` baseado em heurística: tem `titular_indicado` + docs → `Validada`; só herdeiros → `Em_analise`; vazio → `Solicitada`
4. Cria `sucessao_historico` inicial: `Solicitada → estado_atual`
5. Atualiza `lock_version = 1`

**Rollback:** `down()` remove dados criados pela migração (marca `deleted_at`).

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| Complexidade da máquina de estados pode gerar bugs de transição inválida | State machine centralizada (`SucessaoStateMachine`), testes exaustivos de transições, `lock_version` |
| Parametrização por tenant pode virar "spaghetti config" | Config centralizada em `sucessao_config` JSON schema validado, service dedicado `SucessaoConfigService` |
| Upload de documentos grandes pode estourar memory/timeout | Streaming upload via `FileUpload` @sysgov/ui (chunked), processamento assíncrono via job |
| LGPD: vazamento de documentos sensíveis | Hash SHA-256, URLs assinadas (signed URLs) com expiração curta, policy de download auditado |
| Concorrência em transições simultâneas | `lock_version` otimista + row lock (`SELECT FOR UPDATE`) em `transicionar()` |
| Performance de dashboard com muitos processos | Índices compostos, paginação server-side, cache Redis para contagens (`sucessao:pendentes:{tenant_id}`) |
| Ordem de prioridade configurável pode conflitar com legislação municipal | Validação no `CadeiaSucessoriaService` lança warning se config diverge de padrão conhecido; documentar que tenant assume responsabilidade |
| Base legal placeholder `[LEI/DECRETO MUNICIPAL...]` precisa ser confirmada | Documentar como pergunta aberta; config `base_legal` obrigatória no `sucessao_config` |

## Migration Plan

1. **Backend:**
   - `php artisan make:module Cemiterio` (já existe — estender via migrations adicionais)
   - Criar 4 migrations na ordem: `sucessoes` (alter table + novos campos), `sucessao_herdeiros`, `sucessao_documentos`, `sucessao_historico`
   - Models, Enums, Services, Policies, Controllers, FormRequests, Events, Jobs
   - Registrar routes em `Modules/Cemiterio/Http/routes/api.php`
   - Config `sucessao_config` default em `Modules/Cemiterio/Config/sucessao.php`
   - Seed de config default para tenants existentes
   - Rodar `php artisan migrate`, `php artisan test --filter=Cemiterio`

2. **Frontend:**
   - Atualizar `@sysgov/sdk` com novos tipos
   - Evoluir `SucessaoView.tsx` + componentes filhos
   - Registrar rotas lazy em `moduleRegistry.ts` (já existe permissão `cemiterios.concessoes.manage` → adicionar `cemiterios.sucessao.manage`)
   - `npm run build` no `web-client`, `tsc --noEmit` limpo

3. **Deploy:**
   - Feature flag `cemiterio.sucessao_v2` (default off)
   - Deploy backend + frontend
   - Ativar flag por tenant (canary)
   - Migração de dados legados via comando artisan
   - Monitoramento: logs `audit_logs`, métricas de transições, erros 5xx

4. **Rollback:**
   - Desativar feature flag
   - Reverter migrations (soft delete preserva dados)
   - Frontend: deploy versão anterior

## Open Questions

1. **Lei/Decreto Municipal de Araucária/PR:** Qual a norma específica que rege sucessão de jazigos? (ordem de prioridade, prazos, documentos por via, ITCD). Necessário para popular `sucessao_config` default correto.
2. **Portal do concessionário:** A sucessão será iniciada/acompanhada também pelo concessionário no portal público? Se sim, API precisa endpoints públicos com autenticação JWT (Sanctum token) e escopo reduzido.
3. **Integração cartórios:** Há previsão de integração com CRC/Registro Civil para validação automática de certidões? Impacta design de `DocumentoSucessaoService`.
4. **Prazo padrão de regularização:** 120 dias é o padrão aceito ou o município usa outro valor (180, 365)?
5. **Ordem de prioridade fixa vs configurável:** A ordem `companheiro → filhos → pais` é lei federal ou municipal? Se federal, pode ser constante; se municipal, deve ser configurável.
6. **Representação (art. 1.793 CC):** O município aceita cessão de direitos hereditários? Se sim, fluxo de transferência precisa UI específica.