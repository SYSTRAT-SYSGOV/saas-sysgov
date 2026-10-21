# Spec Delta

## ADDED Requirements

### Requirement: Participante de curso vinculado ao cadastro central de pessoas
O sistema SHALL vincular todo participante de curso a uma pessoa do cadastro central e SHALL ler nome e contatos da pessoa, atualizando o participante quando a pessoa for alterada.

#### Scenario: Participante com e-mail alterado no cadastro central
- **WHEN** o e-mail da pessoa é alterado no cadastro central
- **THEN** os participantes de curso vinculados a ela passam a usar o novo e-mail nas próximas comunicações, sem alterar certificados já emitidos
