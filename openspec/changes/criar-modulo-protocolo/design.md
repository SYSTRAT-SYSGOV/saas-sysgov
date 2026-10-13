# Design

## Context

Ver `proposal.md` (Why) para a motivação e `specs/protocolo/*` para os requisitos. Estado atual relevante observado no repositório:

- Núcleos disponíveis: `App\Models\Concerns\TenantAware`, `App\Support\AuditLogger::record(module, action, resource, before, after)`, `App\Support\OutboxPublisher`, `App\Support\Money`, `App\Support\OrgScope` (ABAC por unidade — ADR-0003) e o comando `php artisan make:module {name}` (`app/Console/Commands/MakeModule.php`).
- Estrutura organizacional: `Modules\OrgChart\Models\OrgUnit` (tabela `org_units`) e `OrgUnitUser` (`org_unit_user`).
- Identidade: `Modules\Pessoas\Models\Pessoa` (tabela `pessoas`, soft delete, TenantAware).
- Requerimentos: `Modules\Requerimentos\Models\Proposicao` já possui `vinculacao_processo_id` (inteiro nulo, sem FK) e um contador por exercício (`requerimentos_contadores`), precedente para a numeração. O módulo tramita **proposições legislativas** Câmara ↔ Prefeitura.
- Convenção de tabelas: prefixo do módulo (`licita_processos`, `requerimentos_vinculacoes`). `Modules\Licita\Models\Processo` já existe — o nome de classe `Processo` é seguro por namespace, mas a tabela não pode ser `processos` genérica.
- Frontend: `apps/web-client/src/config/moduleRegistry.ts` reexporta `moduleRegistry.generated.ts`, gerado por `scripts/generate-module-registry.js` (`npm run generate:registry`) a partir de `apps/api/Modules/*/module.json` e `apps/web-client/src/modules/*`. Menus vêm do backend (ADR-0006).

## Goals / Non-Goals

**Goals:**
- Núcleo de processos genérico, sem conhecer módulos consumidores, extensível sem migration.
- Integridade forte em concorrência (numeração e andamento atual) garantida pelo banco, não só pela aplicação.
- Histórico de tramitação auditável e imutável, com métricas de permanência derivadas de dados brutos.

**Non-Goals:**
- Motor de workflow configurável (fluxos são sequenciais por andamento).
- Notificações por e-mail/push e chamadas externas (Outbox não é usado em v1; eventos de domínio Laravel internos podem ser emitidos para uso futuro).
- Catálogo/definição de atributos por tipo de processo (v1 valida o valor por tipo; definições configuráveis ficam para depois).
- Valores monetários (nenhum campo monetário em v1; se surgir, `App\Support\Money`).

## Decisions

### D1. Tabelas com prefixo `protocolo_`
Mapeamento dos nomes lógicos solicitados para os nomes físicos:

| Nome lógico | Tabela física |
|---|---|
| processos | `protocolo_processos` |
| processo_tipos_tramitacao | `protocolo_tipos_tramitacao` |
| processo_andamentos | `protocolo_andamentos` |
| processo_documentos | `protocolo_documentos` |
| processo_atributos | `protocolo_atributos` |
| processo_vinculos | `protocolo_vinculos` |
| (nova) sequência | `protocolo_sequencias` |

Colunas conforme a solicitação, acrescidas de: `deleted_at` em processos, tipos, documentos; `prazo_dias` (nullable) e `efeito_status` (nullable, enum de status) em tipos; `usuario_recebedor_id` em andamentos; `tamanho_bytes` e `mime_type` em documentos. **Alternativa**: nomes sem prefixo — rejeitada por colisão semântica com `licita_processos` e por divergir da convenção do repositório.

Índices: `(tenant_id, ano, numero)` UNIQUE; `(tenant_id, status)`, `(tenant_id, orgao_atual_id)`, `(tenant_id, origem)`, `(tenant_id, processo_pai_id)`, FULLTEXT em `assunto`; andamentos `(tenant_id, processo_id, sequencia)` UNIQUE; tipos `(tenant_id, slug)` UNIQUE; atributos `(tenant_id, processo_id, chave)` UNIQUE; vínculos `(tenant_id, entidade_tipo, entidade_id)`, `(tenant_id, processo_id)` e UNIQUE `(tenant_id, processo_id, entidade_tipo, entidade_id, papel_vinculo)`.

### D2. Numeração com tabela de sequência e `SELECT ... FOR UPDATE` (ADR-009)
`protocolo_sequencias (tenant_id, ano, ultimo_numero)` UNIQUE `(tenant_id, ano)`. Dentro da transação de criação: `insertOrIgnore` da linha do ano, `lockForUpdate()`, incremento, gravação. Como a geração ocorre dentro da mesma `DB::transaction` da cascata, um rollback devolve o número (sem lacunas). O UNIQUE em processos é rede de segurança. `numero` é inteiro; a máscara `NNNN/AAAA` é formatada na apresentação (`str_pad` 4 dígitos; acima de 9999 cresce naturalmente). **Alternativas**: `MAX(numero)+1` (corrida), AUTO_INCREMENT (não reinicia por ano/tenant), Redis INCR (fora da transação, gera lacunas).

### D3. Andamento atual único garantido pelo banco (ADR-010)
MySQL não tem índice parcial; usa-se coluna gerada `and_atual_chave` = `IF(and_atual, processo_id, NULL)` STORED com UNIQUE `(tenant_id, and_atual_chave)`. A tramitação faz `lockForUpdate()` na linha do processo, fecha o andamento atual (`data_envio=now`, `and_atual=false`), cria o novo (`and_atual=true`, `sequencia = max+1`), atualiza `orgao_atual_id`, `ultimo_andamento_id` e `status`. Violação de unicidade ou lock em disputa → HTTP 409.

Semântica das datas: no andamento novo, `data_recebimento` fica nula até o órgão de destino confirmar (endpoint `receber`); `data_envio` é preenchida quando o processo sai. Permanência = `data_envio − data_recebimento`; em trânsito = `data_recebimento − created_at`. O andamento inicial da criação nasce com `data_recebimento = data_abertura` (o órgão de origem já detém o processo).

Imutabilidade: o model `Andamento` bloqueia `updating` exceto transições `data_recebimento: null→valor` e `data_envio: null→valor` (e `and_atual: true→false` junto com `data_envio`); `deleting` sempre lança exceção. Não há rotas de update/delete de andamento.

### D4. Status denormalizado em `protocolo_processos.status`
O status é coluna (para filtros e índices) atualizada somente pelo `TramitacaoService` a partir de `efeito_status` do tipo; se nulo, `aberto → em_tramitacao`, demais mantidos. Seed: `entrada→aberto`, `despacho/encaminhamento/parecer/aprovacao→null`, `conclusao→concluido`. `aguardando` e `arquivado` exigem tipos criados pelo tenant com esse efeito (ver Open Questions). **Alternativa**: calcular sempre via join no último andamento — rejeitada por custo em listagens/dashboard.

### D5. Cascata atômica com compensação de arquivos
`ProcessoService::abrir()` envolve numeração, processo, atributos, documentos e andamento inicial em `DB::transaction`. Arquivos são gravados no disco antes do commit em `tenants/{tenant_id}/protocolo/{ano}/{uuid}`; em caso de exceção, um bloco `catch` remove os arquivos já gravados e relança (o storage não é transacional). Auditoria (`AuditLogger::record`) é chamada dentro da transação para que o log só exista se o commit ocorrer.

### D6. Vínculo polimórfico com registro de handlers (ADR-008)
`protocolo_vinculos` guarda `entidade_tipo` (string livre, `^[a-z][a-z0-9_]{1,63}$`) e `entidade_id` sem FK. Não se usa `morphTo` do Eloquent com nomes de classe (evita acoplar o banco a FQCNs de outros módulos). O Protocolo expõe o contrato `Modules\Protocolo\Contracts\EntidadeVinculavel` e o singleton `VinculoRegistry`:

- `existe(int $entidadeId): bool` — valida a entidade no tenant atual;
- `aoPromover(int $entidadeId, int $processoId): void` — efeito colateral transacional (opcional);
- `jaPromovida(int $entidadeId): bool`;
- `resumo(int $entidadeId): array` — rótulo para exibição na aba Vínculos.

Vínculos com `entidade_tipo` **sem handler registrado** são aceitos (integração mínima: gravar o par tipo/id). Promoção exige handler.

### D7. Promoção de requerimento
`POST /api/protocolo/processos/promover-requerimento { requerimento_id, assunto?, orgao_destino_id, ... }`. `PromocaoService` dentro de `DB::transaction`: resolve handler `requerimento` (ausente → 422), `existe()` (falso → 404), `jaPromovida()` ou vínculo de origem existente (→ 409), `ProcessoService::abrir(origem: externa)`, cria vínculo `papel_vinculo='origem'`, chama `aoPromover()`. No módulo Requerimentos, `RequerimentoVinculavel` implementa o contrato com `Proposicao::lockForUpdate()` e grava `vinculacao_processo_id`; é registrado no `RequerimentosServiceProvider` apenas se `Module::isEnabled('Protocolo')` e a interface existir — dependência **reversa e opcional**, o Protocolo não referencia classes do Requerimentos. `entidade_tipo='requerimento'` mapeia para `Proposicao` (ver Open Questions).

### D8. Atributos dinâmicos como serviço transversal (ADR-011)
Catálogo de tipos e validação ficam em `App\Support\AtributosDinamicos` (enum `TipoAtributo` + `ValidadorAtributo`), sem persistência; cada módulo persiste em sua própria tabela (`protocolo_atributos.valor` JSON). Regras: `numerico` inteiro; `decimal` string `^-?\d+(\.\d{1,6})?$` armazenada como string (nunca float); `data` ISO `Y-m-d` válida; `texto` ≤ 255; `texto_longo` ≤ 65 535; `lista` string; `lista_multipla` array de strings não vazio e sem duplicatas. **Alternativa**: módulo próprio "Atributos" — rejeitado por ser prematuro (política de adiar extrações).

### D9. Autorização: RBAC + ABAC por unidade
`ProcessoPolicy` com as 9 habilidades solicitadas + `TipoTramitacaoPolicy` (`protocolo.tipos_tramitacao.manage`). Listagens aplicam `OrgScope::applyToQuery` sobre `orgao_atual_id` OU `orgao_origem_id`; ações sobre o objeto usam `OrgScope::canAccessOrgUnit`. Tramitar/receber exige pertencer ao órgão atual/destino (via `org_unit_user`) ou escopo global. Permissões e menu declarados em `module.json` (ADR-0006).

### D10. API REST (prefixo `/api/protocolo`, middleware `auth:sanctum`, `ResolveTenant`)
- `GET/POST /processos`, `GET/PATCH/DELETE /processos/{id}`, `GET /processos/{id}/filhos`
- `POST /processos/{id}/andamentos`, `POST /processos/{id}/andamentos/atual/receber`, `GET /processos/{id}/andamentos`
- `GET /processos/{id}/localizacao`, `GET /processos/{id}/permanencia`
- `GET/POST /processos/{id}/documentos`, `GET /documentos/{id}/download`
- `GET/POST/DELETE /processos/{id}/atributos[/{chave}]`
- `GET/POST/DELETE /processos/{id}/vinculos[/{vinculo}]`, `GET /vinculos?entidade_tipo=&entidade_id=`
- `POST /processos/promover-requerimento`
- `GET /prazos/excedidos`, `GET /dashboard`
- `GET/POST/PATCH/DELETE /tipos-tramitacao`

Criação via `multipart/form-data` (documentos) ou JSON + uploads separados — o wizard envia tudo em uma única requisição multipart para preservar a atomicidade.

### D11. Frontend `web-client`
`apps/web-client/src/modules/protocolo/ProtocoloModule.tsx` (lazy) com rotas internas: listagem, `novo` (wizard em 5 etapas), `promover`, `:id` (abas Andamentos, Documentos, Atributos, Vínculos, Filhos), `:id/tramitar`, `:id/rastreamento`, `:id/permanencia`, `dashboard`, `tipos`. Entrada no registry via `module.json` + `npm run generate:registry` (o arquivo `.generated.ts` não é editado à mão), com `requiredPermission: 'protocolo.processos.view'` e proteção por `ModuleRouteGuard`. Componentes exclusivamente de `@sysgov/ui` (Card, Button, Badge, Modal, KpiCard, Tabs, Table, Select, Input…); componente ausente (ex.: Stepper, Timeline) é criado em `packages/ui` conforme `packages/ui/README.md`. Paleta GOV.BR do web-client; números de processo, datas, durações e contadores em `font-mono tabular-nums`. Tipos e cliente em `packages/sdk` (`protocolo.ts`).

### D12. Outbox
Nenhuma integração externa em v1, portanto nada é publicado no Outbox. Eventos de domínio internos (`ProcessoAberto`, `ProcessoTramitado`, `ProcessoPromovido`) são disparados após commit (`afterCommit`) para futuros consumidores; integrações futuras deverão publicar via `OutboxPublisher`.

## Risks / Trade-offs

- [Lock na linha de sequência serializa aberturas do mesmo tenant/ano] → transação curta; volume municipal esperado é baixo; monitorar tempo de espera de lock.
- [Vínculo sem FK permite `entidade_id` órfão] → validação via handler quando existir; tela de vínculos marca como "não resolvido" quando `resumo()` falha; aceito em troca do desacoplamento.
- [Arquivos órfãos se o processo morrer entre gravação e rollback] → compensação no `catch` + comando agendado futuro de limpeza por varredura de caminhos sem registro (anotado, não implementado em v1).
- [Status denormalizado divergir do histórico] → única via de escrita é o `TramitacaoService`; teste de invariantes (status = efeito do último andamento).
- [Dependência reversa Requerimentos → Protocolo] → registro condicional e por interface; testes do Requerimentos rodam com Protocolo desabilitado.
- [Semântica de "requerimento" ≠ proposição legislativa] → registrado em Open Questions; o contrato permite outro handler (ex.: requerimento de cidadão) sem mudar o Protocolo.

## Migration Plan

1. `php artisan make:module Protocolo`; migrations aditivas (sem alterar tabelas existentes).
2. Seeder de tipos de tramitação executado por tenant na habilitação do módulo (e comando idempotente para tenants existentes).
3. Habilitação por tenant pelo catálogo de módulos; sem migração de dados legados em v1.
4. Rollback: desabilitar o módulo para o tenant; `migrate:rollback` das migrations do módulo não afeta outros módulos (o handler do Requerimentos deixa de registrar-se).

## Open Questions

1. **Prazos**: valores de `prazo_dias` por tipo de tramitação e se a contagem é em dias corridos ou úteis (com calendário de feriados municipais). v1: dias corridos, prazo nulo = sem controle.
2. **Requerimento**: `entidade_tipo='requerimento'` deve mapear para `Proposicao` do módulo Requerimentos (legislativo) ou haverá um módulo de requerimentos do cidadão (portal)? v1 mapeia para `Proposicao`.
3. **Documentos**: extensões permitidas e tamanho máximo (proposta v1: PDF, PNG, JPG, DOCX, ODT, XLSX; 20 MB por arquivo), política de retenção/temporalidade (tabela de temporalidade CONARQ) e antivírus.
4. **Status `aguardando`/`arquivado`**: incluir tipos `sobrestamento` e `arquivamento` no seed padrão? v1 depende de criação pelo tenant.
5. **Fuso horário** para determinar o ano da numeração (proposta: `America/Sao_Paulo`).
6. **Opções de `lista`/`lista_multipla`**: haverá catálogo de opções por chave? v1 valida apenas estrutura.
7. **Acesso público/LAI**: consulta pública de andamento por número (Lei 14.129/2021, art. 3º) — fora de v1, confirmar priorização.
8. **Base legal municipal**: decreto/regulamento local de protocolo e prazos a referenciar.
