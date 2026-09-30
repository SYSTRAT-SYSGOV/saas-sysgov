# Proposal

## Why

Hoje o SYSGOV não tem um cadastro único de pessoa física. Cada módulo mantém o seu próprio: o Cemitérios guarda CPF/nome/contato do concessionário em `concession_holders`, o CAPD guarda um cadastro rico de servidor em `capd_servidores`, e qualquer novo módulo que precise identificar um cidadão (Tributos, Protocolo) tende a recriar o mesmo problema. Isso já bloqueou a evolução do financeiro do Cemitérios (proposta anterior, abortada) por falta de uma base comum de pessoa física compatível com o cadastro único das prefeituras. Sem essa base, cada integração externa (RH, cadastro único municipal) precisa ser reinventada por módulo, e a mesma pessoa pode existir várias vezes no sistema com dados divergentes.

## What Changes

- Cria o módulo `Pessoas`, com um cadastro único de pessoa física por tenant (identidade civil: CPF, nome, filiação, nascimento, documentos, endereços, contatos).
- Separa PESSOA (identidade civil) de USUÁRIO (conta de acesso ao SYSGOV): uma pessoa pode existir sem nunca ter uma conta; toda conta de acesso corresponde a exatamente uma pessoa.
- Modela os papéis da pessoa (servidor de carreira, estagiário, comissionado, CLT, munícipe, contribuinte, aluno, paciente) em tabela de vínculos própria, muitos-para-um com a pessoa — a mesma pessoa acumula vínculos sem duplicar cadastro.
- Adiciona o fluxo explícito de **promoção a usuário**: uma ação de administrador, auditada, que cria a conta de acesso imediatamente (senha `null`, redefinida no primeiro acesso) vinculada à pessoa existente por CPF. Nunca ocorre automaticamente.
- Adiciona o fluxo de **importação de pessoa**: busca por CPF no tenant; atualiza/vincula se existir, cria se não existir. Nunca promove a usuário como efeito colateral.
- Adiciona integração assíncrona (Outbox, adapter plugável por sistema, com timeout e fallback) para importar pessoas de sistemas de gestão da prefeitura, seguindo o mesmo padrão já usado em `Modules\Capd\Services\RhIntegrationService`.
- Adiciona RBAC: `cadastros.pessoas.view/create/update/delete/promote/import`.
- **Não** migra nem substitui `capd_servidores` nem `concession_holders` nesta versão — módulo aditivo; consumo por outros módulos fica para mudanças futuras (ver Questões Abertas em `design.md`).

## Capabilities

### New Capabilities
- `pessoas`: cadastro único de pessoa física por tenant (dados civis, documentos, endereços, contatos, vínculos de papel, promoção a usuário, importação externa com deduplicação por CPF).

### Modified Capabilities

(nenhuma — mudança aditiva; nenhum requisito de capacidade existente muda nesta versão)

## Impact

- **Novo módulo backend**: `apps/api/Modules/Pessoas` (scaffold via `php artisan make:module Pessoas`), com `requires: []` (módulo-base, não depende de outro módulo de negócio) — outros módulos futuros declararão `requires: ["Pessoas"]` para consumi-lo.
- **Novo módulo frontend**: `apps/web-client/src/modules/pessoas` (listagem, formulário de cadastro/edição, gestão de vínculos, ação de promoção a usuário, ação de importação).
- **Contrato compartilhado**: `packages/sdk/src/modules/pessoas` (tipos e client TS), consumido por futuros módulos integradores.
- **Sem mudança de schema em módulos existentes** nesta versão: `capd_servidores` e `concession_holders` permanecem como estão; a convergência (se decidida) é uma mudança futura e separada.
- **Dependência de infraestrutura existente reaproveitada, sem alterá-la**: `App\Support\TenantAware`, `App\Support\AuditLogger`, `App\Support\OutboxPublisher`, `App\Models\User`/`Role`/`Permission` (criação e vínculo de conta na promoção a usuário).
