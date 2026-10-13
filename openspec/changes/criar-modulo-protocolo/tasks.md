# Tasks

> Pré-condição de cada sessão (AGENTS.md §5): `git fetch origin`, `git status`, `git log main..origin/main` e `git pull --ff-only` antes de editar código.

## 1. Scaffolding do módulo

- [x] 1.1 Executar `php artisan make:module Protocolo` em `apps/api` e verificar que a estrutura padrão (Database/Migrations, Http/{Controllers,Requests}, Models, Policies, Providers, Routes, Services, Tests, module.json) e o teste de isolamento de tenant gerado existem e passam (`php artisan test --filter=Protocolo`)
- [x] 1.2 Ajustar `module.json`: `requires: ["Admin","OrgChart","Pessoas"]`, menu (label "Protocolo", ícone lucide `FolderOpen`, permissão `protocolo.processos.view`) e as 10 permissões (`protocolo.processos.{view,create,update,tramitar,vincular,promover_requerimento,rastrear,relatorios,delete}`, `protocolo.tipos_tramitacao.manage`); verificar com o teste de catálogo de módulos/permissões existente

## 2. Serviço transversal de atributos dinâmicos

- [x] 2.1 Criar `App\Support\AtributosDinamicos\TipoAtributo` (enum dos 7 tipos) e `ValidadorAtributo` com as regras do design D8 (decimal como string, nunca float); verificar com testes unitários cobrindo valor válido e inválido de cada tipo
- [x] 2.2 Documentar o uso do serviço em `docs/modules/atributos-dinamicos.md` e verificar que o exemplo do documento corresponde à assinatura real

## 3. Banco de dados e models

- [x] 3.1 Criar migrations `protocolo_tipos_tramitacao`, `protocolo_sequencias`, `protocolo_processos`, `protocolo_andamentos` (com coluna gerada `and_atual_chave` + UNIQUE), `protocolo_documentos`, `protocolo_atributos`, `protocolo_vinculos`, com `tenant_id`, FKs (`org_units`, `pessoas`, `users`, auto-referência), índices compostos iniciados por tenant e soft deletes conforme D1; verificar com `php artisan migrate:fresh` e rollback limpo
- [x] 3.2 Criar models `Processo`, `TipoTramitacao`, `Sequencia`, `Andamento`, `Documento`, `Atributo`, `Vinculo` com `TenantAware`, casts, relações (pai/filhos, andamentos, atual, último, interessado, órgãos) e factories; verificar com teste de isolamento por tenant em cada model
- [x] 3.3 Implementar a guarda de imutabilidade em `Andamento` (bloqueio de `updating` exceto transições de datas/flag e bloqueio de `deleting`); verificar com testes que tentam editar descrição, regravar `data_recebimento` e excluir
- [x] 3.4 Criar seeder idempotente dos 6 tipos iniciais com `efeito_status` (D4) executado na habilitação do módulo por tenant e comando para tenants existentes; verificar com teste que roda o seeder duas vezes sem duplicar

## 4. Numeração e abertura de processo

- [x] 4.1 Implementar `NumeracaoService` com `protocolo_sequencias` + `lockForUpdate` (D2); verificar com testes de sequência, reinício anual, isolamento por tenant e teste de concorrência (processos paralelos sem número duplicado)
- [x] 4.2 Implementar `ProcessoService::abrir()` com cascata atômica (numeração, processo, atributos, documentos, andamento inicial, auditoria) e compensação de arquivos (D5); verificar com teste de sucesso e teste de falha injetada que confirma ausência de registros, de arquivos e de consumo do número
- [x] 4.3 Criar `StoreProcessoRequest`/`UpdateProcessoRequest` (origem obrigatória `externa|interna`, órgãos e pai do mesmo tenant, `numero` descartado, documentos com mime/tamanho, atributos via `ValidadorAtributo`) e validação de ciclo pai-filho; verificar com testes de 422 para cada regra
- [x] 4.4 Implementar `ProcessoController` (index com busca por número/assunto/interessado e filtros status/órgão/origem, show, store, update, destroy com soft delete e 409 para filhos ativos, filhos) e `ProcessoPolicy` com `OrgScope` (D9); verificar com testes de feature de 403, 404 cross-tenant, escopo por unidade e auditoria `before/after`

## 5. Tramitação

- [x] 5.1 Implementar `TramitacaoService::tramitar()` com lock no processo, fechamento do andamento atual, novo andamento com sequência, atualização de `orgao_atual_id`, `ultimo_andamento_id`, `status`/`data_conclusao` e auditoria (D3/D4); verificar com testes de tramitação, 409 em concorrência, bloqueio de processo concluído e invariante de andamento atual único
- [x] 5.2 Implementar `receber()` (somente órgão de destino, data preenchida uma vez) e endpoints `POST /andamentos`, `POST /andamentos/atual/receber`, `GET /andamentos`; verificar com testes de 403 para outro órgão e 422 para recebimento duplicado
- [x] 5.3 Implementar consultas de localização e de tempo de permanência (em trânsito, em posse, encerrado) e `GET /prazos/excedidos` (dias corridos, tipos sem prazo ignorados); verificar com testes usando `Carbon::setTestNow` para os cenários da spec
- [x] 5.4 Implementar CRUD de tipos de tramitação com `TipoTramitacaoPolicy`, slug único por tenant, soft delete e rejeição de tipo inativo em andamentos; verificar com testes de feature

## 6. Documentos e atributos

- [x] 6.1 Implementar upload/listagem/download de documentos com armazenamento `tenants/{tenant_id}/protocolo/...`, hash SHA-256, validação de mime real e sem sobrescrita; verificar com testes usando `Storage::fake` (tipo inválido, tamanho excedido, download cross-tenant 404, hash conferido)
- [x] 6.2 Implementar endpoints de atributos (adicionar, listar, remover) com chave única por processo e validação por tipo; verificar com testes de feature para os 7 tipos

## 7. Vínculos polimórficos e promoção

- [x] 7.1 Criar contrato `EntidadeVinculavel` e `VinculoRegistry` (D6); verificar com teste unitário de registro/resolução de handler
- [x] 7.2 Implementar endpoints de vínculos (criar, listar, remover, consulta reversa por entidade), regex de `entidade_tipo`, 409 para duplicado e para remoção de vínculo `origem`; verificar com testes de feature, incluindo tipo sem handler aceito
- [x] 7.3 Implementar `PromocaoService` e `POST /processos/promover-requerimento` (D7) com permissão `promover_requerimento`; verificar com testes usando handler fake: sucesso, 404, 409 já promovido, 422 sem handler e rollback quando `aoPromover()` falha
- [x] 7.4 Implementar `RequerimentoVinculavel` em `Modules/Requerimentos` e registro condicional no `RequerimentosServiceProvider`; verificar com teste de integração que confirma `vinculacao_processo_id` atualizado e com a suíte do Requerimentos verde com o Protocolo desabilitado

## 8. Dashboard

- [x] 8.1 Implementar `GET /dashboard` (contagens por órgão/status/origem, tempo médio de tramitação, permanência média por órgão, prazos excedidos por órgão, filtro de período, escopo `OrgScope`); verificar com testes de feature com dados semeados e período vazio

## 9. Qualidade do backend

- [x] 9.1 Rodar `composer test` e PHPStan nível 6 (baseline) no módulo e corrigir até zero erros novos; verificar pela saída limpa de ambos
- [x] 9.2 Documentar o módulo em `docs/modules/protocolo.md` (endpoints, permissões, contrato de vínculo para módulos consumidores) e verificar que os endpoints listados batem com `php artisan route:list --path=protocolo`

## 10. SDK e componentes compartilhados

- [x] 10.1 Adicionar tipos e cliente do Protocolo em `packages/sdk` (processo, andamento, documento, atributo, vínculo, localização, permanência, dashboard); verificar com `tsc --noEmit` no pacote
- [x] 10.2 Verificar em `packages/ui/src/index.ts` os componentes necessários; criar em `packages/ui` os ausentes (ex.: Stepper, Timeline) seguindo `packages/ui/README.md`; verificar com build/tsc do pacote

## 11. Frontend web-client

- [x] 11.1 Criar `apps/web-client/src/modules/protocolo/ProtocoloModule.tsx` com rotas internas lazy e regenerar o registry com `npm run generate:registry`; verificar que a entrada `protocolo` aparece com `requiredPermission: 'protocolo.processos.view'` e é protegida por `ModuleRouteGuard`
- [x] 11.2 Implementar listagem com busca e filtros (status, órgão, origem) e badges de status; verificar manualmente no navegador (porta 5174) e com `tsc --noEmit`
- [x] 11.3 Implementar wizard de criação em 5 etapas (dados gerais com origem → interessado via Pessoas → documentos → atributos → primeiro andamento) enviando requisição única multipart; verificar criação ponta a ponta e exibição de erros 422 por etapa
- [x] 11.4 Implementar fluxo "Promover Requerimento a Processo" (seleção de requerimento, confirmação em `Modal`); verificar promoção e mensagem de 409
- [x] 11.5 Implementar detalhe do processo com abas (andamentos em timeline, documentos, atributos, vínculos, filhos), tela de tramitação/recebimento, rastreamento e tempo de permanência, com números/datas/durações em `font-mono tabular-nums`; verificar fluxo completo no navegador
- [x] 11.6 Implementar dashboard (KpiCards e gráficos por órgão/status/origem, prazos excedidos) e tela de tipos de tramitação; verificar com usuário com e sem `protocolo.processos.relatorios`
- [x] 11.7 Rodar `tsc --noEmit` e `vite build` do web-client e verificar que o módulo é gerado como chunk lazy separado

## 12. Integração final

- [x] 12.1 Executar `npm test` e `composer test` completos e um roteiro manual: abrir processo interno, abrir externo via promoção, tramitar entre dois órgãos, receber, concluir e conferir dashboard e `audit_logs`; verificar todos verdes e o roteiro sem erros
- [x] 12.2 Executar `graphify update .` e commitar com Conventional Commits (`feat(protocolo): ...`); verificar `git status` limpo antes do push

