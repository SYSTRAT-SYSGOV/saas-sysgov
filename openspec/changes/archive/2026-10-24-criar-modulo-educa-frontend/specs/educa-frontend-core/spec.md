# Spec: Frontend de Gestão Acadêmica (Core)

## ADDED Requirements

### Requirement: Calendário Escolar e Conformidade com a LDB
A interface DEVE (MUST) fornecer um painel visual do calendário letivo municipal com apuração automática do total de dias letivos e horas anuais, destacando a conformidade legal com a Lei de Diretrizes e Bases (LDB - Lei 9.394/1996, mínimo 200 dias e 800 horas).

#### Scenario: Visualização do calendário letivo com diagnóstico LDB
- **GIVEN** que o ano letivo ativo possui calendário homologado na rede
- **WHEN** o gestor acessa a aba "Calendário Escolar"
- **THEN** a grade mensal exibe os dias letivos, feriados, recessos e sábados letivos com legendas coloridas padronizadas
- **AND** os contadores de "Dias Letivos Apurados" e "Carga Horária Total" são exibidos em `KpiCard` com valores formatados em `JetBrains Mono`
- **AND** se o total de dias letivos for inferior a 200 ou horas inferior a 800, um badge âmbar/vermelho de não-conformidade é exibido com o detalhamento das pendências

### Requirement: Gestão de Turmas e Matrizes Curriculares
O sistema DEVE (MUST) permitir a consulta e parametrização de escolas, turmas e matrizes curriculares alinhadas à BNCC.

#### Scenario: Consulta de turmas da escola ativa
- **GIVEN** uma escola municipal selecionada no seletor de contexto
- **WHEN** o operador abre a visualização de "Turmas"
- **THEN** a lista exibe o código da turma, nome, turno, capacidade máxima e ocupação atual em formato tabular com números em `JetBrains Mono`
