# Spec: passeio

> Criada a partir da mudança `modulos-educacao-backend` (Fase 1 — backend dos módulos de educação), arquivada em 2026-09-27.
> Atualizada pela mudança `modulos-educacao-frontend` (Fase 2 — telas na API), arquivada em 2026-10-02.
> Fonte: apps/api/Modules/Passeio, docs/modules/passeio.md

## Purpose

Organiza os passeios pedagógicos dos alunos do cadastro escolar — agenda do passeio, inscrição com autorização
dos responsáveis e pagamento, frota de veículos e mapa de assentos.

## Requirements

### Requirement: Dependência do cadastro escolar e isolamento
O módulo SHALL depender do módulo Escola, usar os alunos e turmas do cadastro escolar do mesmo tenant e tratar
registros de outro tenant como inexistentes.

#### Scenario: Inscrição de aluno de outro tenant
- **WHEN** a requisição inscreve em um passeio um aluno de outro tenant
- **THEN** o sistema rejeita com erro de validação

### Requirement: Permissões e perfis do módulo Passeio
O módulo SHALL declarar `passeio.view`, `passeio.passeios.manage` e `passeio.frota.manage`, e provisionar os
perfis **Coordenação de Passeios** (todas) e **Apoio** (`view`). Os dois perfis SHALL incluir também `escola.view`
(leitura do cadastro escolar).

#### Scenario: Apoio não altera passeio
- **WHEN** um usuário com o perfil Apoio tenta alterar a data de um passeio
- **THEN** o sistema responde 403

### Requirement: Cadastro de passeios
O sistema SHALL manter passeios com nome, data, data limite para entrega das autorizações (não posterior à data
do passeio), horários de saída e retorno, local de saída, destino, cidade, valor por aluno em centavos,
responsável, observações e situação (`agendado`, `em_andamento`, `concluido`, `cancelado`). Um passeio
`concluido` ou `cancelado` SHALL NOT aceitar novas inscrições.

#### Scenario: Prazo de autorização depois do passeio
- **WHEN** a data limite das autorizações é posterior à data do passeio
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Inscrição em passeio cancelado
- **WHEN** o usuário inscreve um aluno em um passeio cancelado
- **THEN** o sistema rejeita informando a situação do passeio

### Requirement: Inscrições e autorizações
O sistema SHALL registrar a inscrição de um aluno por passeio (no máximo uma), com os indicadores "vai no
passeio", "autorização entregue" e "pago" e observação, e SHALL permitir inscrever todos os alunos de uma turma
de uma vez sem duplicar inscrições existentes.

#### Scenario: Inscrever turma inteira
- **WHEN** a turma tem 30 alunos, 5 já inscritos, e o usuário inscreve a turma
- **THEN** são criadas 25 inscrições e as 5 existentes permanecem inalteradas

### Requirement: Indicadores do passeio
O sistema SHALL informar, por passeio e no geral: alunos inscritos, autorizações entregues (quantidade e
percentual), total arrecadado e pendente em centavos, quantidade de veículos, capacidade total e assentos
ocupados.

#### Scenario: Arrecadação pendente
- **WHEN** o valor é 5000 centavos e 10 alunos vão ao passeio, 6 pagos
- **THEN** o arrecadado é 30000 e o pendente é 20000 centavos

### Requirement: Veículos
O sistema SHALL manter os veículos de um passeio com identificação, placa, motorista, telefone, capacidade de
lugares (1 a 100) e cor de identificação. Reduzir a capacidade abaixo do número de assentos ocupados SHALL ser
rejeitado.

#### Scenario: Capacidade menor que a ocupação
- **WHEN** o veículo tem 40 assentos ocupados e o usuário altera a capacidade para 30
- **THEN** o sistema rejeita informando a ocupação atual

### Requirement: Mapa de assentos
O sistema SHALL permitir atribuir um aluno inscrito no passeio (com "vai no passeio" marcado) a um assento de um
veículo do mesmo passeio, com número entre 1 e a capacidade. Cada assento SHALL ter no máximo um aluno e cada
aluno SHALL ocupar no máximo um assento por passeio. SHALL permitir liberar um assento.

#### Scenario: Assento ocupado
- **WHEN** o usuário atribui um aluno ao assento 12, já ocupado por outro aluno
- **THEN** o sistema rejeita informando que o assento está ocupado

#### Scenario: Aluno em dois veículos
- **WHEN** o aluno já tem assento no ônibus 1 e é atribuído a um assento do ônibus 2 do mesmo passeio
- **THEN** o sistema rejeita informando que o aluno já tem assento

### Requirement: Auditoria do módulo Passeio
Toda criação, alteração e exclusão no módulo SHALL gerar registro de auditoria e evento de domínio na outbox na
mesma transação, e exclusões de passeios, veículos e inscrições SHALL ser lógicas.

#### Scenario: Passeio cancelado auditado
- **WHEN** a situação de um passeio muda para `cancelado`
- **THEN** existe registro de auditoria com as duas situações e um evento `passeio.passeio.atualizado` na outbox

### Requirement: Telas do Passeio persistem no servidor
As telas do módulo Passeio SHALL ler e gravar exclusivamente pela API (passeios, inscrições e autorizações,
veículos, mapa de assentos e indicadores), sem consultar servidores externos nem guardar dados de negócio no
navegador, e SHALL usar os componentes de `@sysgov/ui`. As telas de turmas e alunos SHALL ser somente consulta ao
cadastro escolar, com atalho para o Cadastro Escolar. Os botões de escrita SHALL ficar ocultos para quem só tem
`passeio.view`. O termo de autorização, o manifesto de embarque e o demonstrativo de arrecadação SHALL ser impressos
com os dados do servidor, sem dados fictícios.

#### Scenario: Sem servidor externo
- **WHEN** o usuário abre qualquer tela do Passeio
- **THEN** nenhuma requisição é feita a domínios fora da própria API do SYSGOV

#### Scenario: Assento marcado aparece para outro usuário
- **WHEN** a Coordenação coloca um aluno no assento 12 do ônibus 1 e o Apoio abre o mapa em outro computador
- **THEN** o Apoio vê o aluno no assento 12

#### Scenario: Apoio não vê os botões de escrita
- **WHEN** um usuário com o perfil Apoio abre a aba Inscrições e Termos
- **THEN** a lista aparece sem os controles de alterar vai, termo e pagamento

### Requirement: Inscrição respeita a situação do aluno
A inscrição em passeio SHALL recusar aluno transferido e a inscrição da turma inteira SHALL ignorá-lo. Aluno
remanejado SHALL ser inscrito pela turma de destino. A lista de inscrições SHALL trazer a situação e o telefone
principal do aluno, lidos do cadastro escolar.

#### Scenario: Aluno transferido
- **WHEN** a Coordenação tenta inscrever um aluno transferido
- **THEN** o sistema responde 422 informando que aluno transferido não participa do passeio

#### Scenario: Turma com transferido
- **WHEN** a Coordenação inscreve uma turma com 20 alunos, 1 deles transferido
- **THEN** 19 alunos são inscritos e o transferido fica de fora

### Requirement: Inscrição em lote por turma
O módulo SHALL permitir marcar ou desmarcar "vai" para a turma inteira num passeio, numa só operação auditada:
marcar inscreve os alunos da turma que faltam (sem transferidos) e marca os demais; desmarcar tira o "vai" de todos
da turma e libera os assentos deles.

#### Scenario: Desmarcar a turma libera os assentos
- **WHEN** a Coordenação desmarca a turma 5º Ano A de um passeio em que dois alunos dela tinham assento
- **THEN** todos da turma ficam com "vai" desmarcado, os dois assentos ficam livres e as outras turmas não mudam

#### Scenario: Apoio não altera em lote
- **WHEN** um usuário com o perfil Apoio tenta marcar uma turma inteira
- **THEN** o sistema responde 403
