# Spec Delta

## Purpose

Define o vínculo polimórfico genérico que conecta processos do Protocolo a entidades de qualquer módulo do SYSGOV, sem acoplamento, e a promoção de requerimentos a processos administrativos.

## ADDED Requirements

### Requirement: Vínculo polimórfico genérico com entidades
O sistema SHALL permitir criar, listar e remover vínculos entre um processo e uma entidade de qualquer módulo, identificada por `entidade_tipo` (identificador textual em minúsculas) e `entidade_id`, com `papel_vinculo` opcional (`origem`, `referencia`, `interessado`), sem que o Protocolo dependa do módulo consumidor.

#### Scenario: Vínculo genérico com módulo
- **WHEN** um usuário com `protocolo.processos.vincular` vincula o processo `0042/2026` à entidade `licitacao` de id 17
- **THEN** o vínculo é persistido com `entidade_tipo='licitacao'` e `entidade_id=17`, e nenhuma alteração de código ou migration no Protocolo é necessária

#### Scenario: Módulo sem protocolo
- **WHEN** um módulo não utiliza o Protocolo
- **THEN** nenhum vínculo é criado e o módulo funciona normalmente, sem impacto

#### Scenario: Vínculo duplicado
- **WHEN** um vínculo com o mesmo processo, `entidade_tipo`, `entidade_id` e papel já existe
- **THEN** o sistema rejeita a criação com erro de conflito (HTTP 409)

#### Scenario: Remoção de vínculo
- **WHEN** um usuário com `protocolo.processos.vincular` remove um vínculo com papel diferente de `origem`
- **THEN** o vínculo é removido e a ação é auditada

#### Scenario: Vínculo de origem protegido
- **WHEN** um usuário tenta remover um vínculo com `papel_vinculo='origem'`
- **THEN** o sistema rejeita a operação com erro de conflito (HTTP 409)

### Requirement: Consulta reversa de processos por entidade
O sistema SHALL permitir consultar, por `entidade_tipo` e `entidade_id`, os processos do tenant vinculados a uma entidade, respeitando a visibilidade do usuário.

#### Scenario: Processos de uma entidade
- **WHEN** um módulo consulta os processos vinculados a `entidade_tipo='cemiterio'` e `entidade_id=5`
- **THEN** o sistema retorna os processos vinculados do tenant atual com número, status e órgão atual

#### Scenario: Sem vínculos
- **WHEN** a entidade consultada não possui vínculos
- **THEN** o sistema retorna lista vazia, sem erro

### Requirement: Promoção de requerimento a processo
O sistema SHALL permitir que usuários com `protocolo.processos.promover_requerimento` promovam um requerimento existente do tenant a processo, criando, em uma única transação, o processo com `origem='externa'`, o vínculo `entidade_tipo='requerimento'` com `papel_vinculo='origem'` e a atualização de `vinculacao_processo_id` da proposição de origem, sem copiar o conteúdo do requerimento.

#### Scenario: Promoção de requerimento
- **WHEN** um usuário com permissão promove o requerimento de id 88
- **THEN** um processo é criado com `origem='externa'` e número oficial, um vínculo de origem com `entidade_tipo='requerimento'` e `entidade_id=88` é registrado, a proposição 88 passa a ter `vinculacao_processo_id` igual ao id do processo e o processo não duplica o conteúdo do requerimento

#### Scenario: Requerimento já promovido
- **WHEN** um usuário tenta promover um requerimento cuja proposição já possui `vinculacao_processo_id` ou vínculo de origem
- **THEN** o sistema rejeita a operação com erro de conflito (HTTP 409) e nada é criado

#### Scenario: Requerimento inexistente ou de outro tenant
- **WHEN** o requerimento informado não existe no tenant atual
- **THEN** o sistema responde como recurso inexistente (HTTP 404) e nada é criado

#### Scenario: Falha na atualização bidirecional
- **WHEN** a atualização da proposição de origem falha durante a promoção
- **THEN** o processo, o vínculo e o andamento inicial não são persistidos

#### Scenario: Módulo Requerimentos indisponível
- **WHEN** o módulo Requerimentos não está habilitado para o tenant
- **THEN** a promoção é rejeitada com erro de validação informando que o tipo de entidade `requerimento` não está disponível
