# Design

## Context

O Módulo de Requerimentos é um módulo novo, sem código pré-existente. Ele deve ser criado seguindo os padrões estabelecidos no [`CODING_STANDARD.md`](../../CODING_STANDARD.md) e no [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md), utilizando a stack definida: Laravel 13 (Backend), React 19 + TypeScript + Tailwind CSS v4 (Frontend), com componentes exclusivamente do `@sysgov/ui`.

O módulo opera sobre a base de dados única mantida pelo Cadastro Único Centralizado (entidades como vereadores, servidores, comissões, secretarias) e integra-se com dois módulos existentes:
- **Workflow** (`Modules/Workflow`): para automação de etapas de tramitação interna
- **Processo Administrativo Digital** (`Modules/ProcessoAdministrativo`): para vinculação bidirecional com processos

## Goals / Non-Goals

**Goals:**
- Criar o módulo Laravel `Requerimentos` completo, com migrations, models, services, controllers, policies, events, listeners, jobs e seeders.
- Implementar cadastro tipificado de proposições com numeração sequencial por tipo/exercício.
- Implementar tramitação eletrônica entre Câmara e Prefeitura com controle de prazos.
- Implementar tramitação interna com suporte ao módulo de Workflow.
- Implementar notificações assíncronas via Laravel Queue (Redis).
- Implementar painel público (web) e área do autor (web-client).
- Implementar relatórios gerenciais e trilha de auditoria.
- Garantir segregação de acesso por Poder e por perfil.
- Garantir conformidade com LGPD e expor APIs para Diário Oficial e Assinatura Digital.

**Non-Goals:**
- Não alterar módulos existentes (Workflow, Processo Administrativo, Cadastro Único).
- Não implementar editor de texto WYSIWYG do zero (usar componente existente ou integrar biblioteca open-source compatível).
- Não substituir a infraestrutura de autenticação/autorização do núcleo.
- Não criar sistema de workflow próprio (reutilizar `Modules/Workflow`).

## Decisions

### 1. Módulo Laravel com nwidart/laravel-modules

**Decisão**: Criar o módulo como `Modules/Requerimentos` usando `nwidart/laravel-modules`, seguindo o mesmo padrão dos módulos `Capd`, `Cemiterio`, `Finance`, `Licita`.

**Racional**: Padronização com a arquitetura existente. O comando `php artisan make:module Requerimentos` gera o scaffold base.

**Alternativas**: Criar como serviço avulso fora da estrutura de módulos. Rejeitado por quebrar a consistência arquitetural do projeto.

### 2. Tramitação entre Poderes como modelo próprio

**Decisão**: A tramitação entre Poderes será modelada como entidade `TramitacaoPoderes` (tabela `requerimentos_tramitacoes_poderes`), separada da tramitação interna (`TramitacaoInterna` / Workflow). Cada tramitação entre Poderes possui: origem, destino, responsável, prazo, status e resposta vinculada.

**Racional**: A tramitação entre Poderes tem semântica e ciclo de vida distintos da tramitação interna (etapas legislativas). Separar evita acoplamento e simplifica o controle de prazos regimentais e a segregação de acesso por Poder.

**Alternativas**: Unificar tramitação interna e entre Poderes em um único modelo. Rejeitado por complexidade desnecessária e dificuldade de segregar acesso.

### 3. Numeração sequencial com trava otimista

**Decisão**: A numeração sequencial por tipo e exercício será implementada com `DB::transaction()` + `lockForUpdate()` na tabela de contadores (`requerimentos_contadores`), garantindo atomicidade mesmo sob concorrência.

**Racional**: Evita números duplicados em cenários de múltiplos usuários criando proposições simultaneamente.

**Alternativas**: Auto-increment do MySQL. Rejeitado por não permitir reinício por exercício. Sequence do PostgreSQL. Rejeitado por dependência de MySQL 8.4.

### 4. Notificações via Events + Listeners + Jobs

**Decisão**: Utilizar eventos do Laravel (`ProposicaoCriada`, `ProposicaoStatusChanged`, `TramitacaoEncaminhada`, `TramitacaoRespondida`, `PrazoProximo`, `PrazoVencido`) com listeners que disparam Jobs em fila Redis para envio de notificações.

**Racional**: Desacopla a lógica de negócio do envio de notificações. Garante que a experiência do usuário não seja impactada por latências de e-mail. Permite retry com backoff exponencial em caso de falha.

**Alternativas**: Notificações síncronas no controller. Rejeitado por risco de timeout e má experiência do usuário.

### 5. Integração com Workflow via interface/contrato

**Decisão**: A tramitação interna consumirá o módulo de Workflow através de uma interface `WorkflowInterface` que abstrai as chamadas ao workflow. O módulo de Requerimentos não conhece detalhes internos do Workflow, apenas consome seus serviços.

**Racional**: Baixo acoplamento. Se o módulo de Workflow evoluir ou for substituído, apenas o adapter precisa ser atualizado.

**Alternativas**: Chamadas diretas ao Workflow. Rejeitado por acoplamento excessivo.

### 6. Painel público como rota separada no app `web`

**Decisão**: O painel público será implementado em `apps/web` (portal institucional/transparência) como páginas públicas sem autenticação, consumindo endpoints públicos da API. A área do autor ficará em `apps/web-client` (autenticado, com segregação por perfil).

**Racional**: Separação clara entre o que é público (transparência) e o que é restrito (área do autor). Segue o padrão existente de `apps/web` para portal e `apps/web-client` para área autenticada.

**Alternativas**: Tudo no web-client com rotas públicas. Rejeitado por misturar contextos e dificultar cache/CDN para páginas públicas.

### 7. Relatórios com queries otimizadas e cache

**Decisão**: Relatórios gerenciais utilizarão queries SQL otimizadas com agregações no banco (MySQL 8.4), com cache em Redis (TTL de 1 hora) para relatórios pesados. Exportação em PDF/Excel via Jobs em fila para relatórios grandes.

**Racional**: Performance em grandes volumes de dados. Evita timeouts em requisições HTTP para relatórios pesados.

**Alternativas**: Processamento em PHP. Rejeitado por ineficiência em escala.

### 8. Criptografia LGPD com AES-256

**Decisão**: Dados pessoais em proposições (CPF, RG, endereço, telefone) serão criptografados com AES-256-CBC usando a chave `APP_KEY` do Laravel via `Encryption` facade. Dados são mascarados automaticamente no painel público.

**Racional**: Conformidade com LGPD. Reutiliza a infraestrutura de criptografia nativa do Laravel sem dependências adicionais.

**Alternativas**: Criptografia a nível de coluna no MySQL. Rejeitado por complexidade operacional e menor flexibilidade.

## Risks / Trade-offs

- **Dependência do módulo de Workflow**: Se o Workflow não estiver maduro ou apresentar bugs, a tramitação interna é impactada. → **Mitigação**: A interface `WorkflowInterface` permite mock em testes e fallback para tramitação manual se necessário.
- **Volume de notificações**: O disparo massivo de e-mails pode ser marcado como spam. → **Mitigação**: Utilizar filas com rate limiting e permitir configuração de agregador de notificações (digest diário).
- **Concorrência na numeração**: Sob carga extrema, a trava `lockForUpdate()` pode gerar contenção. → **Mitigação**: A tabela de contadores é enxuta e a operação é rápida. Monitorar e, se necessário, implementar pré-alocação de lotes.
- **Complexidade da segregação por Poder**: A lógica de visibilidade compartilhada vs. restrita pode gerar bugs de vazamento de informação. → **Mitigação**: Cobertura de testes exaustiva para todas as combinações de Poder × Perfil × Status.