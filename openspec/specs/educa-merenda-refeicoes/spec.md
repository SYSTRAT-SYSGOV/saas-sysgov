# educa-merenda-refeicoes Specification

## Purpose

Apuração diária de refeições servidas nas escolas, monitoramento de adesão e desperdício (sobras limpas e restos) e relatórios oficiais para prestação de contas do PNAE ao Conselho de Alimentação Escolar (CAE).

## Requirements

### Requirement: Registro Diário de Refeições por Escola e Turno
O sistema DEVE (SHALL) registrar diariamente a quantidade de refeições preparadas e efetivamente consumidas pelos alunos em cada unidade escolar e turno (desjejum, almoço, lanches).

#### Scenario: Lançamento de consumo diário pela direção escolar
- **WHEN** a direção ou responsável pela cozinha escolar encerra o turno e informa o número de alunos alimentados e porções servidas
- **THEN** o sistema grava o registro diário associado ao cardápio vigente da data com cálculo automático de adesão percentual

#### Scenario: Rastreamento de sobras limpas e restos alimentares
- **WHEN** o operador registra o peso em quilogramas ou número de porções de sobras limpas (não servidas) e restos (rejeito nos pratos)
- **THEN** o sistema calcula o índice de sobra/resto alimentar gerando indicador de aceitabilidade do cardápio

### Requirement: Relatórios e Prestação de Contas para o CAE e FNDE
O sistema DEVE (SHALL) consolidar os dados mensais de cardápios executados, alunos atendidos e laudos de restrição alimentar em relatórios auditáveis para o Conselho de Alimentação Escolar (CAE).

#### Scenario: Emissão de demonstrativo mensal de refeições do PNAE
- **WHEN** a coordenação de nutrição gera o demonstrativo mensal de execução da merenda escolar
- **THEN** o sistema consolida o total de refeições servidas por escola, faixa etária e tipo de recurso (PNAE vs contrapartida municipal) com assinatura digital dos responsáveis técnicos
