# educa-merenda-restricoes Specification

## Purpose

Registro médico e pedagógico de alergias e patologias alimentares dos estudantes, emissão de alertas na rotina da escola e definição de preparações adaptadas.

## Requirements

### Requirement: Registro de Laudo de Restrição Alimentar
O sistema DEVE (SHALL) registrar patologias, intolerâncias e alergias alimentares dos alunos (glúten/celíacos, lactose, diabetes mellitus, fenilcetonúria, ovo, oleaginosas, etc.) vinculadas ao cadastro único municipal de pessoas (`pessoa_id`).

#### Scenario: Inserção de laudo médico comprobatório
- **WHEN** o responsável ou a secretaria escolar cadastra uma restrição para o estudante com upload do laudo médico e data de validade
- **THEN** o sistema ativa o status de restrição alimentar com auditoria estrita em conformidade com a LGPD para dados sensíveis de saúde

#### Scenario: Alerta crítico em tempo real na ficha do aluno e lista de chamada
- **WHEN** qualquer profissional acessa a lista de alunos da turma, diário de classe ou relatório da cantina
- **THEN** o sistema exibe um badge visual de alerta na cor vermelha com o ícone de atenção indicando o tipo de restrição alimentar do estudante

### Requirement: Substituição e Adaptação de Preparações do Cardápio
O sistema DEVE (SHALL) permitir associar a cada aluno com restrição comprovada uma preparação substituta segura para cada dia do cardápio padrão.

#### Scenario: Consulta de preparações adaptadas pela merendeira da escola
- **WHEN** a equipe de merenda escolar consulta o relatório diário de alunos especiais da unidade
- **THEN** o sistema gera a lista nominal de estudantes com restrição alimentar e a preparação adaptada prescrita pelo nutricionista

#### Scenario: Bloqueio de ingrediente incompatível na distribuição
- **WHEN** é registrada a entrega de alimento contendo ingrediente proibido para o aluno com restrição
- **THEN** o sistema exibe impedimento visual e exige validação da supervisão escolar
