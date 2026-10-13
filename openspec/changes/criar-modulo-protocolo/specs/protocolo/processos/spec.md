# Spec Delta

## Purpose

Define a abertura e o ciclo de vida do processo administrativo municipal no Protocolo — numeração oficial, origem externa ou interna, criação atômica, hierarquia, busca, exclusão controlada, autorização e auditoria.

## ADDED Requirements

### Requirement: Numeração automática sequencial por tenant e ano
O sistema SHALL gerar automaticamente o número do processo no formato `NNNN/AAAA` (sequencial com quatro dígitos e zeros à esquerda, seguido do ano de abertura), sequencial por tenant e ano, em transação com lock, sem permitir duplicidade nem aceitar número informado pelo cliente.

#### Scenario: Numeração sequencial
- **WHEN** um processo é criado em um tenant no ano 2026 cujo último número emitido foi `0041/2026`
- **THEN** o processo recebe automaticamente o número `0042/2026`

#### Scenario: Concorrência não gera duplicidade
- **WHEN** duas requisições criam processos simultaneamente no mesmo tenant e ano
- **THEN** cada processo recebe um número distinto e consecutivo, sem lacunas causadas pela disputa

#### Scenario: Sequência isolada por tenant
- **WHEN** o tenant A e o tenant B criam seu primeiro processo de 2026
- **THEN** ambos recebem `0001/2026`, cada um na sua própria sequência

#### Scenario: Reinício anual
- **WHEN** o primeiro processo de 2027 é criado em um tenant que encerrou 2026 em `0350/2026`
- **THEN** o processo recebe `0001/2027`

#### Scenario: Número enviado pelo cliente é ignorado
- **WHEN** a requisição de criação contém um campo `numero`
- **THEN** o sistema descarta o valor informado e atribui o número gerado internamente

### Requirement: Origem externa ou interna em protocolo único
O sistema SHALL registrar a origem de cada processo como `externa` ou `interna`, usando a mesma numeração, a mesma trilha de tramitação e o mesmo histórico para ambas as portas de entrada.

#### Scenario: Processo de origem externa
- **WHEN** um processo é aberto a partir de demanda de cidadão, empresa ou outro órgão (incluindo a promoção de um requerimento)
- **THEN** o processo é criado com `origem='externa'` e recebe número da sequência única do tenant

#### Scenario: Processo de origem interna
- **WHEN** um setor da prefeitura abre um processo formal interno (por exemplo, memorando que decide algo)
- **THEN** o processo é criado com `origem='interna'`, recebe número da mesma sequência e tramita pelo mesmo protocolo e histórico

#### Scenario: Origem obrigatória e restrita
- **WHEN** a requisição de criação não informa a origem ou informa valor diferente de `externa` ou `interna`
- **THEN** o sistema rejeita a requisição com erro de validação (HTTP 422)

### Requirement: Processo nasce apenas de ato formal explícito
O sistema SHALL criar processos somente por ação explícita de usuário autorizado (ou de módulo consumidor agindo em nome dele) nos endpoints do Protocolo, sem ingerir automaticamente comunicação informal.

#### Scenario: Comunicação informal não gera processo
- **WHEN** servidores trocam mensagens informais por e-mail institucional, intranet ou mensageria, sem decisão formal
- **THEN** nenhum processo é criado e essa comunicação não passa pelo protocolo

### Requirement: Criação de processo em cascata atômica
O sistema SHALL persistir a criação de um processo com seus documentos, atributos dinâmicos e primeiro andamento em uma única transação, de modo que ou todos os registros sejam criados ou nenhum seja.

#### Scenario: Cascata atômica bem-sucedida
- **WHEN** um processo é criado com dois documentos, três atributos e o andamento inicial
- **THEN** o processo, os documentos, os atributos e o andamento são persistidos juntos, o andamento inicial é o andamento atual e o número é consumido

#### Scenario: Falha parcial desfaz tudo
- **WHEN** a criação falha em qualquer etapa (por exemplo, atributo inválido ou erro ao gravar documento)
- **THEN** nenhum processo, documento, atributo ou andamento é persistido, nenhum arquivo enviado permanece no armazenamento e o número não é consumido

### Requirement: Hierarquia pai-filho entre processos
O sistema SHALL permitir vincular um processo como filho de outro processo do mesmo tenant, registrando `processo_pai_id`, e impedir ciclos na hierarquia.

#### Scenario: Vinculação pai-filho
- **WHEN** um processo é criado ou atualizado como filho de outro processo
- **THEN** o filho registra `processo_pai_id` e ambos são consultáveis na hierarquia (o pai lista seus filhos e o filho exibe seu pai)

#### Scenario: Ciclo rejeitado
- **WHEN** um usuário tenta definir como pai de um processo um de seus próprios descendentes ou ele mesmo
- **THEN** o sistema rejeita a operação com erro de validação

#### Scenario: Pai de outro tenant rejeitado
- **WHEN** a requisição informa `processo_pai_id` pertencente a outro tenant
- **THEN** o sistema responde como recurso inexistente e não cria o vínculo

### Requirement: Busca e acompanhamento de processos
O sistema SHALL permitir buscar processos por número, assunto e interessado, com filtros por status, órgão atual e origem, retornando o status atual derivado do último andamento.

#### Scenario: Acompanhamento por número
- **WHEN** um usuário busca pelo número `0042/2026`
- **THEN** o sistema retorna o processo correspondente com seu status e órgão atuais

#### Scenario: Busca por assunto e interessado
- **WHEN** um usuário busca por um trecho do assunto ou pelo nome/CPF/CNPJ do interessado
- **THEN** o sistema retorna os processos correspondentes visíveis ao usuário, paginados

#### Scenario: Filtros combinados
- **WHEN** um usuário filtra por `status=em_tramitacao`, `origem=interna` e um órgão
- **THEN** somente processos que atendem a todos os filtros são retornados

### Requirement: Exclusão controlada de processos
O sistema SHALL impedir a exclusão física de processos que possuam andamentos, aplicando apenas exclusão lógica (soft delete) a usuários com permissão de exclusão.

#### Scenario: Integridade do processo
- **WHEN** um usuário com `protocolo.processos.delete` solicita a exclusão de um processo com andamentos
- **THEN** o sistema não remove fisicamente o registro, aplica soft delete e o processo deixa de aparecer nas listagens padrão

#### Scenario: Processo com filhos ativos
- **WHEN** um usuário tenta excluir um processo que possui processos filhos não excluídos
- **THEN** o sistema rejeita a exclusão com erro de conflito (HTTP 409)

### Requirement: Isolamento multi-tenant e autorização
O sistema SHALL restringir todo acesso a processos e registros relacionados ao tenant resolvido no backend e às permissões `protocolo.processos.*` do usuário, limitando a visibilidade às unidades organizacionais do escopo do usuário.

#### Scenario: Acesso a processo de outro tenant
- **WHEN** um usuário do tenant A requisita um processo do tenant B pelo identificador
- **THEN** o sistema responde como recurso inexistente (HTTP 404) sem revelar dados

#### Scenario: Ação sem permissão
- **WHEN** um usuário sem `protocolo.processos.create` tenta criar um processo
- **THEN** o sistema responde HTTP 403 e nada é persistido

#### Scenario: Escopo por unidade organizacional
- **WHEN** um usuário com escopo restrito a uma secretaria lista processos
- **THEN** o sistema retorna apenas processos cujo órgão de origem ou órgão atual pertença ao seu escopo

### Requirement: Auditoria de mutações
O sistema SHALL registrar em `audit_logs` toda mutação de processo e de seus registros relacionados, com tenant, usuário executor, módulo `protocolo`, ação, recurso e estados anterior e posterior.

#### Scenario: Auditoria de tramitação
- **WHEN** um processo é criado, atualizado, tramitado, recebido, vinculado, desvinculado, promovido ou excluído
- **THEN** a ação é registrada em `audit_logs` com `module='protocolo'`, a ação correspondente, o recurso afetado e os estados `before`/`after`
