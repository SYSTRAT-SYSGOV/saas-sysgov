# Spec Delta: Integração com Diário de Classe e Substituições

## Purpose

Integração entre o quadro de horários e o diário de classe, permitindo sugestão automática da aula do dia e rastreabilidade de docentes substitutos.

## ADDED Requirements

### Requirement: Sugestão Automática de Aula no Diário de Classe
O sistema DEVE (SHALL) carregar a previsão de aulas da turma no diário com base no dia da semana e no quadro de horários oficial ativo.

#### Scenario: Carregamento dos componentes do dia no diário
- **WHEN** o docente abre o diário de classe para a data de uma Quarta-feira
- **THEN** o sistema lista as aulas daquele dia com seus respectivos componentes curriculares e horários já pré-selecionados

#### Scenario: Registro de aula em conformidade com o horário
- **WHEN** o professor confirma o registro de aula vinculado ao slot da grade
- **THEN** o diário grava o conteúdo ministrado e lista de presença associando o identificador do slot do quadro de horários

### Requirement: Gestão de Docente Substituto com Vigência
O sistema DEVE (SHALL) permitir atribuir um docente substituto a aulas específicas ou intervalos de datas em virtude de afastamento ou licença do titular.

#### Scenario: Atribuição de professor substituto com período de vigência
- **WHEN** a direção escolar cadastra uma substituição para a Professora Maria durante sua licença médica de 15 dias
- **THEN** o sistema atualiza as aulas daquele período apontando o professor substituto e mantendo o registro do titular original

#### Scenario: Lançamento de notas e diário pelo professor substituto
- **WHEN** o docente substituto acessa o diário durante a vigência da substituição
- **THEN** o sistema autoriza o lançamento de conteúdos e chamada diária com auditoria do usuário que executou o ato
