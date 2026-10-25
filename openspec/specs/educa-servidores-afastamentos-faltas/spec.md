# educa-servidores-afastamentos-faltas Specification

## Purpose
Gerencia o registro de afastamentos temporários, licenças funcionais e ocorrências diárias de assiduidade de servidores escolares, garantindo a suspensão de alocações ativas durante licenças e o cômputo de faltas para a folha e censo escolar.

## Requirements

### Requirement: Registro de afastamento e suspensão de alocações
O sistema SHALL registrar afastamentos e licenças temporárias de servidores (médica, maternidade, prêmio), suspendendo temporariamente a vigência de suas alocações escolares ativas durante o intervalo de afastamento.

#### Scenario: Lançamento de licença médica com suspensão
- **WHEN** o gestor cadastra uma licença médica para o docente no período de 01/05/2026 a 30/05/2026
- **THEN** o afastamento é registrado e as alocações ativas do docente nesse período ficam com status suspenso

### Requirement: Registro de faltas e atrasos funcionais
O sistema SHALL permitir o lançamento diário de faltas e atrasos de servidores por unidade escolar, com discriminação de horas/minutos e identificação de falta justificada por amparo legal.

#### Scenario: Registro de falta justificada por atestado
- **WHEN** a direção da escola lança falta do servidor na data com motivo "Atestado de comparecimento judicial" e marcação de justificada
- **THEN** a ocorrência de assiduidade é salva com status justificado e vinculada ao prontuário funcional
