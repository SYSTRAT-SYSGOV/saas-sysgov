# Módulo de Sucessão Hereditária (Cemitérios — RF-SUCESSAO)

> Documentação do fluxo de sucessão hereditária de concessões de jazigos/gavetas dentro do
> módulo `Modules/Cemiterios`. Cobre: modelo de dados, máquina de estados, regras de negócio,
> endpoints da API, permissões, exceções e configuração por tenant.

## 1. Modelo de Dados

```
┌────────────────────────────────────────────────────────────────────────┐
│                              sucessoes                                 │
│ id, tenant_id, concession_id, park_id, plot_id,                        │
│ via (enum), estado (enum, default solicitada),                         │
│ requerente_id, titular_falecido_id, data_falecimento,                  │
│ processo_referencia, parecer, lock_version (default 1), timestamps,    │
│ soft delete                                                            │
│ UNIQUE(tenant_id, concession_id, estado)                               │
└───────┬───────────────────────────────┬─────────────────┬─────────────┘
        │ 1:N                           │ 1:N               │ 1:N
        ▼                               ▼                    ▼
┌───────────────────┐   ┌───────────────────────┐  ┌──────────────────────┐
│ sucessao_herdeiros │   │  sucessao_documentos   │  │  sucessao_historico   │
│ nome, parentesco,  │   │ tipo (enum), arquivo,  │  │ de_estado, para_estado│
│ documento, ordem,  │   │ hash (SHA-256)         │  │ motivo (JSON),        │
│ direito_representa-│   │ soft delete            │  │ usuario_id            │
│ cao, titular_indi- │   └───────────────────────┘  │ append-only           │
│ cado,               │                              └──────────────────────┘
│ herdeiro_representa-│
│ do_id (FK própria)  │
│ soft delete         │
└───────────────────┘
```

- Todas as quatro tabelas têm `tenant_id` com índices compostos e usam o trait `TenantAware`
  (escopo global + preenchimento automático) — nenhuma delas é acessível fora do tenant corrente.
- `sucessoes.lock_version` implementa **optimistic locking**: toda transição exige a versão
  esperada; se divergir, a operação falha com conflito (ver §5).
- `sucessao_historico` é **append-only** — nunca é atualizado ou apagado, apenas inserido a
  cada transição de estado (inclusive a abertura do processo, com `de_estado = ''`).

### Enums (`Modules\Cemiterios\Support`)

| Enum | Valores |
|---|---|
| `ViaSucessao` | `inventario_judicial`, `inventario_extrajudicial`, `alvara_judicial`, `arrolamento` |
| `EstadoSucessao` | `solicitada`, `em_analise`, `aguardando_documentos`, `validada`, `sucedida`, `indeferida`, `arquivada` |
| `TipoDocumentoSucessao` | `certidao_obito`, `inventario`, `formal_partilha`, `escritura`, `alvara`, `procuracao`, `outro` |
| `Parentesco` | `companheiro`, `filho`, `pai`, `mae`, `irmao`, `neto`, `avo`, `tio`, `sobrinho`, `outro`, `representante` |

## 2. Máquina de Estados (`SucessaoStateMachine`)

```
Solicitada ──► Em_analise ──► Aguardando_documentos ──► (volta) Em_analise
                   │                    │
                   │                    └──────────────► Arquivada
                   ▼
               Validada ──► Sucedida        (Em_analise ou Validada)
                   │                              │
                   └──────────► Indeferida ◄──────┘
                                    │
                                    ▼
                                Arquivada
```

- `Sucedida` e `Arquivada` são **estados terminais** (`isTerminal()` retorna `true`, sem
  transições de saída).
- Cada transição é executada dentro de uma `DB::transaction`, atualiza `estado` +
  `lock_version + 1` com um `UPDATE ... WHERE lock_version = :versao_esperada`, e grava uma
  linha em `sucessao_historico`. Se nenhuma linha for afetada pelo `UPDATE` (outra transição
  já mudou a versão), lança `ConflitoVersaoException` (409).
- `SucessaoService::concluir()` só é permitido a partir de `Validada`, exige um herdeiro com
  `titular_indicado = true`, transiciona para `Sucedida` e **transfere a titularidade da
  concessão** (`concessions.holder_id`) para um `Concessionario` criado/reaproveitado a partir
  do herdeiro indicado.

## 3. Regras de Negócio

| Regra | Descrição | Implementação |
|---|---|---|
| RN-SUC-001 | Um processo por concessão por vez | `SucessaoService::abrirProcesso()` rejeita abertura se já existir processo em estado não-terminal para a mesma `concession_id` |
| RN-SUC-002 | Ordem de prioridade sucessória configurável | `CadeiaSucessoriaService::validarOrdemPrioridade()` — ordem padrão (companheiro → filho → pai → mãe → irmão → neto → avô → tio → sobrinho → outro), sobrescrevível por tenant via `cemiterios.sucessao.ordem_prioridade` |
| RN-SUC-003 | Um único titular indicado | `CadeiaSucessoriaService::validarTitularUnico()` — mais de um herdeiro com `titular_indicado = true` é rejeitado |
| RN-SUC-004 | Direito de representação exige herdeiro representado | `validarDireitoRepresentacao()` — `direito_representacao = true` sem `herdeiro_representado_id` é rejeitado |
| RN-SUC-005 | Concorrência otimista em toda transição | `lock_version` obrigatório no payload de transição; divergência → 409 |
| RN-SUC-006 | Documento deduplicado por hash | `DocumentoSucessaoService::upload()` calcula SHA-256 e rejeita reenvio de arquivo idêntico no mesmo processo |
| RN-SUC-007 | Herdeiros só editáveis com processo em análise | `SucessaoService::upsertHerdeiros()` / `SucessaoHerdeiroController::destroy()` exigem `estado = em_analise` |
| RN-SUC-008 | Exclusão só em estado terminal | `SucessaoController::destroy()` só permite `sucedida`, `indeferida` ou `arquivada` |
| RN-SUC-009 | Retenção de documentos (LGPD) | `DocumentoSucessaoService::purgarExpirados()` — soft delete de documentos de processos encerrados além de `retencao_documentos_dias` (padrão 3650 dias / 10 anos) |
| RN-SUC-010 | Auditoria e Outbox em toda mutação | Todo método de `SucessaoService` grava em `audit_logs` (`AuditLogger`) e publica evento assíncrono (`OutboxPublisher`) — nunca chamada externa direta |

## 4. Endpoints da API

Prefixo `api/cemiterios`, middleware `auth:sanctum` + `tenant.resolve` + `module-access:cemiterios`
(`RouteServiceProvider` do módulo).

| Método | Rota | Ação | Permissão |
|---|---|---|---|
| GET | `/sucessoes/pendentes` | Dashboard de pendências de análise | `cemiterios.sucessao.view` |
| GET | `/sucessoes/regularizacao` | Dashboard de regularização (prazos) | `cemiterios.sucessao.view` |
| GET | `/sucessoes` | Listagem paginada com filtros (`estado`, `via`, `park_id`, `concession_id`, `data_falecimento_inicio/fim`, `q`) | `cemiterios.sucessao.view` |
| POST | `/sucessoes` | Abrir processo | `cemiterios.sucessao.manage` |
| GET | `/sucessoes/{id}` | Detalhe completo | `cemiterios.sucessao.view` |
| PUT | `/sucessoes/{id}` | Atualizar dados cadastrais (estados editáveis) | `cemiterios.sucessao.manage` |
| DELETE | `/sucessoes/{id}` | Excluir (apenas estado terminal) | `cemiterios.sucessao.manage` |
| POST | `/sucessoes/{id}/transicao` | Transicionar estado (via `SucessaoStateMachine`) | `cemiterios.sucessao.transition` |
| POST | `/sucessoes/{id}/herdeiros` | Upsert de herdeiros (substitui a lista) | `cemiterios.sucessao.manage` |
| DELETE | `/sucessoes/{id}/herdeiros/{herdeiroId}` | Remover herdeiro (processo em análise) | `cemiterios.sucessao.manage` |
| POST | `/sucessoes/{id}/documentos` | Upload de documento (multipart) | `cemiterios.sucessao.manage` |
| GET | `/sucessoes/{id}/documentos/{documentoId}` | Metadados do documento | `cemiterios.sucessao.view` |
| GET | `/sucessoes/{id}/documentos/{documentoId}/download` | URL assinada temporária (15 min) | `cemiterios.sucessao.view` |
| DELETE | `/sucessoes/{id}/documentos/{documentoId}` | Remover documento | `cemiterios.sucessao.manage` |
| GET | `/sucessoes/{id}/historico` | Histórico append-only de transições | `cemiterios.sucessao.view` |

Autorização é sempre server-side em duas camadas redundantes: `authorize()` do Form Request
(`hasPermission()`) e `AutorizaPermissao::autorizar()` no controller. O isolamento por tenant
vem do escopo global `TenantAware` — um recurso de outro tenant nunca é encontrado (404, nunca
403 nem vazamento de existência).

## 5. Exceções e Códigos HTTP

| Exceção | HTTP | Quando |
|---|---|---|
| `Illuminate\Validation\ValidationException` | 422 | Payload inválido (Form Requests) |
| `Illuminate\Auth\Access\AuthorizationException` / `abort_unless` | 403 | Usuário sem a permissão exigida |
| `Modules\Cemiterios\Support\RegraNegocioException` | 422 | Violação de regra de negócio (ver §3), com `code` legível no corpo da resposta |
| `Modules\Cemiterios\Support\ConflitoVersaoException` | 409 | `lock_version` divergente na transição (concorrência) |
| `Illuminate\Database\Eloquent\ModelNotFoundException` | 404 | Recurso inexistente ou de outro tenant |

## 6. Configuração por Tenant (`config('cemiterios.sucessao')`)

Definida em `Modules/Cemiterios/Config/config.php`, populada por tenant via `SucessaoConfigSeeder`
(tabela `tenant.config`, chave `sucessao`) e lida por `SucessaoConfigService`:

| Chave | Padrão | Uso |
|---|---|---|
| `ordem_prioridade` | companheiro, filho, pai, mãe, irmão, neto, avô, tio, sobrinho, outro | `CadeiaSucessoriaService` |
| `prazo_regularizacao_dias` | 120 | Dashboard de regularização, notificações |
| `documentos_por_via` | mapa via → tipos obrigatórios | `DocumentoSucessaoService::getDocumentosObrigatoriosPorVia()`, dashboard de pendentes |
| `direito_representacao_habilitado` | `true` | Habilita herdeiro pré-morto representado |
| `base_legal` | placeholder (ver §7) | Termo oficial / fundamentação jurídica |
| `retencao_documentos_dias` | 3650 (10 anos) | RN-SUC-009 (purge LGPD) |
| `notificacao_antecedencia_dias` | `[30, 7, 1]` | Job diário de notificação de prazo |

## 7. Pergunta em Aberto — Base Legal Municipal

O campo `base_legal` está com o valor placeholder:

```
[LEI/DECRETO MUNICIPAL DE SUCESSÃO DE JAZIGOS — CONFIRMAR]
```

**Confirmar junto à Prefeitura de Araucária/PR** (tenant piloto) qual é a lei ou decreto
municipal que rege a sucessão hereditária de concessões de jazigos/gavetas, para substituir o
placeholder por texto oficial citável nos termos gerados (`SucessaoDashboardController`,
termos de conclusão). Até a confirmação, o texto placeholder é exibido literalmente nos termos
— não deve ser tratado como fundamentação jurídica válida em produção.

## 8. Jobs Agendados (`CemiteriosServiceProvider`)

| Comando | Frequência | Função |
|---|---|---|
| `sucessao:verificar-prazos` | Diário, 08:00 (America/Sao_Paulo) | Publica eventos `PrazoRegularizacaoProximo`/`PrazoRegularizacaoVencido` via Outbox |
| `sucessao:verificar-integridade-documentos` | Diário, 02:00 | Recalcula o hash SHA-256 de cada documento e publica `SucessaoDocumentoIntegrityFailed` em caso de divergência |
| `cemiterio:migrate-sucessao-legacy` | Sob demanda (`--tenant`, `--dry-run`) | Migração idempotente dos processos legados (`ProcessoSucessao`) para o novo modelo |

## 9. Testes

Suíte completa em `Modules/Cemiterios/Tests/Feature/Sucessao*Test.php` e
`TenantIsolationTest.php` — cobre a máquina de estados (transições válidas/inválidas e
concorrência), a cadeia sucessória, o serviço principal (abertura por via, conclusão,
indeferimento, arquivamento), upload/integridade/purge de documentos, a policy por
permissão/tenant, os endpoints HTTP (auth, validação, paginação, filtros) e isolamento
multi-tenant. Rodar com `vendor/bin/phpunit --filter=Sucessao` (sqlite `:memory:`).

Frontend: `apps/web-client/src/modules/cemiterios/views/__tests__/Sucessao*.test.tsx`,
`HerdeirosTable.test.tsx`, `DocumentosUpload.test.tsx`, `HistoricoTimeline.test.tsx`
(Vitest + React Testing Library).
