# Design

## Context

Ver `proposal.md` — Why. Hoje três cadastros de pessoa física já existem de fato no SYSGOV, sem relação entre si: `App\Models\User` (conta de acesso, vinculada a tenants via `tenant_user`), `Modules\Capd\Models\Servidor` (`capd_servidores`, cadastro rico de servidor com CPF, matrícula, dados funcionais e hierarquia) e `Modules\Cemiterios\Models\Concessionario` (`concession_holders`, CPF/nome/contato do titular de concessão). Também já existe, no CAPD, o padrão de integração externa a ser reaproveitado aqui: `Modules\Capd\Models\RhIntegracao`/`RhSyncLog`/`RhIntegrationService` (config de integração por tenant com `driver` + `field_mappings`, sincronização inbound, log de sincronização) e, para efeitos assíncronos em geral, `App\Support\OutboxPublisher` + `App\Events\OutboxMessage` (processados por `php artisan outbox:process`). A criação de conta de usuário já tem um fluxo próprio e testado: `App\Services\InvitationService` (convite por e-mail, criação/vínculo de `User`, papel e tenant).

## Goals / Non-Goals

**Goals:**
- Um módulo novo, independente, que seja a base de identidade civil de pessoa física para qualquer módulo futuro que precise identificar um cidadão ou servidor.
- Reaproveitar os padrões já validados no repositório (TenantAware, AuditLogger, Outbox, adapter plugável com `field_mappings`, fluxo de criação de usuário) em vez de inventar mecanismos novos.
- Deixar explícito, desde a v1, onde este módulo ainda não substitui nada — para não criar a falsa impressão de que `capd_servidores`/`concession_holders` já migraram.

**Non-Goals:**
- Migrar ou substituir `capd_servidores` ou `concession_holders` nesta versão.
- Fazer qualquer módulo consumidor (Cemitérios, CAPD) depender deste módulo nesta versão — isso é objeto de uma mudança futura, por consumidor.
- Deduplicação por similaridade (fuzzy matching), sincronização bidirecional automática ou cadastro único nacional (fora de escopo declarado na proposta).

## Decisions

### D1 — Módulo novo e independente (`Modules/Pessoas`)
Segue o contrato de módulo do SYSGOV (`apps/api/Modules/Pessoas`, scaffold via `php artisan make:module Pessoas`), com `module.json.requires = []`. É um módulo-base: outros módulos declararão `requires: ["Pessoas"]` quando (e se) passarem a consumi-lo, em mudanças futuras e separadas. Alternativa considerada — colocar o cadastro em `app/Models` (núcleo, fora de módulo) como `User`/`Tenant`: rejeitada porque o cadastro de pessoas tem volume, regras e evolução de módulo de negócio (telas próprias, RBAC próprio, integrações próprias), não de infraestrutura de plataforma.

### D2 — Pessoa e Usuário como entidades distintas, ligadas por `pessoas_usuarios`
Tabela de vínculo 1:1 opcional (`pessoa_id`, `user_id`, `promovido_em`, `promovido_por`). A promoção a usuário cria a conta **imediatamente e de forma síncrona** (`User::create()` com `password = null`, papel e tenant vinculados no mesmo passo, cache de permissão limpo), não por convite com token de e-mail — decisão confirmada com o usuário após revisão do design. A senha é definida pelo próprio servidor/munícipe no primeiro acesso, via o fluxo de redefinição de senha já existente na plataforma (o mesmo mecanismo usado quando `InvitationService::accept()` cria um `User` com `password = null`), mas sem o passo intermediário de convite/token/e-mail: a identidade já é conhecida e verificada no cadastro de Pessoas (CPF, nome, contato), diferente do caso que `InvitationService::invite()` resolve (convidar alguém por e-mail que ainda não tem nenhum registro no SYSGOV). Alternativa considerada — reaproveitar `InvitationService::invite()`/`accept()`: rejeitada porque introduziria uma espera assíncrona (a pessoa só ganha login ao aceitar um e-mail) que o requisito de "promoção" não pede — o administrador promove uma pessoa que ele já decidiu que deve ter acesso agora, não uma pessoa que precisa confirmar interesse.

### D3 — Vínculos de papel em tabela própria (`pessoas_vinculos`)
Um `enum tipo_vinculo` (`servidor_carreira`, `estagiario`, `comissionado`, `clt`, `municipe`, `contribuinte`, `aluno`, `paciente`) + `dados` (JSON, específico por tipo) + `inicio`/`fim`. Alternativa considerada — uma tabela por tipo de vínculo (ex.: `pessoas_servidores`, `pessoas_municipes`): rejeitada na v1 por multiplicar migrations/models para dados que, por ora, nenhum módulo consumidor ainda usa (nenhum consumidor migrado nesta versão) — o JSON por vínculo é reavaliado quando o primeiro módulo consumidor real aparecer e precisar de colunas tipadas/indexadas.

### D4 — Documentos, endereços e contatos como tabelas 1:N dedicadas
`pessoas_documentos`, `pessoas_enderecos`, `pessoas_contatos` — não como JSON dentro de `pessoas` — porque precisam ser buscáveis/filtráveis individualmente (ex.: localizar pessoa por número de RG) e ter histórico simples (endereço anterior não é sobrescrito, é substituído por um novo registro). Segue o mesmo padrão já usado em `Concessionario` (dados sensíveis com `'encrypted'` no cast: CPF, RG, NIS, nome da mãe) e em `Guia` (documento mascarado via `Modules\Cemiterios\Support\Documento`, cujo utilitário de validação/hash/máscara de CPF/CNPJ deve ser generalizado para o núcleo ou replicado no módulo Pessoas — decisão de implementação, não de spec).

### D5 — Importação sempre assíncrona, adapter plugável por sistema
Mesma receita já usada em `RhIntegracao`/`RhIntegrationService` (config por tenant: `driver`, `field_mappings`, credenciais) e no padrão geral de Outbox do projeto: nenhuma chamada síncrona a sistema externo dentro do ciclo de uma requisição do painel. A tela de importação dispara o job/consulta; o resultado (criado/atualizado/erro) é assíncrono e consultável, nunca bloqueia a UI. Alternativa considerada — importação síncrona simples (a tela chama a API externa e espera): rejeitada, pois viola a regra do projeto de nunca acoplar disponibilidade do painel à de um sistema de terceiro, e contradiz o requisito explícito da proposta de que "uma integração frágil nunca pode derrubar o sistema".

### D6 — RBAC com permissões separadas para ações sensíveis
`cadastros.pessoas.view/create/update/delete` (CRUD comum) e `cadastros.pessoas.promote`/`cadastros.pessoas.import` como permissões **distintas**, porque promoção (cria conta de acesso) e importação (aceita dados de fonte externa) têm um perfil de risco diferente de um CRUD comum e devem poder ser concedidas separadamente (ex.: um Gestor de Cadastros edita pessoas mas não promove ninguém a usuário).

### D7 — Escopo v1 é aditivo; convergência com `capd_servidores`/`concession_holders` fica para depois
Migrar dados e reapontar `Servidor`/`Concessionario` para referenciar `pessoas` tocaria hierarquia organizacional, avaliações (CAPD) e portal do concessionário (Cemitérios) — escopo grande o suficiente para merecer sua própria proposta, com plano de migração de dados e período de convivência. Nesta v1, o módulo Pessoas nasce funcional e utilizável isoladamente (cadastro de munícipes/servidores novos, promoção, importação), sem que nenhum módulo existente dependa dele ainda.

### D8 — Deduplicação apenas por CPF exato na v1
Sem matching por similaridade. O adapter de importação valida o dígito verificador do CPF recebido antes de tentar localizar/criar a pessoa; CPF inválido vai para o relatório de erros da importação, nunca cria um registro com CPF malformado.

## Risks / Trade-offs

- [Risco] Convivência de três cadastros de pessoa (`User`, `capd_servidores`, `pessoas`) sem nenhuma referência cruzada nesta v1 pode dar a falsa impressão de que já existe um cadastro único → [Mitigação] Este documento e a proposta deixam explícito que a convergência é uma mudança futura; nenhuma tela ou documentação desta v1 deve descrever o módulo Pessoas como "a" fonte de verdade de servidores/munícipes ainda.
- [Risco] Deduplicação só por CPF exato não recupera erro de digitação do CPF na fonte externa (ex.: um dígito trocado) → [Mitigação] validação de dígito verificador antes de importar; falha registrada, não silenciosa; matching por similaridade é explicitamente adiado (fora de escopo v1).
- [Risco] Integração externa mal configurada (`field_mappings` errado) pode importar pessoas com dados incorretos → [Mitigação] mesmo padrão do CAPD: log de sincronização (`tipo`, `direção`, `status`, contadores de sucesso/erro) para auditoria e correção, e nenhuma promoção automática a usuário a partir de dado importado.
- [Trade-off] Vínculos em JSON (`pessoas_vinculos.dados`) em vez de tabelas tipadas por papel: ganha-se velocidade de entrega e evita modelar tipos de vínculo que nenhum consumidor real usa ainda; perde-se capacidade de indexar/validar campos específicos de um vínculo até que isso seja necessário.

## Migration Plan

1. `php artisan make:module Pessoas` — scaffold padrão (Config/, Database/Migrations/, Http/, Models/, Policies/, Providers/, Routes/api.php, Services/, Tests/, module.json).
2. Migrations aditivas apenas dentro do novo módulo: `pessoas`, `pessoas_vinculos`, `pessoas_documentos`, `pessoas_enderecos`, `pessoas_contatos`, `pessoas_usuarios`, mais a tabela de configuração de integração de importação (`pessoas_integracoes`, no molde de `capd_rh_integracoes`) e seu log de sincronização (`pessoas_sync_logs`, no molde de `capd_rh_sync_logs`). Nenhuma migration altera tabela de outro módulo.
3. RBAC: novas permissões em `module.json` do módulo Pessoas; nenhum papel existente é alterado automaticamente — cada tenant decide quem recebe as novas permissões.
4. Frontend: novo módulo em `apps/web-client/src/modules/pessoas` e contrato em `packages/sdk/src/modules/pessoas`; registro no catálogo via `php artisan module:register Pessoas` e `npm run generate:registry`, sem alteração manual do App Shell.
5. Rollback: como nenhum outro módulo depende de Pessoas nesta versão, desativar o módulo para um tenant (`tenant_module.enabled = false`) ou revertê-lo por completo não tem efeito colateral em outros módulos.
6. Nenhuma migração de dados de `capd_servidores` ou `concession_holders` ocorre nesta versão.

## Open Questions

- Incluir já na v1 o campo de CNS (Cartão Nacional de Saúde), além do NIS já previsto em `pessoas`? É uma coluna nullable aditiva — pode ser decidido a qualquer momento sem mudar specs, abordagem ou tasks já definidas aqui.
- Quais sistemas de gestão de prefeitura serão os primeiros integrados (para desenhar os `field_mappings` reais do adapter de importação)? Nenhum foi informado nesta proposta; o adapter genérico funciona com qualquer um, mas o mapeamento de campos concreto depende de saber qual.
