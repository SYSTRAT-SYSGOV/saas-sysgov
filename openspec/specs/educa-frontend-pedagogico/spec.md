# educa-frontend-pedagogico Specification

## Purpose
TBD - created by archiving change criar-modulo-educa-frontend. Update Purpose after archive.

## Requirements

### Requirement: Diário de Classe e Registro de Aulas
O docente DEVE (MUST) ter acesso a um painel simples e intuitivo para selecionar sua turma, disciplina e registrar o conteúdo ministrado em dias letivos autorizados no calendário escolar.

#### Scenario: Lançamento de conteúdo curricular em dia letivo
- **GIVEN** que o professor seleciona a turma e a data atual
- **WHEN** a data é validada como dia letivo no calendário
- **THEN** o editor de registro de aula é liberado para preenchimento dos objetivos de aprendizagem e conteúdo da aula

### Requirement: Lista de Chamada e Frequência Escolar
A interface DEVE (MUST) fornecer uma lista de chamada rápida, com marcação em lote de presença e controle pontual de faltas justificadas com respaldo legal.

#### Scenario: Realização da chamada diária da turma
- **GIVEN** a lista de estudantes enturmados na ordem do número de chamada
- **WHEN** o docente clica em "Marcar Todos como Presentes"
- **THEN** todos os alunos recebem o status "Presente"
- **AND** o docente pode alternar individualmente os alunos ausentes para "Falta", atualizando o percentual instantaneamente em `JetBrains Mono`
