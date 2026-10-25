# educa-frontend-secretaria Specification

## Purpose
TBD - created by archiving change criar-modulo-educa-frontend. Update Purpose after archive.

## Requirements

### Requirement: Fluxo de Matrícula Integrado ao MDM Pessoas
O formulário de matrícula escolar DEVE (MUST) obrigatoriamente utilizar o componente `<PessoaPicker>` do `@sysgov/ui` para vincular o estudante e seus responsáveis legais a registros canônicos de `Modules/Pessoas`, proibindo digitação avulsa duplicada de dados cadastrais.

#### Scenario: Seleção de aluno existente via CPF ou nome
- **GIVEN** que o operador da secretaria escolar inicia uma nova matrícula
- **WHEN** digita o nome ou CPF da criança no campo do estudante
- **THEN** o componente `<PessoaPicker>` busca em tempo real na tabela canônica `pessoas`
- **AND** preenche os dados cadastrais protegidos pela LGPD com tipografia `JetBrains Mono`

### Requirement: Painel Visual de Enturmação e Lotação de Vagas
O painel de enturmação DEVE (MUST) exibir a ocupação das turmas em tempo real, alertando visualmente quando a capacidade máxima for atingida e bloqueando novas enturmações quando a turma não possuir vagas.

#### Scenario: Visualização de vagas disponíveis na turma
- **GIVEN** uma turma do 5º Ano do Ensino Fundamental com 30 vagas e 29 alunos enturmados
- **WHEN** a tela de enturmação é carregada
- **THEN** o sistema exibe a ocupação como `29 / 30` em `JetBrains Mono` com badge azul indicando "1 vaga restante"
