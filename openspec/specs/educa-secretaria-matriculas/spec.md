# Spec: Matrículas Escolares (SYS-Educa Secretaria)

## Purpose
Gerencia o vínculo acadêmico dos estudantes com as escolas municipais, controlando número de matrícula atômico, ano letivo, situação cadastral e histórico de transferências.

## Requirements

### Requirement: Registro de matrícula acadêmica
O sistema SHALL registrar a matrícula do estudante vinculando-o à escola, curso, série e ano letivo, gerando um código sequencial único e atômico por tenant e ano. Estudante com matrícula ativa na mesma série e ano letivo SHALL ser recusado com erro 409 (`code=ENROLLMENT_ALREADY_ACTIVE`).

#### Scenario: Matrícula inicial com sucesso
- **WHEN** o gestor cadastra uma matrícula para um estudante com ano letivo ativo e série válida
- **THEN** a matrícula é criada com status "ativa" e código sequencial gerado

#### Scenario: Tentativa de matrícula duplicada no mesmo ano e série
- **WHEN** o gestor tenta matricular um estudante que já possui matrícula ativa na mesma série e ano
- **THEN** a operação é recusada com código 409

### Requirement: Ciclo de vida e situações da matrícula
O sistema SHALL gerenciar as situações da matrícula entre `ativa`, `remanejada`, `transferida`, `cancelada`, `concluida`, `abandonada` e `falecida`. A transição para cancelada ou transferida SHALL desativar imediatamente as enturmações ativas associadas.

#### Scenario: Cancelamento de matrícula
- **WHEN** o gestor cancela a matrícula informando data e justificativa
- **THEN** a matrícula passa para "cancelada" e suas enturmações ativas são encerradas com a mesma data

### Requirement: Transferência e remanejamento escolar
O sistema SHALL permitir registrar transferência interna (remanejamento entre turmas/escolas da rede) ou externa (saída da rede), registrando o destino, a data e emitindo a certidão de transferência e a ficha individual.

#### Scenario: Solicitação de transferência externa
- **WHEN** o responsável solicita transferência do aluno para outro município
- **THEN** a matrícula é marcada como "transferida" e a vaga na turma de origem é liberada
